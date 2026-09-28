import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(parseInt(limit ?? '50', 10) || 50, 100);
    return this.prisma.auditLog.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
