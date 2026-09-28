import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecruitmentService } from './recruitment.service.js';

describe('RecruitmentService tenant isolation', () => {
  let service: RecruitmentService;
  const prisma = {
    recruitmentJob: { findFirst: vi.fn(), findMany: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RecruitmentService(
      prisma as never,
      { create: vi.fn() } as never,
      { process: vi.fn() } as never,
      { screen: vi.fn(), providerName: 'mock', modelName: 'mock' } as never,
      { sendTemplate: vi.fn() } as never,
      { createPlanForEmployee: vi.fn() } as never,
    );
  });

  it('scopes getJob to organization', async () => {
    prisma.recruitmentJob.findFirst.mockResolvedValue(null);
    await expect(service.getJob('org-a', 'job-1')).rejects.toThrow('Job not found');
    expect(prisma.recruitmentJob.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1', organizationId: 'org-a' },
      }),
    );
  });
});
