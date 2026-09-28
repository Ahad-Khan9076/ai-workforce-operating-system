import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { RbacService } from '../rbac/rbac.service.js';
import { ROLE_CODES } from '../../common/constants/permissions.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateOrganizationDto } from './dto/create-organization.dto.js';
import { UpdateOrganizationDto } from './dto/update-organization.dto.js';
import { AuthService } from '../auth/auth.service.js';
import { BillingService } from '../billing/billing.service.js';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
    private readonly billingService: BillingService,
  ) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    const ownerRole = await this.rbacService.getRoleByCode(ROLE_CODES.OWNER);
    if (!ownerRole) {
      throw new ConflictException('System roles are not seeded');
    }

    const baseSlug = slugify(dto.name) || 'organization';
    let slug = baseSlug;
    let suffix = 1;
    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const organization = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.name,
          legalName: dto.legalName,
          slug,
          logoUrl: dto.logoUrl,
          website: dto.website,
          industry: dto.industry,
          companySize: dto.companySize,
          country: dto.country,
          timezone: dto.timezone ?? 'UTC',
          currency: dto.currency ?? 'USD',
          primaryContact: dto.primaryContact,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId,
          roleId: ownerRole.id,
        },
      });

      return org;
    });

    await this.auditService.log({
      organizationId: organization.id,
      actorUserId: userId,
      action: 'organization.created',
      resourceType: 'organization',
      resourceId: organization.id,
    });

    await this.billingService.assignFreePlan(organization.id);

    return this.authService.selectOrganization(userId, organization.id);
  }

  async getById(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  async update(organizationId: string, userId: string, dto: UpdateOrganizationDto) {
    const org = await this.prisma.organization.update({
      where: { id: organizationId },
      data: dto,
    });

    await this.auditService.log({
      organizationId,
      actorUserId: userId,
      action: 'organization.updated',
      resourceType: 'organization',
      resourceId: organizationId,
      metadata: dto as Record<string, unknown>,
    });

    return org;
  }
}
