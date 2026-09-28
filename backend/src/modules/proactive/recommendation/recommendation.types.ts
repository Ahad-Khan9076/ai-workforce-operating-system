import type {
  RecommendationPriority,
  RecommendationType,
} from '@prisma/client';

export interface DetectedRecommendation {
  ruleCode: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  whatHappened: string;
  evidence: Record<string, unknown>;
  whyItMatters: string;
  recommendedAction: string;
  confidenceScore: number;
  confidenceNote: string;
  dedupeKey: string;
  departmentId?: string;
}

export interface RecommendationRuleEvaluator {
  code: string;
  type: RecommendationType;
  name: string;
  description: string;
  evaluate(organizationId: string, now: Date): Promise<DetectedRecommendation[]>;
}
