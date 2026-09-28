import { SkillProficiency } from '@prisma/client';

const ORDER: Record<SkillProficiency, number> = {
  [SkillProficiency.BEGINNER]: 1,
  [SkillProficiency.INTERMEDIATE]: 2,
  [SkillProficiency.ADVANCED]: 3,
  [SkillProficiency.EXPERT]: 4,
};

export function proficiencyLevel(p: SkillProficiency): number {
  return ORDER[p];
}

export function compareProficiency(
  actual: SkillProficiency | null | undefined,
  required: SkillProficiency,
): { meets: boolean; gapLevels: number } {
  if (!actual) {
    return { meets: false, gapLevels: proficiencyLevel(required) };
  }
  const gap = proficiencyLevel(required) - proficiencyLevel(actual);
  return { meets: gap <= 0, gapLevels: Math.max(0, gap) };
}

export function recommendedLearningForGap(
  skillName: string,
  required: SkillProficiency,
  actual: SkillProficiency | null | undefined,
): string {
  if (!actual) {
    return `Start structured learning for ${skillName} to reach ${required} level.`;
  }
  return `Upskill ${skillName} from ${actual} toward ${required} (courses, mentoring, or project assignment).`;
}
