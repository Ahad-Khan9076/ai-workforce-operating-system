import {
  AttendanceStatus,
  WorkforceRiskCategory,
  WorkforceRiskSeverity,
} from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service.js';
import type { WorkforceRiskRule } from '../risk-rule.types.js';

const OVERTIME_DAYS_THRESHOLD = 3;
const DEPT_INCREASE_PERCENT = 15;

export function createOvertimeSpikeRule(prisma: PrismaService): WorkforceRiskRule {
  return {
    code: 'OVERTIME_SPIKE',
    description:
      'Flags when department overtime minutes rise sharply and an employee repeatedly exceeds shift overtime threshold.',
    async detect(ctx) {
      const now = ctx.now;
      const recentStart = new Date(now);
      recentStart.setDate(recentStart.getDate() - 14);
      const priorStart = new Date(now);
      priorStart.setDate(priorStart.getDate() - 28);
      const priorEnd = new Date(recentStart);

      const records = await prisma.attendanceRecord.findMany({
        where: {
          organizationId: ctx.organizationId,
          workDate: { gte: priorStart },
          status: { not: AttendanceStatus.WEEKEND },
        },
        select: {
          employeeId: true,
          overtimeMinutes: true,
          workDate: true,
          employee: { select: { departmentId: true } },
        },
      });

      const deptRecent = new Map<string, number>();
      const deptPrior = new Map<string, number>();
      const employeeOvertimeDays = new Map<string, number>();

      for (const r of records) {
        const deptId = r.employee.departmentId ?? '__none__';
        const date = r.workDate.getTime();
        const isRecent = date >= recentStart.getTime();
        if (isRecent) {
          deptRecent.set(deptId, (deptRecent.get(deptId) ?? 0) + r.overtimeMinutes);
          if (r.overtimeMinutes > 0) {
            const key = r.employeeId;
            employeeOvertimeDays.set(key, (employeeOvertimeDays.get(key) ?? 0) + 1);
          }
        } else if (date >= priorStart.getTime() && date < priorEnd.getTime()) {
          deptPrior.set(deptId, (deptPrior.get(deptId) ?? 0) + r.overtimeMinutes);
        }
      }

      const elevatedDepts = new Set<string>();
      for (const [deptId, recentMin] of deptRecent) {
        const priorMin = deptPrior.get(deptId) ?? 0;
        if (priorMin <= 0 && recentMin > 120) {
          elevatedDepts.add(deptId);
          continue;
        }
        if (priorMin > 0) {
          const pct = ((recentMin - priorMin) / priorMin) * 100;
          if (pct >= DEPT_INCREASE_PERCENT) {
            elevatedDepts.add(deptId);
          }
        }
      }

      const risks: import('../risk-rule.types.js').DetectedRisk[] = [];
      const seenEmployee = new Set<string>();

      for (const r of records) {
        if (r.workDate.getTime() < recentStart.getTime()) continue;
        const deptId = r.employee.departmentId;
        if (!deptId || !elevatedDepts.has(deptId)) continue;
        const days = employeeOvertimeDays.get(r.employeeId) ?? 0;
        if (days < OVERTIME_DAYS_THRESHOLD || seenEmployee.has(r.employeeId)) continue;
        seenEmployee.add(r.employeeId);

        const recentTotal = deptRecent.get(deptId) ?? 0;
        const priorTotal = deptPrior.get(deptId) ?? 0;
        const pctChange =
          priorTotal > 0 ? Math.round(((recentTotal - priorTotal) / priorTotal) * 100) : null;

        risks.push({
          category: WorkforceRiskCategory.OVERTIME,
          severity:
            days >= 5 ? WorkforceRiskSeverity.HIGH : WorkforceRiskSeverity.MEDIUM,
          title: 'Elevated overtime pattern',
          summary:
            `Rule OVERTIME_SPIKE: employee logged overtime on ${days} days in the last 14 days while department overtime ${pctChange != null ? `increased ${pctChange}%` : 'rose materially'} vs the prior 14 days.`,
          ruleCode: 'OVERTIME_SPIKE',
          evidence: {
            overtimeDaysLast14: days,
            departmentId: deptId,
            departmentOvertimeMinutesRecent14: recentTotal,
            departmentOvertimeMinutesPrior14: priorTotal,
            departmentOvertimePercentChange: pctChange,
            thresholds: {
              minOvertimeDays: OVERTIME_DAYS_THRESHOLD,
              deptIncreasePercent: DEPT_INCREASE_PERCENT,
            },
          },
          employeeId: r.employeeId,
          departmentId: deptId,
        });
      }

      for (const deptId of elevatedDepts) {
        if (deptId === '__none__') continue;
        const recentTotal = deptRecent.get(deptId) ?? 0;
        const priorTotal = deptPrior.get(deptId) ?? 0;
        const pctChange =
          priorTotal > 0 ? Math.round(((recentTotal - priorTotal) / priorTotal) * 100) : 100;
        risks.push({
          category: WorkforceRiskCategory.WORKLOAD,
          severity:
            pctChange >= 30 ? WorkforceRiskSeverity.HIGH : WorkforceRiskSeverity.MEDIUM,
          title: 'Department workload signal',
          summary: `Rule OVERTIME_SPIKE (workload): department overtime minutes changed ~${pctChange}% comparing the last 14 days to the prior 14 days.`,
          ruleCode: 'DEPT_OVERTIME_TREND',
          evidence: {
            departmentOvertimeMinutesRecent14: recentTotal,
            departmentOvertimeMinutesPrior14: priorTotal,
            departmentOvertimePercentChange: pctChange,
          },
          departmentId: deptId,
        });
      }

      return risks;
    },
  };
}
