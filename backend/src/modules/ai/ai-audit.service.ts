import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class AiAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: {
    organizationId: string;
    conversationId?: string;
    userId?: string;
    toolCode?: string;
    actionType: string;
    success: boolean;
    metadata?: Record<string, unknown>;
  }) {
    const safeMeta = input.metadata ? { ...input.metadata } : undefined;
    if (safeMeta) {
      delete safeMeta.password;
      delete safeMeta.token;
      delete safeMeta.salary;
    }
    return this.prisma.aiAuditLog.create({
      data: {
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        userId: input.userId,
        toolCode: input.toolCode,
        actionType: input.actionType,
        success: input.success,
        metadata: safeMeta as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
