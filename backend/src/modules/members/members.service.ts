import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { ROLE_CODES } from '../../common/constants/permissions.js';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            emailVerifiedAt: true,
          },
        },
        role: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateRole(
    organizationId: string,
    memberId: string,
    roleId: string,
    actorUserId: string,
  ) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId },
      include: { role: true },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role.code === ROLE_CODES.OWNER) {
      throw new ForbiddenException('Cannot change the organization owner role');
    }

    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.code === ROLE_CODES.OWNER) {
      throw new ForbiddenException('Cannot assign owner role via member update');
    }

    const updated = await this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { roleId },
      include: { user: true, role: true },
    });

    await this.auditService.log({
      organizationId,
      actorUserId,
      action: 'member.role_updated',
      resourceType: 'organization_member',
      resourceId: memberId,
      metadata: { roleId, roleCode: role.code },
    });

    return updated;
  }

  async remove(
    organizationId: string,
    memberId: string,
    actorUserId: string,
  ) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId },
      include: { role: true },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    if (member.role.code === ROLE_CODES.OWNER) {
      throw new ForbiddenException('Cannot remove the organization owner');
    }
    if (member.userId === actorUserId) {
      throw new ForbiddenException('Cannot remove yourself');
    }

    await this.prisma.organizationMember.delete({ where: { id: memberId } });

    await this.auditService.log({
      organizationId,
      actorUserId,
      action: 'member.removed',
      resourceType: 'organization_member',
      resourceId: memberId,
    });

    return { message: 'Member removed' };
  }
}
