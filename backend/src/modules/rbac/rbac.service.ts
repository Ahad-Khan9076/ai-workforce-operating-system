import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { PermissionCode } from '../../common/constants/permissions.js';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async getPermissionsForRole(roleId: string): Promise<PermissionCode[]> {
    const rows = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });
    return rows.map((row) => row.permission.code as PermissionCode);
  }

  async getRoleByCode(code: string) {
    return this.prisma.role.findUnique({ where: { code } });
  }

  listRoles() {
    return this.prisma.role.findMany({
      orderBy: { code: 'asc' },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  }

  listPermissions() {
    return this.prisma.permission.findMany({ orderBy: { code: 'asc' } });
  }
}
