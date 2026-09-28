import type { Response } from 'express';
import type { ConfigService } from '@nestjs/config';

export function setRefreshTokenCookie(
  res: Response,
  configService: ConfigService,
  token: string,
) {
  const name = configService.get<string>('auth.refreshCookieName') ?? 'refresh_token';
  const days = configService.get<number>('auth.refreshTtlDays') ?? 7;
  const isProd = configService.get<string>('nodeEnv') === 'production';

  res.cookie(name, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: days * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshTokenCookie(
  res: Response,
  configService: ConfigService,
) {
  const name = configService.get<string>('auth.refreshCookieName') ?? 'refresh_token';
  res.clearCookie(name, { path: '/api/v1/auth' });
}

export function getRefreshTokenFromRequest(
  req: { cookies?: Record<string, string>; body?: { refreshToken?: string } },
  cookieName: string,
): string | undefined {
  return req.cookies?.[cookieName] ?? req.body?.refreshToken;
}
