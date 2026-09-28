import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ActionCenterService } from './action-center.service.js';
import { RecommendationEngineService } from './recommendation/recommendation-engine.service.js';
import { AutomationEngineService } from './automation/automation-engine.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireOrganization } from '../../common/decorators/require-organization.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { RecommendationFeedbackDto, SetAutomationEnabledDto } from './dto/proactive.dto.js';

@Controller('intelligence')
@RequireOrganization()
export class ProactiveController {
  constructor(
    private readonly actionCenter: ActionCenterService,
    private readonly recommendationEngine: RecommendationEngineService,
    private readonly automation: AutomationEngineService,
  ) {}

  @Get('action-center')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  getActionCenter(@CurrentUser() user: AuthenticatedUser) {
    return this.actionCenter.getActionCenter(user);
  }

  @Post('recommendations/scan')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  async scanRecommendations(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.recommendationEngine.sync(user.organizationId!);
    return { synced: count };
  }

  @Get('recommendations/rules')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  recommendationRules() {
    return this.recommendationEngine.listRuleCatalog();
  }

  @Post('recommendations/actions/:actionId/approve')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  approveAction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('actionId') actionId: string,
  ) {
    return this.actionCenter.approveAction(user, actionId);
  }

  @Post('recommendations/actions/:actionId/dismiss')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  dismissAction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('actionId') actionId: string,
  ) {
    return this.actionCenter.dismissAction(user, actionId);
  }

  @Post('recommendations/:recommendationId/feedback')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  feedback(
    @CurrentUser() user: AuthenticatedUser,
    @Param('recommendationId') recommendationId: string,
    @Body() dto: RecommendationFeedbackDto,
  ) {
    return this.actionCenter.submitFeedback(
      user,
      recommendationId,
      dto.isHelpful,
      dto.comment,
    );
  }

  @Get('automations')
  @RequirePermissions(PERMISSIONS.SETTINGS_MANAGE)
  async automations(@CurrentUser() user: AuthenticatedUser) {
    await this.automation.ensureOrgAutomations(user.organizationId!);
    return this.automation.listRules(user.organizationId!);
  }

  @Patch('automations/:id')
  @RequirePermissions(PERMISSIONS.SETTINGS_MANAGE)
  setAutomation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetAutomationEnabledDto,
  ) {
    return this.automation.setEnabled(user.organizationId!, id, dto.enabled);
  }
}
