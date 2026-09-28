import { Injectable, BadRequestException } from '@nestjs/common';
import { AuthTokenType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { generateSecureToken, hashToken } from '../../common/utils/crypto.util.js';

@Injectable()
export class AuthTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, type: AuthTokenType, ttlHours: number) {
    const token = generateSecureToken(48);
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    await this.prisma.authToken.create({
      data: { userId, type, tokenHash, expiresAt },
    });

    return { token, expiresAt };
  }

  async consume(token: string, type: AuthTokenType) {
    const tokenHash = hashToken(token);
    const record = await this.prisma.authToken.findUnique({
      where: { tokenHash },
    });

    if (
      !record ||
      record.type !== type ||
      record.usedAt ||
      record.expiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired token');
    }

    await this.prisma.authToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    return record;
  }
}
