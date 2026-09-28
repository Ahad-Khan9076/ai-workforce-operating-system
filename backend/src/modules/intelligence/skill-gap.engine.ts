import { SkillProficiency } from '@prisma/client';
import {
  compareProficiency,
  recommendedLearningForGap,
} from './skill-proficiency.util.js';

export interface RoleRequirementRow {
  skillId: string;
  skillName: string;
  requiredProficiency: SkillProficiency;
}

export interface EmployeeSkillRow {
  skillId: string;
  proficiency: SkillProficiency;
}

export interface SkillGapResult {
  skillId: string;
  skillName: string;
  requiredProficiency: SkillProficiency;
  actualProficiency: SkillProficiency | null;
  gapLevels: number;
  recommendedLearning: string;
}

export interface SkillStrengthResult {
  skillId: string;
  skillName: string;
  proficiency: SkillProficiency;
  requiredProficiency: SkillProficiency;
}

export interface SkillGapAnalysis {
  gaps: SkillGapResult[];
  strengths: SkillStrengthResult[];
}

export function analyzeSkillGaps(
  requirements: RoleRequirementRow[],
  employeeSkills: EmployeeSkillRow[],
): SkillGapAnalysis {
  const bySkill = new Map(employeeSkills.map((s) => [s.skillId, s.proficiency]));
  const gaps: SkillGapResult[] = [];
  const strengths: SkillStrengthResult[] = [];

  for (const req of requirements) {
    const actual = bySkill.get(req.skillId) ?? null;
    const { meets, gapLevels } = compareProficiency(actual, req.requiredProficiency);
    if (meets && actual) {
      strengths.push({
        skillId: req.skillId,
        skillName: req.skillName,
        proficiency: actual,
        requiredProficiency: req.requiredProficiency,
      });
    } else {
      gaps.push({
        skillId: req.skillId,
        skillName: req.skillName,
        requiredProficiency: req.requiredProficiency,
        actualProficiency: actual,
        gapLevels,
        recommendedLearning: recommendedLearningForGap(
          req.skillName,
          req.requiredProficiency,
          actual,
        ),
      });
    }
  }

  return { gaps, strengths };
}
