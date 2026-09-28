import { BadRequestException, Injectable } from '@nestjs/common';
import {
  GoalStatus,
  PerformanceCycleStatus,
  PerformanceReviewStatus,
  Prisma,
  SkillProficiency,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { notFoundInTenant } from '../../common/utils/tenant.util.js';
import { toWorkDateStorage } from '../workforce/workforce-date.util.js';

@Injectable()
export class PerformanceService {
  constructor(private readonly prisma: PrismaService) {}

  listCycles(organizationId: string) {
    return this.prisma.performanceCycle.findMany({
      where: { organizationId },
      orderBy: { startDate: 'desc' },
    });
  }

  createCycle(
    organizationId: string,
    data: { name: string; startDate: string; endDate: string },
  ) {
    return this.prisma.performanceCycle.create({
      data: {
        organizationId,
        name: data.name,
        startDate: toWorkDateStorage(data.startDate),
        endDate: toWorkDateStorage(data.endDate),
        status: PerformanceCycleStatus.DRAFT,
      },
    });
  }

  async activateCycle(organizationId: string, cycleId: string) {
    const cycle = await this.getCycle(organizationId, cycleId);
    if (cycle.status !== PerformanceCycleStatus.DRAFT) {
      throw new BadRequestException('Only draft cycles can be activated');
    }
    return this.prisma.performanceCycle.update({
      where: { id: cycleId },
      data: { status: PerformanceCycleStatus.ACTIVE },
    });
  }

  async getCycle(organizationId: string, cycleId: string) {
    const cycle = await this.prisma.performanceCycle.findFirst({
      where: { id: cycleId, organizationId },
      include: { goals: true, reviews: true, kpis: true },
    });
    if (!cycle) notFoundInTenant('Performance cycle');
    return cycle;
  }

  createGoal(
    organizationId: string,
    data: {
      cycleId: string;
      employeeId: string;
      title: string;
      description?: string;
      target?: string;
      weight?: number;
      dueDate?: string;
    },
  ) {
    return this.prisma.goal.create({
      data: {
        organizationId,
        cycleId: data.cycleId,
        employeeId: data.employeeId,
        title: data.title,
        description: data.description,
        target: data.target,
        weight: data.weight ?? 1,
        dueDate: data.dueDate ? toWorkDateStorage(data.dueDate) : undefined,
        status: GoalStatus.ACTIVE,
      },
    });
  }

  async updateGoalProgress(
    organizationId: string,
    goalId: string,
    progressPercent: number,
  ) {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, organizationId },
    });
    if (!goal) notFoundInTenant('Goal');

    const status =
      progressPercent >= 100 ? GoalStatus.COMPLETED : GoalStatus.ACTIVE;

    return this.prisma.goal.update({
      where: { id: goalId },
      data: { progressPercent, status },
    });
  }

  async startReviewCycle(organizationId: string, cycleId: string) {
    const cycle = await this.getCycle(organizationId, cycleId);
    if (cycle.status !== PerformanceCycleStatus.ACTIVE) {
      throw new BadRequestException('Cycle must be active to start reviews');
    }

    const employeeIds = [...new Set(cycle.goals.map((g) => g.employeeId))];
    for (const employeeId of employeeIds) {
      const employee = await this.prisma.employee.findFirst({
        where: { id: employeeId, organizationId },
      });
      await this.prisma.performanceReview.upsert({
        where: { cycleId_employeeId: { cycleId, employeeId } },
        update: {},
        create: {
          organizationId,
          cycleId,
          employeeId,
          managerId: employee?.managerId ?? undefined,
          status: PerformanceReviewStatus.PENDING,
        },
      });
    }

    await this.prisma.performanceCycle.update({
      where: { id: cycleId },
      data: { status: PerformanceCycleStatus.REVIEW },
    });

    return this.getCycle(organizationId, cycleId);
  }

  async submitManagerReview(
    organizationId: string,
    reviewId: string,
    summary: string,
  ) {
    const review = await this.prisma.performanceReview.findFirst({
      where: { id: reviewId, organizationId },
    });
    if (!review) notFoundInTenant('Review');
    if (review.status !== PerformanceReviewStatus.PENDING) {
      throw new BadRequestException('Review is not pending manager input');
    }
    return this.prisma.performanceReview.update({
      where: { id: reviewId },
      data: {
        managerSummary: summary,
        status: PerformanceReviewStatus.MANAGER_REVIEW,
      },
    });
  }

  async acknowledgeReview(
    organizationId: string,
    reviewId: string,
    note?: string,
  ) {
    const review = await this.prisma.performanceReview.findFirst({
      where: { id: reviewId, organizationId },
    });
    if (!review) notFoundInTenant('Review');
    if (review.status !== PerformanceReviewStatus.MANAGER_REVIEW) {
      throw new BadRequestException('Manager review required first');
    }
    return this.prisma.performanceReview.update({
      where: { id: reviewId },
      data: {
        employeeAckNote: note,
        status: PerformanceReviewStatus.EMPLOYEE_ACK,
      },
    });
  }

  async finalizeReview(organizationId: string, reviewId: string) {
    const review = await this.prisma.performanceReview.findFirst({
      where: { id: reviewId, organizationId },
      include: { employee: true },
    });
    if (!review) notFoundInTenant('Review');
    if (review.status !== PerformanceReviewStatus.EMPLOYEE_ACK) {
      throw new BadRequestException('Employee acknowledgement required');
    }

    const updated = await this.prisma.performanceReview.update({
      where: { id: reviewId },
      data: {
        status: PerformanceReviewStatus.FINALIZED,
        finalizedAt: new Date(),
      },
    });

    await this.captureInsightSnapshot(organizationId, review.employeeId, review.cycleId);
    return updated;
  }

  async finalizeCycle(organizationId: string, cycleId: string) {
    const pending = await this.prisma.performanceReview.count({
      where: {
        organizationId,
        cycleId,
        status: { not: PerformanceReviewStatus.FINALIZED },
      },
    });
    if (pending > 0) {
      throw new BadRequestException('All reviews must be finalized first');
    }
    return this.prisma.performanceCycle.update({
      where: { id: cycleId },
      data: { status: PerformanceCycleStatus.FINALIZED },
    });
  }

  async getDashboard(organizationId: string) {
    const [cycles, goals, reviews, deptGoals] = await Promise.all([
      this.prisma.performanceCycle.findMany({
        where: { organizationId },
        orderBy: { startDate: 'desc' },
        take: 6,
      }),
      this.prisma.goal.findMany({ where: { organizationId } }),
      this.prisma.performanceReview.findMany({
        where: { organizationId },
        include: { employee: { select: { departmentId: true, department: true } } },
      }),
      this.prisma.goal.findMany({
        where: { organizationId, status: GoalStatus.ACTIVE },
        include: {
          employee: { select: { departmentId: true, department: true } },
        },
      }),
    ]);

    const goalCompletion =
      goals.length === 0
        ? 0
        : Math.round(
            (goals.filter((g) => g.status === GoalStatus.COMPLETED).length /
              goals.length) *
              100,
          );

    const pendingReviews = reviews.filter(
      (r) => r.status !== PerformanceReviewStatus.FINALIZED,
    ).length;

    const byDepartment = new Map<string, { name: string; avgProgress: number; count: number }>();
    for (const goal of deptGoals) {
      const name = goal.employee.department?.name ?? 'Unassigned';
      const key = goal.employee.departmentId ?? 'none';
      const row = byDepartment.get(key) ?? { name, avgProgress: 0, count: 0 };
      row.avgProgress += goal.progressPercent;
      row.count += 1;
      byDepartment.set(key, row);
    }

    const departmentPerformance = [...byDepartment.values()].map((d) => ({
      name: d.name,
      avgProgress: d.count ? Math.round(d.avgProgress / d.count) : 0,
    }));

    const trend = cycles.map((c) => ({
      cycle: c.name,
      status: c.status,
    }));

    return {
      goalCompletionPercent: goalCompletion,
      pendingReviews,
      performanceTrend: trend,
      departmentPerformance,
    };
  }

  private async captureInsightSnapshot(
    organizationId: string,
    employeeId: string,
    cycleId: string,
  ) {
    const [goals, enrollments, skills] = await Promise.all([
      this.prisma.goal.findMany({ where: { organizationId, employeeId, cycleId } }),
      this.prisma.employeeEnrollment.findMany({
        where: { organizationId, employeeId },
      }),
      this.prisma.employeeSkill.findMany({
        where: { employeeId },
        include: { skill: true },
      }),
    ]);

    const payload = {
      kpiTrends: goals.map((g) => ({
        title: g.title,
        progressPercent: g.progressPercent,
        weight: g.weight,
        status: g.status,
      })),
      trainingGaps: enrollments
        .filter((e) => e.status !== 'COMPLETED')
        .map((e) => ({ courseId: e.courseId, status: e.status })),
      skillGaps: skills
        .filter(
          (s) =>
            s.proficiency === SkillProficiency.BEGINNER ||
            s.proficiency === SkillProficiency.INTERMEDIATE,
        )
        .map((s) => ({ skill: s.skill.name, proficiency: s.proficiency })),
      developmentOpportunities: goals
        .filter((g) => g.progressPercent < 50)
        .map((g) => g.title),
    };

    await this.prisma.workforceInsightSnapshot.create({
      data: {
        organizationId,
        employeeId,
        snapshotType: 'performance_review_finalized',
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }
}
