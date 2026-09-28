import { Injectable } from '@nestjs/common';
import { AiMatchRecommendation } from '@prisma/client';
import { CandidateScreeningProvider } from './candidate-screening.provider.js';
import type {
  CandidateScreeningInput,
  CandidateScreeningResult,
} from './candidate-screening.types.js';

@Injectable()
export class MockCandidateScreeningProvider extends CandidateScreeningProvider {
  readonly providerName = 'mock';
  readonly modelName = 'mock-screening-v1';

  async screen(input: CandidateScreeningInput): Promise<CandidateScreeningResult> {
    const requiredSkills = input.jobSkills.map((s) => s.toLowerCase());
    const cvLower = input.cvText.toLowerCase();
    const profileSkills = Array.isArray(input.candidateProfile.skills)
      ? (input.candidateProfile.skills as string[]).map((s) => s.toLowerCase())
      : [];

    const matched = requiredSkills.filter(
      (skill) => cvLower.includes(skill) || profileSkills.includes(skill),
    );
    const missing = requiredSkills.filter((skill) => !matched.includes(skill));
    const matchScore =
      requiredSkills.length === 0
        ? 65
        : Math.round((matched.length / requiredSkills.length) * 100);

    let recommendation: AiMatchRecommendation = AiMatchRecommendation.WEAK_MATCH;
    if (matchScore >= 75) recommendation = AiMatchRecommendation.STRONG_MATCH;
    else if (matchScore >= 50) recommendation = AiMatchRecommendation.POTENTIAL_MATCH;

    return {
      matchScore,
      strengths: matched.length ? matched : ['Relevant background detected in CV text'],
      missingSkills: missing,
      experienceMatch:
        typeof input.candidateProfile.experienceYears === 'number'
          ? `${input.candidateProfile.experienceYears} years listed in profile`
          : 'Experience not clearly structured in parsed CV',
      educationMatch: Array.isArray(input.candidateProfile.education)
        ? 'Education section parsed from CV'
        : 'Education details limited in parsed CV',
      reasoningSummary:
        'Mock provider scored keyword overlap between job skills and parsed CV/profile. Human review is required before decisions.',
      recommendation,
    };
  }
}
