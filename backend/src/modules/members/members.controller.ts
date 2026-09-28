import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { MembersService } from './members.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireOrganization } from '../../common/decorators/require-organization.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @RequireOrganization()
  @RequirePermissions(PERMISSIONS.MEMBER_READ)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.list(user.organizationId!);
  }

  @Patch(':memberId/role')
  @RequireOrganization()
  @RequirePermissions(PERMISSIONS.MEMBER_UPDATE)
  updateRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.membersService.updateRole(
      user.organizationId!,
      memberId,
      dto.roleId,
      user.userId,
    );
  }

  @Delete(':memberId')
  @RequireOrganization()
  @RequirePermissions(PERMISSIONS.MEMBER_REMOVE)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
  ) {
    return this.membersService.remove(
      user.organizationId!,
      memberId,
      user.userId,
    );
  }
}
