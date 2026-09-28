import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { OnboardingTaskStatus } from '@prisma/client';
import { OnboardingService } from './onboarding.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireOrganization } from '../../common/decorators/require-organization.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';

@Controller('onboarding')
@RequireOrganization()
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get('templates')
  @RequirePermissions(PERMISSIONS.TRAINING_READ)
  templates(@CurrentUser() user: AuthenticatedUser) {
    return this.onboarding.listTemplates(user.organizationId!);
  }

  @Get('plans/:planId')
  @RequirePermissions(PERMISSIONS.TRAINING_READ)
  plan(@CurrentUser() user: AuthenticatedUser, @Param('planId') planId: string) {
    return this.onboarding.getPlan(user.organizationId!, planId);
  }

  @Patch('tasks/:taskId')
  @RequirePermissions(PERMISSIONS.TRAINING_MANAGE)
  updateTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Body('status') status: OnboardingTaskStatus,
  ) {
    return this.onboarding.updateTaskStatus(user.organizationId!, taskId, status);
  }
}
