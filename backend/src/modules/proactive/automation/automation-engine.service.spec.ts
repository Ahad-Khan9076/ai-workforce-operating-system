import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutomationActorType } from '@prisma/client';
import { AutomationEngineService } from './automation-engine.service.js';

describe('AutomationEngineService', () => {
  const prisma = {
    automationRule: { upsert: vi.fn(), findMany: vi.fn() },
    automationAuditLog: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    employee: { findFirst: vi.fn() },
    organizationMember: { findMany: vi.fn() },
  };
  const notifications = { sendInApp: vi.fn() };

  let service: AutomationEngineService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.automationRule.upsert.mockResolvedValue({});
    prisma.automationRule.findMany.mockResolvedValue([
      {
        id: 'r1',
        code: 'LEAVE_SUBMITTED_NOTIFY_MANAGER',
        actionType: 'NOTIFY_MANAGER',
        enabled: true,
      },
    ]);
    prisma.automationAuditLog.findFirst.mockResolvedValue(null);
    prisma.automationAuditLog.findMany.mockResolvedValue([]);
    prisma.employee.findFirst.mockResolvedValue({
      id: 'emp-1',
      manager: {
        membership: { userId: 'mgr-user', user: { email: 'mgr@test.com' } },
      },
    });
    notifications.sendInApp.mockResolvedValue({ id: 'n1' });
    service = new AutomationEngineService(prisma as never, notifications as never);
  });

  it('logs automation audit with actor SYSTEM', async () => {
    await service.handleEvent(
      'org-1',
      'LEAVE_SUBMITTED',
      { employeeId: 'emp-1', requestId: 'lr-1', title: 't', body: 'b' },
      { type: AutomationActorType.SYSTEM },
    );
    expect(prisma.automationAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-1',
          actorType: AutomationActorType.SYSTEM,
          ruleCode: 'LEAVE_SUBMITTED_NOTIFY_MANAGER',
        }),
      }),
    );
  });

  it('skips duplicate automation within window', async () => {
    prisma.automationAuditLog.findFirst.mockResolvedValue({ id: 'dup' });
    await service.handleEvent(
      'org-1',
      'LEAVE_SUBMITTED',
      { employeeId: 'emp-1' },
      { type: AutomationActorType.SYSTEM },
    );
    expect(notifications.sendInApp).not.toHaveBeenCalled();
  });
});
