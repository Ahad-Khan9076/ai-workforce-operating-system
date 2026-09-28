import { describe, it, expect } from 'vitest';
import { AiMatchRecommendation } from '@prisma/client';
import { validateCandidateScreeningResult } from './candidate-screening.types.js';
import { MockCandidateScreeningProvider } from './mock-candidate-screening.provider.js';

describe('AI candidate screening', () => {
  it('validates structured screening payloads', () => {
    expect(
      validateCandidateScreeningResult({
        matchScore: 80,
        strengths: ['TypeScript'],
        missingSkills: ['Kubernetes'],
        experienceMatch: '5 years',
        educationMatch: 'BS',
        reasoningSummary: 'Good overlap',
        recommendation: AiMatchRecommendation.STRONG_MATCH,
      }),
    ).toBe(true);

    expect(validateCandidateScreeningResult({ matchScore: 200 })).toBe(false);
  });

  it('mock provider returns valid JSON without external API', async () => {
    const provider = new MockCandidateScreeningProvider();
    const result = await provider.screen({
      jobRequirements: 'Need React and Node',
      jobSkills: ['react', 'node'],
      candidateProfile: { skills: ['react'] },
      cvText: 'Experienced with react and node projects',
    });
    expect(validateCandidateScreeningResult(result)).toBe(true);
  });
});
