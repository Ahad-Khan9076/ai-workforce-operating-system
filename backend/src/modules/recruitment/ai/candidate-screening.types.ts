import { AiMatchRecommendation } from '@prisma/client';

export const AI_SCREENING_PROMPT_VERSION = 'recruitment-screening-v1';
export const AI_EVALUATION_VERSION = 'v1';

export interface CandidateScreeningInput {
  jobRequirements: string;
  jobSkills: string[];
  candidateProfile: Record<string, unknown>;
  cvText: string;
}

export interface CandidateScreeningResult {
  matchScore: number;
  strengths: string[];
  missingSkills: string[];
  experienceMatch: string;
  educationMatch: string;
  reasoningSummary: string;
  recommendation: AiMatchRecommendation;
}

export function validateCandidateScreeningResult(
  value: unknown,
): value is CandidateScreeningResult {
  if (!value || typeof value !== 'object') return false;
  const v = value as CandidateScreeningResult;
  return (
    typeof v.matchScore === 'number' &&
    v.matchScore >= 0 &&
    v.matchScore <= 100 &&
    Array.isArray(v.strengths) &&
    Array.isArray(v.missingSkills) &&
    typeof v.reasoningSummary === 'string' &&
    Object.values(AiMatchRecommendation).includes(v.recommendation)
  );
}
