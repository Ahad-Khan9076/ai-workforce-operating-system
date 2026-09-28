import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CopilotToolExecutor } from './copilot-tool.executor.js';
import { ROLE_CODES } from '../../../common/constants/permissions.js';
import { PERMISSIONS } from '../../../common/constants/permissions.js';

describe('CopilotToolExecutor permissions', () => {
  let executor: CopilotToolExecutor;

  beforeEach(() => {
    executor = new CopilotToolExecutor(
      {} as never,
      {} as never,
      { log: vi.fn() } as never,
      { log: vi.fn() } as never,
    );
  });

  it('denies payroll tool without permission', () => {
    expect(() =>
      executor.assertToolAccess(
        {
          userId: 'u1',
          organizationId: 'org1',
          permissions: [PERMISSIONS.EMPLOYEE_READ],
          roleCode: ROLE_CODES.EMPLOYEE,
        } as never,
        'get_payroll_summary',
      ),
    ).toThrow('Missing permission');
  });

  it('allows headcount with employee read', () => {
    const meta = executor.assertToolAccess(
      {
        userId: 'u1',
        organizationId: 'org1',
        permissions: [PERMISSIONS.EMPLOYEE_READ],
        roleCode: ROLE_CODES.HR_MANAGER,
      } as never,
      'get_headcount',
    );
    expect(meta.code).toBe('get_headcount');
  });
});
