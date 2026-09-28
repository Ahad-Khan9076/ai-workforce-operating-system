import {
  AttendanceStatus,
  WorkforceRiskCategory,
  WorkforceRiskSeverity,
} from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service.js';
import type { WorkforceRiskRule } from '../risk-rule.types.js';

const WINDOW_DAYS = 30;
const ABSENCE_COUNT = 3;

export function createAttendanceAbsenceRule(
  prisma: PrismaService,
): WorkforceRiskRule {
  return {
    code: 'ATTENDANCE_ABSENCE',
    description: `Flags ${ABSENCE_COUNT}+ absence records in the last ${WINDOW_DAYS} days.`,
    async detect(ctx) {
      const from = new Date(ctx.now);
      from.setDate(from.getDate() - WINDOW_DAYS);

      const absences = await prisma.attendanceRecord.findMany({
        where: {
          organizationId: ctx.organizationId,
          workDate: { gte: from },
          status: AttendanceStatus.ABSENT,
        },
        select: { employeeId: true },
      });

      const counts = new Map<string, number>();
      for (const row of absences) {
        counts.set(row.employeeId, (counts.get(row.employeeId) ?? 0) + 1);
      }

      const flagged = [...counts.entries()].filter(([, c]) => c >= ABSENCE_COUNT);
      if (flagged.length === 0) return [];

      const employees = await prisma.employee.findMany({
        where: {
          organizationId: ctx.organizationId,
          id: { in: flagged.map(([id]) => id) },
        },
        select: { id: true, departmentId: true },
      });
      const deptByEmp = new Map(employees.map((e) => [e.id, e.departmentId]));

      return flagged.map(([employeeId, absenceCount]) => ({
        category: WorkforceRiskCategory.ATTENDANCE,
        severity:
          absenceCount >= 5
            ? WorkforceRiskSeverity.HIGH
            : WorkforceRiskSeverity.MEDIUM,
        title: 'Repeated absences',
        summary: `Rule ATTENDANCE_ABSENCE: ${absenceCount} absence records in the last ${WINDOW_DAYS} days (threshold ${ABSENCE_COUNT}).`,
        ruleCode: 'ATTENDANCE_ABSENCE',
        evidence: {
          absenceCount,
          windowDays: WINDOW_DAYS,
          threshold: ABSENCE_COUNT,
        },
        employeeId,
        departmentId: deptByEmp.get(employeeId) ?? undefined,
      }));
    },
  };
}
