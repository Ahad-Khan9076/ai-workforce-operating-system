import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PerformanceService } from './performance.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireOrganization } from '../../common/decorators/require-organization.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';

@Controller('performance')
@RequireOrganization()
export class PerformanceController {
  constructor(private readonly performance: PerformanceService) {}

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.PERFORMANCE_READ)
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.performance.getDashboard(user.organizationId!);
  }

  @Get('cycles')
  @RequirePermissions(PERMISSIONS.PERFORMANCE_READ)
  cycles(@CurrentUser() user: AuthenticatedUser) {
    return this.performance.listCycles(user.organizationId!);
  }

  @Post('cycles')
  @RequirePermissions(PERMISSIONS.PERFORMANCE_MANAGE)
  createCycle(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { name: string; startDate: string; endDate: string },
  ) {
    return this.performance.createCycle(user.organizationId!, body);
  }

  @Post('cycles/:cycleId/activate')
  @RequirePermissions(PERMISSIONS.PERFORMANCE_MANAGE)
  activate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cycleId') cycleId: string,
  ) {
    return this.performance.activateCycle(user.organizationId!, cycleId);
  }

  @Post('goals')
  @RequirePermissions(PERMISSIONS.PERFORMANCE_MANAGE)
  createGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      cycleId: string;
      employeeId: string;
      title: string;
      description?: string;
      target?: string;
      weight?: number;
      dueDate?: string;
    },
  ) {
    return this.performance.createGoal(user.organizationId!, body);
  }

  @Patch('goals/:goalId/progress')
  @RequirePermissions(PERMISSIONS.PERFORMANCE_MANAGE)
  progress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('goalId') goalId: string,
    @Body('progressPercent') progressPercent: number,
  ) {
    return this.performance.updateGoalProgress(
      user.organizationId!,
      goalId,
      progressPercent,
    );
  }

  @Post('cycles/:cycleId/start-reviews')
  @RequirePermissions(PERMISSIONS.PERFORMANCE_MANAGE)
  startReviews(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cycleId') cycleId: string,
  ) {
    return this.performance.startReviewCycle(user.organizationId!, cycleId);
  }

  @Post('reviews/:reviewId/manager')
  @RequirePermissions(PERMISSIONS.PERFORMANCE_MANAGE)
  managerReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reviewId') reviewId: string,
    @Body('summary') summary: string,
  ) {
    return this.performance.submitManagerReview(user.organizationId!, reviewId, summary);
  }

  @Post('reviews/:reviewId/acknowledge')
  @RequirePermissions(PERMISSIONS.PERFORMANCE_READ)
  ack(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reviewId') reviewId: string,
    @Body('note') note?: string,
  ) {
    return this.performance.acknowledgeReview(user.organizationId!, reviewId, note);
  }

  @Post('reviews/:reviewId/finalize')
  @RequirePermissions(PERMISSIONS.PERFORMANCE_MANAGE)
  finalizeReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reviewId') reviewId: string,
  ) {
    return this.performance.finalizeReview(user.organizationId!, reviewId);
  }

  @Post('cycles/:cycleId/finalize')
  @RequirePermissions(PERMISSIONS.PERFORMANCE_MANAGE)
  finalizeCycle(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cycleId') cycleId: string,
  ) {
    return this.performance.finalizeCycle(user.organizationId!, cycleId);
  }
}
