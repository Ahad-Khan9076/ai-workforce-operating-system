import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import { UsageService } from './usage.service.js';
import { StripePaymentProvider } from './stripe-payment.provider.js';

@Module({
  imports: [AuditModule],
  controllers: [BillingController],
  providers: [BillingService, UsageService, StripePaymentProvider],
  exports: [BillingService, UsageService],
})
export class BillingModule {}
