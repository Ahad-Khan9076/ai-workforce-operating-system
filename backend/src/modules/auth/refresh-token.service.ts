import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';
import { generateSecureToken, hashToken } from '../../common/utils/crypto.util.js';

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async issue(userId: string, familyId?: string) {
    const token = generateSecureToken(48);
    const tokenHash = hashToken(token);
    const family = familyId ?? generateSecureToken(16);
    const days = this.configService.get<number>('auth.refreshTtlDays') ?? 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        familyId: family,
        expiresAt,
      },
    });

    return { token, familyId: family, expiresAt, userId };
  }

  async rotate(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      if (existing?.familyId) {
        await this.revokeFamily(existing.familyId);
      }
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const issued = await this.issue(existing.userId, existing.familyId);
    return { ...issued, userId: existing.userId };
  }

  async revoke(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!existing) {
      return;
    }
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeFamily(familyId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
