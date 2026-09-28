import { Body, Controller, Get, Post } from '@nestjs/common';
import { BillingService } from './billing.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireOrganization } from '../../common/decorators/require-organization.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { StartCheckoutDto } from './dto/billing.dto.js';

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Public()
  @Get('plans')
  async plans() {
    await this.billing.ensurePlansSeeded();
    return this.billing.listPlans();
  }

  @Get('subscription')
  @RequireOrganization()
  @RequirePermissions(PERMISSIONS.BILLING_READ)
  subscription(@CurrentUser() user: AuthenticatedUser) {
    return this.billing.getSubscription(user.organizationId!);
  }

  @Get('usage')
  @RequireOrganization()
  @RequirePermissions(PERMISSIONS.BILLING_READ)
  usage(@CurrentUser() user: AuthenticatedUser) {
    return this.billing.recordUsageSnapshot(user.organizationId!);
  }

  @Get('invoices')
  @RequireOrganization()
  @RequirePermissions(PERMISSIONS.BILLING_READ)
  invoices(@CurrentUser() user: AuthenticatedUser) {
    return this.billing.listInvoices(user.organizationId!);
  }

  @Post('checkout')
  @RequireOrganization()
  @RequirePermissions(PERMISSIONS.BILLING_MANAGE)
  checkout(@CurrentUser() user: AuthenticatedUser, @Body() dto: StartCheckoutDto) {
    return this.billing.startCheckout(
      user.organizationId!,
      dto.planCode,
      user.userId,
      dto.successUrl,
      dto.cancelUrl,
    );
  }
}
