import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_ORGANIZATION_KEY } from '../decorators/require-organization.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';
import { RbacService } from '../../modules/rbac/rbac.service.js';

@Injectable()
export class OrganizationContextGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requireOrg = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_ORGANIZATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      return true;
    }

    if (!user.organizationId) {
      if (requireOrg) {
        throw new ForbiddenException('Organization context is required');
      }
      return true;
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: user.organizationId,
          userId: user.userId,
        },
      },
      include: { role: true },
    });

    if (!membership) {
      throw new UnauthorizedException('Organization membership not found');
    }

    const permissions = await this.rbacService.getPermissionsForRole(
      membership.roleId,
    );

    user.membershipId = membership.id;
    user.roleId = membership.roleId;
    user.roleCode = membership.role.code;
    user.permissions = permissions;

    return true;
  }
}
