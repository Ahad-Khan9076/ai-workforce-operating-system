import { describe, it, expect } from 'vitest';
import { SkillProficiency } from '@prisma/client';
import {
  compareProficiency,
  proficiencyLevel,
} from './skill-proficiency.util.js';

describe('skill proficiency util', () => {
  it('orders levels correctly', () => {
    expect(proficiencyLevel(SkillProficiency.BEGINNER)).toBeLessThan(
      proficiencyLevel(SkillProficiency.EXPERT),
    );
  });

  it('detects TypeScript gap example', () => {
    const result = compareProficiency(
      SkillProficiency.INTERMEDIATE,
      SkillProficiency.ADVANCED,
    );
    expect(result.meets).toBe(false);
    expect(result.gapLevels).toBe(1);
  });

  it('treats missing skill as full gap', () => {
    const result = compareProficiency(null, SkillProficiency.ADVANCED);
    expect(result.meets).toBe(false);
    expect(result.gapLevels).toBe(proficiencyLevel(SkillProficiency.ADVANCED));
  });
});
