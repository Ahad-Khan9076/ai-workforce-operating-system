import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireOrganization } from '../../common/decorators/require-organization.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';

@Controller('analytics')
@RequireOrganization()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('workforce-dashboard')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  workforceDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.getWorkforceDashboard(user.organizationId!);
  }
}
