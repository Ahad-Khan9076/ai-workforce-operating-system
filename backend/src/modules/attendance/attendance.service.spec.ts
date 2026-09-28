import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AttendanceService } from './attendance.service.js';

describe('AttendanceService clock rules', () => {
  let service: AttendanceService;
  const prisma = {
    organization: { findUnique: vi.fn() },
    attendanceRecord: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    attendanceBreak: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  };
  const scope = {
    getEmployeeForUser: vi.fn(),
    getAccessibleEmployeeFilter: vi.fn(),
    assertCanAccessEmployee: vi.fn(),
  };
  const calculation = { calculate: vi.fn() };
  const shifts = { getActiveShift: vi.fn() };

  const user = {
    userId: 'u1',
    email: 'a@b.com',
    organizationId: 'org-1',
    permissions: ['attendance.read'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.organization.findUnique.mockResolvedValue({ timezone: 'UTC' });
    scope.getEmployeeForUser.mockResolvedValue({ id: 'emp-1' });
    service = new AttendanceService(
      prisma as never,
      scope as never,
      calculation as never,
      shifts as never,
    );
  });

  it('prevents duplicate clock in', async () => {
    prisma.attendanceRecord.findUnique.mockResolvedValue({
      id: 'rec-1',
      clockInAt: new Date(),
      clockOutAt: null,
    });
    prisma.attendanceBreak.findFirst.mockResolvedValue(null);

    await expect(service.clockIn(user as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('prevents clock out before clock in', async () => {
    prisma.attendanceRecord.findFirst.mockResolvedValue(null);
    await expect(service.clockOut(user as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
