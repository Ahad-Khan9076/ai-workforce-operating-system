import { Injectable } from '@nestjs/common';
import {
  EmploymentStatus,
  EnrollmentStatus,
  RecruitmentJobStatus,
  WorkforceRiskSeverity,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { EmployeeScopeService } from '../workforce/employee-scope.service.js';
import { ROLE_CODES } from '../../common/constants/permissions.js';

export type DashboardVariant = 'executive' | 'hr' | 'manager';

@Injectable()
export class IntelligenceDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employeeScope: EmployeeScopeService,
  ) {}

  resolveVariant(user: AuthenticatedUser): DashboardVariant {
    const code = user.roleCode;
    if (
      code === ROLE_CODES.OWNER ||
      code === ROLE_CODES.HR_ADMIN ||
      code === ROLE_CODES.PAYROLL_ADMIN
    ) {
      return 'executive';
    }
    if (code === ROLE_CODES.HR_MANAGER || code === ROLE_CODES.TRAINING_MANAGER) {
      return 'hr';
    }
    return 'manager';
  }

  async getDashboard(user: AuthenticatedUser, variant?: DashboardVariant) {
    const v = variant ?? this.resolveVariant(user);
    const organizationId = user.organizationId!;
    const employeeFilter = await this.employeeScope.getAccessibleEmployeeFilter(user);
    const scopedEmployeeIds =
      'OR' in employeeFilter || employeeFilter.id === '__none__'
        ? await this.prisma.employee.findMany({
            where: employeeFilter,
            select: { id: true },
          }).then((rows) => rows.map((r) => r.id))
        : null;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const employeeWhere = scopedEmployeeIds
      ? { organizationId, id: { in: scopedEmployeeIds } }
      : { organizationId };

    const [
      headcount,
      active,
      onLeave,
      newHires,
      openJobs,
      overtimeSum,
      riskCounts,
      skillGapCount,
      trainingIncomplete,
      avgPerformance,
    ] = await Promise.all([
      this.prisma.employee.count({ where: employeeWhere }),
      this.prisma.employee.count({
        where: { ...employeeWhere, employmentStatus: EmploymentStatus.ACTIVE },
      }),
      this.prisma.employee.count({
        where: { ...employeeWhere, employmentStatus: EmploymentStatus.ON_LEAVE },
      }),
      this.prisma.employee.count({
        where: { ...employeeWhere, joinDate: { gte: thirtyDaysAgo } },
      }),
      v !== 'manager'
        ? this.prisma.recruitmentJob.count({
            where: { organizationId, status: RecruitmentJobStatus.OPEN },
          })
        : Promise.resolve(0),
      this.prisma.attendanceRecord.aggregate({
        where: {
          organizationId,
          workDate: { gte: thirtyDaysAgo },
          ...(scopedEmployeeIds
            ? { employeeId: { in: scopedEmployeeIds } }
            : {}),
        },
        _sum: { overtimeMinutes: true },
      }),
      this.prisma.workforceRisk.groupBy({
        by: ['severity'],
        where: {
          organizationId,
          acknowledgedAt: null,
          ...(scopedEmployeeIds
            ? {
                OR: [
                  { employeeId: { in: scopedEmployeeIds } },
                  { employeeId: null },
                ],
              }
            : {}),
        },
        _count: { _all: true },
      }),
      this.prisma.skillGap.count({
        where: scopedEmployeeIds
          ? { organizationId, employeeId: { in: scopedEmployeeIds } }
          : { organizationId },
      }),
      this.prisma.employeeEnrollment.count({
        where: {
          organizationId,
          status: { in: [EnrollmentStatus.NOT_STARTED, EnrollmentStatus.IN_PROGRESS] },
          ...(scopedEmployeeIds
            ? { employeeId: { in: scopedEmployeeIds } }
            : {}),
        },
      }),
      this.prisma.performanceFeedback.aggregate({
        where: {
          organizationId,
          createdAt: { gte: thirtyDaysAgo },
          review: scopedEmployeeIds
            ? { employeeId: { in: scopedEmployeeIds } }
            : undefined,
        },
        _avg: { rating: true },
      }),
    ]);

    const headcountTrend = await this.monthlyHeadcountTrend(organizationId, scopedEmployeeIds);

    const cards = {
      headcount: { value: headcount, active, onLeave },
      payroll: v === 'executive' ? { note: 'See payroll module for period totals' } : undefined,
      hiring: { openJobs, newHires30d: newHires },
      attendance: { scope: v },
      overtime: {
        minutes30d: overtimeSum._sum.overtimeMinutes ?? 0,
        hours30d: Math.round((overtimeSum._sum.overtimeMinutes ?? 0) / 60),
      },
      performance: {
        avgRating30d: avgPerformance._avg.rating
          ? Math.round(avgPerformance._avg.rating * 10) / 10
          : null,
      },
      training: { incompleteEnrollments: trainingIncomplete },
      skillGaps: { count: skillGapCount },
      risks: this.severityMap(riskCounts),
    };

    const focus =
      v === 'executive'
        ? ['headcount', 'payroll', 'hiring', 'overtime', 'performance', 'training', 'skillGaps']
        : v === 'hr'
          ? ['people', 'hiring', 'attendance', 'leave', 'training', 'performance', 'risks']
          : ['teamHeadcount', 'attendance', 'goals', 'performance', 'training', 'risks'];

    return {
      variant: v,
      cards,
      trends: { headcount: headcountTrend },
      focus,
    };
  }

  private severityMap(
    rows: Array<{ severity: WorkforceRiskSeverity; _count: { _all: number } }>,
  ) {
    const map: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    for (const r of rows) {
      map[r.severity] = r._count._all;
    }
    return map;
  }

  private async monthlyHeadcountTrend(
    organizationId: string,
    scopedEmployeeIds: string[] | null,
  ) {
    const points: Array<{ month: string; count: number }> = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const where = scopedEmployeeIds
        ? {
            organizationId,
            id: { in: scopedEmployeeIds },
            createdAt: { lte: end },
            OR: [
              { employmentStatus: EmploymentStatus.ACTIVE },
              { updatedAt: { gte: end } },
            ],
          }
        : {
            organizationId,
            createdAt: { lte: end },
            employmentStatus: EmploymentStatus.ACTIVE,
          };
      const count = await this.prisma.employee.count({ where });
      points.push({
        month: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`,
        count,
      });
    }
    return points;
  }
}
