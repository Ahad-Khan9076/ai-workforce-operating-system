import { Injectable } from '@nestjs/common';
import {
  EmploymentStatus,
  EnrollmentStatus,
  Prisma,
  RecruitmentJobStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class WorkforceInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async refreshInsights(organizationId: string) {
    const generated = await this.buildInsightDrafts(organizationId);
    await this.prisma.workforceInsight.deleteMany({
      where: {
        organizationId,
        createdAt: { lt: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
      },
    });
    for (const draft of generated) {
      await this.prisma.workforceInsight.create({
        data: {
          organizationId,
          insightType: draft.insightType,
          title: draft.title,
          whatHappened: draft.whatHappened,
          whyItMatters: draft.whyItMatters,
          recommendedAction: draft.recommendedAction,
          metrics: draft.metrics as Prisma.InputJsonValue,
          departmentId: draft.departmentId,
        },
      });
    }
    return generated.length;
  }

  async listInsights(organizationId: string, limit = 50) {
    return this.prisma.workforceInsight.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { department: { select: { name: true } } },
    });
  }

  private async buildInsightDrafts(organizationId: string) {
    const drafts: Array<{
      insightType: string;
      title: string;
      whatHappened: string;
      whyItMatters: string;
      recommendedAction: string;
      metrics?: Record<string, unknown>;
      departmentId?: string;
    }> = [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [headcountNow, headcountPrior, hires30, term30] = await Promise.all([
      this.prisma.employee.count({
        where: { organizationId, employmentStatus: EmploymentStatus.ACTIVE },
      }),
      this.prisma.employee.count({
        where: {
          organizationId,
          employmentStatus: EmploymentStatus.ACTIVE,
          createdAt: { lte: thirtyDaysAgo },
        },
      }),
      this.prisma.employee.count({
        where: { organizationId, joinDate: { gte: thirtyDaysAgo } },
      }),
      this.prisma.employee.count({
        where: {
          organizationId,
          employmentStatus: { in: [EmploymentStatus.TERMINATED, EmploymentStatus.RESIGNED] },
          updatedAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    if (headcountPrior > 0) {
      const pct = Math.round(((headcountNow - headcountPrior) / headcountPrior) * 100);
      drafts.push({
        insightType: 'HEADCOUNT_TREND',
        title: 'Headcount movement (30 days)',
        whatHappened: `Active headcount is ${headcountNow} (${pct >= 0 ? '+' : ''}${pct}% vs 30 days ago). ${hires30} new hires; ${term30} exits in the period.`,
        whyItMatters: 'Sudden shifts affect capacity planning, onboarding load, and payroll run size.',
        recommendedAction:
          pct > 10
            ? 'Review hiring plan and onboarding capacity with department leads.'
            : 'Validate headcount plan against budget and project pipeline.',
        metrics: { headcountNow, headcountPrior, hires30, term30, percentChange: pct },
      });
    }

    const deptOvertime = await this.prisma.attendanceRecord.groupBy({
      by: ['employeeId'],
      where: {
        organizationId,
        workDate: { gte: thirtyDaysAgo },
      },
      _sum: { overtimeMinutes: true },
    });

    const empDept = await this.prisma.employee.findMany({
      where: { organizationId, id: { in: deptOvertime.map((d) => d.employeeId) } },
      select: { id: true, departmentId: true, department: { select: { id: true, name: true } } },
    });
    const deptMap = new Map(empDept.map((e) => [e.id, e.department]));

    const overtimeByDept = new Map<string, { name: string; minutes: number }>();
    for (const row of deptOvertime) {
      const dept = deptMap.get(row.employeeId);
      if (!dept) continue;
      const prev = overtimeByDept.get(dept.id) ?? { name: dept.name, minutes: 0 };
      prev.minutes += row._sum.overtimeMinutes ?? 0;
      overtimeByDept.set(dept.id, prev);
    }

    let topDept: { id: string; name: string; minutes: number } | null = null;
    for (const [id, v] of overtimeByDept) {
      if (!topDept || v.minutes > topDept.minutes) {
        topDept = { id, name: v.name, minutes: v.minutes };
      }
    }

    if (topDept && topDept.minutes > 600) {
      drafts.push({
        insightType: 'OVERTIME',
        title: `${topDept.name} overtime concentration`,
        whatHappened: `${topDept.name} logged ${Math.round(topDept.minutes / 60)} overtime hours in the last 30 days.`,
        whyItMatters: 'Potential workload imbalance or staffing gap in that department.',
        recommendedAction: `Review workload distribution and shift coverage for ${topDept.name}.`,
        metrics: { overtimeMinutes: topDept.minutes },
        departmentId: topDept.id,
      });
    }

    const openJobs = await this.prisma.recruitmentJob.count({
      where: { organizationId, status: RecruitmentJobStatus.OPEN },
    });
    if (openJobs > 0) {
      drafts.push({
        insightType: 'HIRING',
        title: 'Open requisitions',
        whatHappened: `${openJobs} job requisitions are currently open.`,
        whyItMatters: 'Open roles drive time-to-fill and hiring funnel workload.',
        recommendedAction: 'Prioritize critical roles and review pipeline velocity weekly.',
        metrics: { openJobs },
      });
    }

    const gapCount = await this.prisma.skillGap.count({ where: { organizationId } });
    if (gapCount > 0) {
      drafts.push({
        insightType: 'SKILL_GAPS',
        title: 'Organization skill gaps',
        whatHappened: `${gapCount} skill gaps recorded against role profiles.`,
        whyItMatters: 'Gaps limit internal mobility and delivery quality for key roles.',
        recommendedAction: 'Align LMS paths with top gap skills and role requirements.',
        metrics: { gapCount },
      });
    }

    const trainingIncomplete = await this.prisma.employeeEnrollment.count({
      where: {
        organizationId,
        status: {
          in: [EnrollmentStatus.NOT_STARTED, EnrollmentStatus.IN_PROGRESS],
        },
      },
    });
    if (trainingIncomplete > 0) {
      drafts.push({
        insightType: 'TRAINING',
        title: 'Training in progress',
        whatHappened: `${trainingIncomplete} course enrollments are not yet completed.`,
        whyItMatters: 'Incomplete training affects compliance and role readiness.',
        recommendedAction: 'Send reminders for overdue mandatory courses and check assignment rules.',
        metrics: { trainingIncomplete },
      });
    }

    return drafts;
  }
}
