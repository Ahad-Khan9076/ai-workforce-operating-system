import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecommendationActionStatus } from '@prisma/client';
import { ActionCenterService } from './action-center.service.js';

describe('ActionCenterService tenant isolation', () => {
  const prisma = {
    recommendationAction: { findFirst: vi.fn(), update: vi.fn() },
    recommendation: { update: vi.fn() },
  };

  let service: ActionCenterService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ActionCenterService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('scopes dismiss to organization', async () => {
    prisma.recommendationAction.findFirst.mockResolvedValue(null);
    await expect(
      service.dismissAction(
        { userId: 'u1', organizationId: 'org-a', permissions: [] } as never,
        'act-1',
      ),
    ).rejects.toThrow('Action not found');
    expect(prisma.recommendationAction.findFirst).toHaveBeenCalledWith({
      where: { id: 'act-1', organizationId: 'org-a' },
    });
  });

  it('approves pending action in tenant', async () => {
    prisma.recommendationAction.findFirst.mockResolvedValue({
      id: 'act-1',
      organizationId: 'org-a',
      recommendationId: 'rec-1',
      status: RecommendationActionStatus.PENDING,
      recommendation: {
        ruleCode: 'DEPT_OVERTIME_INCREASE',
        recommendedAction: 'Review',
        evidence: {},
        title: 'Overtime',
      },
    });
    prisma.recommendationAction.update.mockResolvedValue({});
    prisma.recommendation.update.mockResolvedValue({});
    const result = await service.approveAction(
      { userId: 'u1', organizationId: 'org-a', permissions: [] } as never,
      'act-1',
    );
    expect(result.ok).toBe(true);
  });
});
