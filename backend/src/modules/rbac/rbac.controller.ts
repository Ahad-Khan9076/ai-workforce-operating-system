import { Controller, Get } from '@nestjs/common';
import { RbacService } from './rbac.service.js';
import { RequireOrganization } from '../../common/decorators/require-organization.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.js';

@Controller('roles')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get()
  @RequireOrganization()
  @RequirePermissions(PERMISSIONS.SETTINGS_MANAGE)
  listRoles() {
    return this.rbacService.listRoles().then((roles) =>
      roles.map((role) => ({
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
        permissions: role.permissions.map((rp) => rp.permission.code),
      })),
    );
  }

  @Get('permissions')
  @RequireOrganization()
  @RequirePermissions(PERMISSIONS.SETTINGS_MANAGE)
  listPermissions() {
    return this.rbacService.listPermissions();
  }

  @Get('assignable')
  @RequireOrganization()
  @RequirePermissions(PERMISSIONS.MEMBER_INVITE)
  listAssignable() {
    return this.rbacService.listRoles().then((roles) =>
      roles
        .filter((role) => role.code !== 'OWNER')
        .map((role) => ({
          id: role.id,
          code: role.code,
          name: role.name,
        })),
    );
  }
}
