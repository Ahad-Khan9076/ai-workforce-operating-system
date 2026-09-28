import {
  EmploymentStatus,
  WorkforceRiskCategory,
  WorkforceRiskSeverity,
} from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service.js';
import { analyzeSkillGaps } from '../../skill-gap.engine.js';
import type { WorkforceRiskRule } from '../risk-rule.types.js';

const MIN_GAPS = 2;

export function createSkillsGapRule(prisma: PrismaService): WorkforceRiskRule {
  return {
    code: 'SKILLS_GAP_PROFILE',
    description:
      'Flags active employees with two or more skill gaps against their job title skill profile (when defined).',
    async detect(ctx) {
      const employees = await prisma.employee.findMany({
        where: {
          organizationId: ctx.organizationId,
          employmentStatus: EmploymentStatus.ACTIVE,
          jobTitleId: { not: null },
        },
        include: {
          jobTitle: { select: { title: true } },
          employeeSkills: { include: { skill: { select: { id: true, name: true } } } },
        },
      });

      const risks: import('../risk-rule.types.js').DetectedRisk[] = [];

      for (const emp of employees) {
        const profileName = emp.jobTitle?.title;
        if (!profileName) continue;

        const requirements = await prisma.roleSkillRequirement.findMany({
          where: { organizationId: ctx.organizationId, profileName },
          include: { skill: { select: { name: true } } },
        });
        if (requirements.length === 0) continue;

        const analysis = analyzeSkillGaps(
          requirements.map((r) => ({
            skillId: r.skillId,
            skillName: r.skill.name,
            requiredProficiency: r.requiredProficiency,
          })),
          emp.employeeSkills.map((s) => ({
            skillId: s.skillId,
            proficiency: s.proficiency,
          })),
        );

        if (analysis.gaps.length < MIN_GAPS) continue;

        risks.push({
          category: WorkforceRiskCategory.SKILLS,
          severity:
            analysis.gaps.length >= 4
              ? WorkforceRiskSeverity.HIGH
              : WorkforceRiskSeverity.MEDIUM,
          title: 'Role skill gaps',
          summary: `Rule SKILLS_GAP_PROFILE: ${analysis.gaps.length} skills below requirements for profile "${profileName}" (threshold ${MIN_GAPS}+ gaps).`,
          ruleCode: 'SKILLS_GAP_PROFILE',
          evidence: {
            profileName,
            gapCount: analysis.gaps.length,
            gapSkills: analysis.gaps.map((g) => ({
              skill: g.skillName,
              required: g.requiredProficiency,
              actual: g.actualProficiency,
            })),
            thresholdGaps: MIN_GAPS,
          },
          employeeId: emp.id,
          departmentId: emp.departmentId ?? undefined,
        });
      }

      return risks;
    },
  };
}
