import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkforceRiskCategory, WorkforceRiskSeverity } from '@prisma/client';
import { RiskEngineService } from './risk-engine.service.js';
import type { WorkforceRiskRule } from './risk-rule.types.js';

describe('RiskEngineService', () => {
  const prisma = {
    workforceRisk: {
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    employee: {
      count: vi.fn(),
    },
  };

  let service: RiskEngineService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RiskEngineService(prisma as never);
    const mockRule: WorkforceRiskRule = {
      code: 'TEST_RULE',
      description: 'test',
      detect: vi.fn().mockResolvedValue([
        {
          category: WorkforceRiskCategory.TRAINING,
          severity: WorkforceRiskSeverity.HIGH,
          title: 'Test',
          summary: 'Rule TEST_RULE: evidence based summary',
          ruleCode: 'TEST_RULE',
          evidence: { foo: 1 },
          employeeId: 'emp-1',
        },
      ]),
    };
    (service as unknown as { rules: WorkforceRiskRule[] }).rules = [mockRule];
  });

  it('creates risk with rule evidence in summary', async () => {
    prisma.workforceRisk.findFirst.mockResolvedValue(null);
    prisma.workforceRisk.create.mockResolvedValue({});
    prisma.workforceRisk.deleteMany.mockResolvedValue({ count: 0 });

    const detected = await service.runDetection('org-1');
    expect(detected[0]?.summary).toContain('TEST_RULE');
    await service.syncRisks('org-1');
    expect(prisma.workforceRisk.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-1',
          ruleCode: 'TEST_RULE',
        }),
      }),
    );
  });

  it('scopes risks to employee filter', async () => {
    prisma.employee.count.mockResolvedValue(0);
    prisma.workforceRisk.deleteMany.mockResolvedValue({ count: 0 });
    await service.syncRisks('org-1', { id: 'emp-2' });
    expect(prisma.workforceRisk.create).not.toHaveBeenCalled();
  });
});
