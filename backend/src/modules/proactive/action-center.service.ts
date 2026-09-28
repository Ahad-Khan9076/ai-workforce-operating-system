import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AutomationActorType,
  EnrollmentStatus,
  RecommendationActionStatus,
  RecommendationPriority,
  RecommendationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { NotificationService } from '../notifications/notification.service.js';
import { AutomationEngineService } from './automation/automation-engine.service.js';

@Injectable()
export class ActionCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly automation: AutomationEngineService,
  ) {}

  async getActionCenter(user: AuthenticatedUser) {
    const organizationId = user.organizationId!;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [needsAttention, recommended, recentlyCompleted] = await Promise.all([
      this.prisma.recommendationAction.findMany({
        where: {
          organizationId,
          status: RecommendationActionStatus.PENDING,
          priority: {
            in: [RecommendationPriority.HIGH, RecommendationPriority.URGENT],
          },
        },
        include: { recommendation: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.recommendationAction.findMany({
        where: {
          organizationId,
          status: RecommendationActionStatus.PENDING,
          priority: {
            in: [RecommendationPriority.LOW, RecommendationPriority.MEDIUM],
          },
        },
        include: { recommendation: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      this.prisma.recommendationAction.findMany({
        where: {
          organizationId,
          status: {
            in: [
              RecommendationActionStatus.COMPLETED,
              RecommendationActionStatus.DISMISSED,
            ],
          },
          resolvedAt: { gte: thirtyDaysAgo },
        },
        include: { recommendation: true },
        orderBy: { resolvedAt: 'desc' },
        take: 20,
      }),
    ]);

    return { needsAttention, recommended, recentlyCompleted };
  }

  async approveAction(user: AuthenticatedUser, actionId: string) {
    const organizationId = user.organizationId!;
    const action = await this.prisma.recommendationAction.findFirst({
      where: { id: actionId, organizationId },
      include: { recommendation: true },
    });
    if (!action) throw new NotFoundException('Action not found');
    if (action.status !== RecommendationActionStatus.PENDING) {
      throw new ForbiddenException('Action is not pending');
    }

    const result = await this.executeRecommendationAction(
      user,
      action.recommendation,
    );

    await this.prisma.recommendationAction.update({
      where: { id: actionId },
      data: {
        status: result.ok
          ? RecommendationActionStatus.COMPLETED
          : RecommendationActionStatus.FAILED,
        resolvedByUserId: user.userId,
        resolvedAt: new Date(),
        result: result as unknown as Prisma.InputJsonValue,
      },
    });

    await this.prisma.recommendation.update({
      where: { id: action.recommendationId },
      data: {
        status: result.ok
          ? RecommendationStatus.EXECUTED
          : RecommendationStatus.APPROVED,
      },
    });

    return result;
  }

  async dismissAction(user: AuthenticatedUser, actionId: string) {
    const organizationId = user.organizationId!;
    const action = await this.prisma.recommendationAction.findFirst({
      where: { id: actionId, organizationId },
    });
    if (!action) throw new NotFoundException('Action not found');

    await this.prisma.recommendationAction.update({
      where: { id: actionId },
      data: {
        status: RecommendationActionStatus.DISMISSED,
        resolvedByUserId: user.userId,
        resolvedAt: new Date(),
      },
    });

    await this.prisma.recommendation.update({
      where: { id: action.recommendationId },
      data: { status: RecommendationStatus.DISMISSED },
    });

    return { dismissed: true };
  }

  async submitFeedback(
    user: AuthenticatedUser,
    recommendationId: string,
    isHelpful: boolean,
    comment?: string,
  ) {
    const organizationId = user.organizationId!;
    const rec = await this.prisma.recommendation.findFirst({
      where: { id: recommendationId, organizationId },
    });
    if (!rec) throw new NotFoundException('Recommendation not found');

    return this.prisma.recommendationFeedback.upsert({
      where: {
        recommendationId_userId: {
          recommendationId,
          userId: user.userId,
        },
      },
      create: {
        organizationId,
        recommendationId,
        userId: user.userId,
        isHelpful,
        comment,
      },
      update: { isHelpful, comment },
    });
  }

  private async executeRecommendationAction(
    user: AuthenticatedUser,
    rec: {
      ruleCode: string;
      recommendedAction: string;
      evidence: unknown;
      title: string;
    },
  ) {
    const organizationId = user.organizationId!;
    const evidence = rec.evidence as Record<string, unknown>;

    switch (rec.ruleCode) {
      case 'TRAINING_OVERDUE_BULK': {
        const enrollments = await this.prisma.employeeEnrollment.findMany({
          where: {
            organizationId,
            status: {
              in: [EnrollmentStatus.NOT_STARTED, EnrollmentStatus.IN_PROGRESS],
            },
          },
          take: 50,
          include: {
            employee: { select: { id: true } },
            course: { select: { title: true } },
          },
        });
        let sent = 0;
        for (const e of enrollments) {
          await this.automation.handleEvent(
            organizationId,
            'TRAINING_OVERDUE',
            {
              employeeId: e.employeeId,
              enrollmentId: e.id,
              title: 'Training reminder',
              body: `Please complete "${e.course.title}" — enrollment is overdue.`,
            },
            { type: AutomationActorType.USER, userId: user.userId },
          );
          sent++;
        }
        return { ok: true, data: { remindersTriggered: sent } };
      }
      case 'CERTIFICATE_EXPIRING': {
        await this.automation.handleEvent(
          organizationId,
          'CERTIFICATE_EXPIRING',
          {
            title: rec.title,
            body: rec.recommendedAction,
          },
          { type: AutomationActorType.USER, userId: user.userId },
        );
        return { ok: true, data: { automationTriggered: true } };
      }
      default:
        return {
          ok: true,
          data: {
            note: 'Marked complete — follow the recommended action in your process.',
            recommendedAction: rec.recommendedAction,
            evidence,
          },
        };
    }
  }
}
