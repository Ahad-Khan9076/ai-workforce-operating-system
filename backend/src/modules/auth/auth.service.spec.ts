import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';
import { RefreshTokenService } from './refresh-token.service.js';
import { AuthTokenService } from './auth-token.service.js';
import { RbacService } from '../rbac/rbac.service.js';
import { MailService } from '../notifications/mail.service.js';

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    organizationMember: {
      findUnique: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService(
      prisma as never,
      { sign: vi.fn().mockReturnValue('access-token') } as unknown as JwtService,
      {
        get: vi.fn((key: string) => {
          if (key === 'appUrl') return 'http://localhost:5173';
          if (key === 'auth.accessTtlSeconds') return 900;
          return undefined;
        }),
      } as unknown as ConfigService,
      {
        issue: vi.fn().mockResolvedValue({ token: 'refresh', userId: 'u1' }),
        rotate: vi.fn(),
        revoke: vi.fn(),
        revokeAllForUser: vi.fn(),
      } as unknown as RefreshTokenService,
      {
        create: vi.fn().mockResolvedValue({ token: 'verify-token' }),
        consume: vi.fn(),
      } as unknown as AuthTokenService,
      {
        getPermissionsForRole: vi.fn().mockResolvedValue(['organization.read']),
      } as unknown as RbacService,
      { send: vi.fn() } as unknown as MailService,
    );
  });

  it('rejects duplicate registration', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: '1' });
    await expect(
      service.register({
        email: 'a@test.com',
        password: 'password1',
        firstName: 'A',
        lastName: 'B',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects invalid login', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ email: 'a@test.com', password: 'password1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
