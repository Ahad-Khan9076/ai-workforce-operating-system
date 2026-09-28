import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntelligenceService } from './intelligence.service.js';
import { ROLE_CODES } from '../../common/constants/permissions.js';

describe('IntelligenceService manager visibility', () => {
  const prisma = {
    workforceRisk: { findMany: vi.fn() },
    employee: { findMany: vi.fn() },
  };
  const employeeScope = {
    hasOrgWideWorkforceAccess: vi.fn(),
    getAccessibleEmployeeFilter: vi.fn(),
    assertCanAccessEmployee: vi.fn(),
  };
  const riskEngine = { syncRisks: vi.fn(), listRuleDefinitions: vi.fn() };
  const talentMatching = { findCandidatesForProfile: vi.fn() };
  const insightsService = { listInsights: vi.fn(), refreshInsights: vi.fn() };
  const dashboardService = { getDashboard: vi.fn() };

  let service: IntelligenceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new IntelligenceService(
      prisma as never,
      employeeScope as never,
      riskEngine as never,
      talentMatching as never,
      insightsService as never,
      dashboardService as never,
    );
  });

  it('lists risks only for accessible employees', async () => {
    employeeScope.hasOrgWideWorkforceAccess.mockReturnValue(false);
    employeeScope.getAccessibleEmployeeFilter.mockResolvedValue({
      organizationId: 'org-1',
      OR: [{ id: 'mgr' }, { managerId: 'mgr' }],
    });
    prisma.employee.findMany.mockResolvedValue([
      { id: 'rep-1', departmentId: 'dept-1' },
    ]);
    prisma.workforceRisk.findMany.mockResolvedValue([]);

    await service.listRisks({
      userId: 'u1',
      organizationId: 'org-1',
      roleCode: ROLE_CODES.DEPARTMENT_MANAGER,
      permissions: [],
    } as never);

    expect(prisma.workforceRisk.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          OR: expect.any(Array),
        }),
      }),
    );
  });
});
