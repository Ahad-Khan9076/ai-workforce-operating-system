import { describe, it, expect } from 'vitest';
import { SkillProficiency } from '@prisma/client';
import { analyzeSkillGaps } from './skill-gap.engine.js';

describe('skill gap engine', () => {
  it('finds TypeScript gap when role requires Advanced', () => {
    const analysis = analyzeSkillGaps(
      [
        {
          skillId: 'react',
          skillName: 'React',
          requiredProficiency: SkillProficiency.ADVANCED,
        },
        {
          skillId: 'ts',
          skillName: 'TypeScript',
          requiredProficiency: SkillProficiency.ADVANCED,
        },
      ],
      [
        { skillId: 'react', proficiency: SkillProficiency.ADVANCED },
        { skillId: 'ts', proficiency: SkillProficiency.INTERMEDIATE },
      ],
    );
    expect(analysis.strengths).toHaveLength(1);
    expect(analysis.gaps).toHaveLength(1);
    expect(analysis.gaps[0]?.skillName).toBe('TypeScript');
  });
});
