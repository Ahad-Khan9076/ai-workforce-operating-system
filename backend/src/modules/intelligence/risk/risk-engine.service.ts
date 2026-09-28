import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import type { DetectedRisk, WorkforceRiskRule } from './risk-rule.types.js';
import { createOvertimeSpikeRule } from './rules/overtime-spike.rule.js';
import { createTrainingOverdueRule } from './rules/training-overdue.rule.js';
import { createPerformanceDeclineRule } from './rules/performance-decline.rule.js';
import { createAttendanceAbsenceRule } from './rules/attendance-absence.rule.js';
import { createSkillsGapRule } from './rules/skills-gap.rule.js';

@Injectable()
export class RiskEngineService {
  private readonly rules: WorkforceRiskRule[];

  constructor(private readonly prisma: PrismaService) {
    this.rules = [
      createOvertimeSpikeRule(prisma),
      createTrainingOverdueRule(prisma),
      createPerformanceDeclineRule(prisma),
      createAttendanceAbsenceRule(prisma),
      createSkillsGapRule(prisma),
    ];
  }

  listRuleDefinitions() {
    return this.rules.map((r) => ({ code: r.code, description: r.description }));
  }

  async runDetection(organizationId: string, now = new Date()) {
    const ctx = { organizationId, now };
    const detected: DetectedRisk[] = [];
    for (const rule of this.rules) {
      const found = await rule.detect(ctx);
      detected.push(...found);
    }
    return detected;
  }

  async syncRisks(
    organizationId: string,
    employeeFilter?: Prisma.EmployeeWhereInput,
  ) {
    const detected = await this.runDetection(organizationId);
    let scoped = detected;
    if (employeeFilter) {
      scoped = [];
      for (const d of detected) {
        if (!d.employeeId) {
          scoped.push(d);
          continue;
        }
        const ok = await this.employeeMatchesFilter(
          organizationId,
          d.employeeId,
          employeeFilter,
        );
        if (ok) scoped.push(d);
      }
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    await this.prisma.workforceRisk.deleteMany({
      where: {
        organizationId,
        acknowledgedAt: null,
        createdAt: { lt: weekAgo },
      },
    });

    for (const risk of scoped) {
      const existing = await this.prisma.workforceRisk.findFirst({
        where: {
          organizationId,
          ruleCode: risk.ruleCode,
          employeeId: risk.employeeId ?? null,
          departmentId: risk.departmentId ?? null,
          acknowledgedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existing) {
        await this.prisma.workforceRisk.update({
          where: { id: existing.id },
          data: {
            severity: risk.severity,
            title: risk.title,
            summary: risk.summary,
            evidence: risk.evidence as Prisma.InputJsonValue,
          },
        });
      } else {
        await this.prisma.workforceRisk.create({
          data: {
            organizationId,
            category: risk.category,
            severity: risk.severity,
            title: risk.title,
            summary: risk.summary,
            ruleCode: risk.ruleCode,
            evidence: risk.evidence as Prisma.InputJsonValue,
            employeeId: risk.employeeId,
            departmentId: risk.departmentId,
          },
        });
      }
    }

    return scoped.length;
  }

  private async employeeMatchesFilter(
    organizationId: string,
    employeeId: string,
    filter: Prisma.EmployeeWhereInput,
  ) {
    const count = await this.prisma.employee.count({
      where: {
        AND: [{ id: employeeId, organizationId }, filter],
      },
    });
    return count > 0;
  }
}
