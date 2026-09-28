import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecommendationEngineService } from './recommendation-engine.service.js';

describe('RecommendationEngineService', () => {
  const prisma = {
    recommendationRule: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    recommendation: { upsert: vi.fn(), findFirst: vi.fn() },
    recommendationAction: { findFirst: vi.fn(), create: vi.fn() },
    attendanceRecord: { findMany: vi.fn().mockResolvedValue([]) },
    employeeEnrollment: { count: vi.fn().mockResolvedValue(14) },
    skillGap: { findMany: vi.fn().mockResolvedValue([]) },
    recruitmentJob: { findMany: vi.fn().mockResolvedValue([]) },
    aiCandidateEvaluation: { count: vi.fn() },
    trainingCertificate: { count: vi.fn().mockResolvedValue(0) },
  };

  let service: RecommendationEngineService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.recommendationRule.findFirst.mockResolvedValue(null);
    prisma.recommendationRule.create.mockResolvedValue({ id: 'rule-1' });
    prisma.recommendation.upsert.mockResolvedValue({
      id: 'rec-1',
      status: 'OPEN',
      title: 'test',
      ruleCode: 'TRAINING_OVERDUE_BULK',
    });
    prisma.recommendationAction.findFirst.mockResolvedValue(null);
    service = new RecommendationEngineService(prisma as never);
  });

  it('dedupes recommendations by organizationId + ruleCode + dedupeKey', async () => {
    await service.sync('org-1');
    expect(prisma.recommendation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_ruleCode_dedupeKey: expect.objectContaining({
            organizationId: 'org-1',
            ruleCode: 'TRAINING_OVERDUE_BULK',
          }),
        },
      }),
    );
  });

  it('evaluates training overdue with evidence count', async () => {
    const detected = await service.evaluate('org-1');
    const training = detected.find((d) => d.ruleCode === 'TRAINING_OVERDUE_BULK');
    expect(training?.evidence).toMatchObject({ overdueEnrollmentCount: 14 });
    expect(training?.confidenceNote).toContain('Counts enrollments');
  });
});
