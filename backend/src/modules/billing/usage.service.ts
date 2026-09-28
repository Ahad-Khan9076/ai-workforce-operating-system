import { Injectable } from '@nestjs/common';
import {
  EmploymentStatus,
  EnrollmentStatus,
  SubscriptionStatus,
  UsageMetricCode,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

export interface UsageSnapshot {
  metric: UsageMetricCode;
  quantity: number;
  limit: number | null;
}

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  async snapshot(organizationId: string) {
    const [activeEmployees, candidates, aiRequests, trainingUsers] =
      await Promise.all([
        this.prisma.employee.count({
          where: {
            organizationId,
            employmentStatus: EmploymentStatus.ACTIVE,
          },
        }),
        this.prisma.candidate.count({ where: { organizationId } }),
        this.prisma.aiAuditLog.count({ where: { organizationId } }),
        this.prisma.employeeEnrollment.count({
          where: {
            organizationId,
            status: { not: EnrollmentStatus.NOT_STARTED },
          },
        }),
      ]);

    const storageBytes = 0;

    const metrics: UsageSnapshot[] = [
      {
        metric: UsageMetricCode.ACTIVE_EMPLOYEES,
        quantity: activeEmployees,
        limit: await this.limitFor(organizationId, 'activeEmployees'),
      },
      {
        metric: UsageMetricCode.RECRUITMENT_CANDIDATES,
        quantity: candidates,
        limit: await this.limitFor(organizationId, 'recruitmentCandidates'),
      },
      {
        metric: UsageMetricCode.AI_REQUESTS,
        quantity: aiRequests,
        limit: await this.limitFor(organizationId, 'aiRequestsPerMonth'),
      },
      {
        metric: UsageMetricCode.STORAGE_BYTES,
        quantity: storageBytes,
        limit: await this.limitFor(organizationId, 'storageBytes'),
      },
      {
        metric: UsageMetricCode.TRAINING_USERS,
        quantity: trainingUsers,
        limit: await this.limitFor(organizationId, 'trainingUsers'),
      },
    ];

    const now = new Date();
    for (const m of metrics) {
      await this.prisma.usageRecord.create({
        data: {
          organizationId,
          metric: m.metric,
          quantity: m.quantity,
          recordedAt: now,
          periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
          periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        },
      });
    }

    return { recordedAt: now, metrics };
  }

  private async limitFor(organizationId: string, key: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { organizationId, status: SubscriptionStatus.ACTIVE },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!sub?.plan.limits) return null;
    const limits = sub.plan.limits as Record<string, number | null>;
    const val = limits[key];
    return val === undefined ? null : val;
  }
}
