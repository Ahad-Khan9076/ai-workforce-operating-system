import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmployeesService } from './employees.service.js';
import { EmploymentStatus } from '@prisma/client';

describe('EmployeesService tenant isolation', () => {
  let service: EmployeesService;
  const prisma = {
    employee: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EmployeesService(
      prisma as never,
      { resolveFileUrl: vi.fn() } as never,
      { log: vi.fn() } as never,
    );
  });

  it('scopes getById to organization', async () => {
    prisma.employee.findFirst.mockResolvedValue(null);
    await expect(service.getById('org-a', 'emp-1')).rejects.toThrow('Employee not found');
    expect(prisma.employee.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'emp-1', organizationId: 'org-a' },
      }),
    );
  });

  it('scopes list queries to organization', async () => {
    prisma.employee.findMany.mockResolvedValue([]);
    prisma.employee.count.mockResolvedValue(0);
    await service.list('org-b', { status: EmploymentStatus.ACTIVE });
    expect(prisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-b',
          employmentStatus: EmploymentStatus.ACTIVE,
        }),
      }),
    );
  });
});
