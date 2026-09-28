import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { NotificationService } from './notification.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireOrganization } from '../../common/decorators/require-organization.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';

@Controller('notifications')
@RequireOrganization()
export class NotificationsController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ORGANIZATION_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notifications.listForUser(
      user.organizationId!,
      user.userId,
      unreadOnly === 'true',
    );
  }

  @Patch(':id/read')
  @RequirePermissions(PERMISSIONS.ORGANIZATION_READ)
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notifications.markRead(user.organizationId!, user.userId, id);
  }
}
