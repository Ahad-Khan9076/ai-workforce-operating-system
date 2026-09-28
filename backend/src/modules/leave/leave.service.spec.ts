import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeaveRequestStatus } from '@prisma/client';
import { LeaveService } from './leave.service.js';

describe('LeaveService balance workflow', () => {
  let service: LeaveService;
  const prisma = {
    leaveType: { upsert: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
    leavePolicy: { upsert: vi.fn() },
    leaveBalance: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    leaveRequest: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) =>
      fn({
        leaveRequest: {
          create: prisma.leaveRequest.create,
          update: prisma.leaveRequest.update,
        },
        leaveBalance: { update: prisma.leaveBalance.update },
      }),
    ),
  };
  const scope = {
    getEmployeeForUser: vi.fn(),
    assertCanAccessEmployee: vi.fn(),
    getAccessibleEmployeeFilter: vi.fn(),
  };
  const attendance = { markOnLeaveForRange: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LeaveService(
      prisma as never,
      scope as never,
      attendance as never,
    );
    prisma.leaveType.upsert.mockImplementation(async ({ create }) => ({
      id: `type-${create.code}`,
      ...create,
    }));
    prisma.leavePolicy.upsert.mockResolvedValue({});
    prisma.leaveType.findMany.mockResolvedValue([]);
  });

  it('releases pending balance on rejection', async () => {
    const request = {
      id: 'req-1',
      employeeId: 'emp-1',
      leaveTypeId: 'type-ANNUAL',
      totalDays: 2,
      startDate: new Date('2025-10-01T00:00:00.000Z'),
      status: LeaveRequestStatus.PENDING,
      leaveType: { isPaid: true },
    };
    prisma.leaveRequest.findFirst.mockResolvedValue(request);
    prisma.leaveRequest.update.mockResolvedValue({
      ...request,
      status: LeaveRequestStatus.REJECTED,
    });

    await service.rejectRequest(
      {
        userId: 'mgr',
        permissions: ['leave.approve'],
        organizationId: 'org-1',
      } as never,
      'req-1',
    );

    expect(prisma.leaveBalance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { pending: { decrement: 2 } },
      }),
    );
  });
});
