import { Body, Controller, Get, Patch } from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireOrganization } from '../../common/decorators/require-organization.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { PatchOrganizationSettingsDto } from './dto/settings.dto.js';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('profile')
  profile(@CurrentUser() user: AuthenticatedUser) {
    return this.settings.getProfile(user.userId);
  }

  @Get('organization')
  @RequireOrganization()
  @RequirePermissions(PERMISSIONS.ORGANIZATION_READ)
  organization(@CurrentUser() user: AuthenticatedUser) {
    return this.settings.getOrganizationSettings(user.organizationId!);
  }

  @Patch('organization')
  @RequireOrganization()
  @RequirePermissions(PERMISSIONS.SETTINGS_MANAGE)
  patchOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PatchOrganizationSettingsDto,
  ) {
    return this.settings.patchOrganizationSettings(
      user.organizationId!,
      user.userId,
      dto,
    );
  }
}
