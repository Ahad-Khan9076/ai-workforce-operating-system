import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

export type OrganizationSettingsPayload = {
  notifications?: Record<string, unknown>;
  ai?: Record<string, unknown>;
  integrations?: Record<string, unknown>;
  security?: Record<string, unknown>;
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getOrganizationSettings(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, settings: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org.settings ?? {};
  }

  async patchOrganizationSettings(
    organizationId: string,
    actorUserId: string,
    patch: OrganizationSettingsPayload,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const current = (org.settings ?? {}) as Record<string, unknown>;
    const merged = {
      ...current,
      ...patch,
    };

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { settings: merged as Prisma.InputJsonValue },
    });

    await this.audit.log({
      organizationId,
      actorUserId,
      action: 'settings.organization.updated',
      resourceType: 'organization',
      resourceId: organizationId,
      metadata: { keys: Object.keys(patch) },
    });

    return merged;
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        emailVerifiedAt: true,
      },
    });
  }
}
