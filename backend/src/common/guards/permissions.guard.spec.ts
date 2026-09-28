import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, it, expect, vi } from 'vitest';
import { PermissionsGuard } from './permissions.guard.js';
import { PERMISSIONS } from '../constants/permissions.js';

describe('PermissionsGuard', () => {
  it('denies when required permission is missing', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([PERMISSIONS.MEMBER_INVITE]),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    const context = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            userId: 'u1',
            email: 'a@test.com',
            permissions: [PERMISSIONS.MEMBER_READ],
          },
        }),
      }),
    };

    expect(() => guard.canActivate(context as never)).toThrow(ForbiddenException);
  });

  it('allows when permission is present', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([PERMISSIONS.MEMBER_READ]),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    const context = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            userId: 'u1',
            email: 'a@test.com',
            permissions: [PERMISSIONS.MEMBER_READ],
          },
        }),
      }),
    };

    expect(guard.canActivate(context as never)).toBe(true);
  });
});
