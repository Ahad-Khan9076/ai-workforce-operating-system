import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

export interface AuditLogInput {
  organizationId: string;
  actorUserId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }
}
