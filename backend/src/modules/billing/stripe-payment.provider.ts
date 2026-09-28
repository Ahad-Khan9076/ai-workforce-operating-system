import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CheckoutSessionRequest,
  CheckoutSessionResult,
  PaymentProvider,
} from './payment-provider.interface.js';

/**
 * Stripe-ready adapter. Requires STRIPE_SECRET_KEY and price IDs in plan metadata for live checkout.
 * Does not call Stripe until configured — returns a structured stub for development.
 */
@Injectable()
export class StripePaymentProvider implements PaymentProvider {
  readonly code = 'STRIPE';
  private readonly logger = new Logger(StripePaymentProvider.name);

  constructor(private readonly config: ConfigService) {}

  async createCheckoutSession(
    input: CheckoutSessionRequest,
  ): Promise<CheckoutSessionResult> {
    const secret = this.config.get<string>('billing.stripeSecretKey');
    if (!secret) {
      this.logger.warn('STRIPE_SECRET_KEY not set — returning dev checkout stub');
      return {
        providerCode: this.code,
        sessionId: `dev_session_${input.organizationId}`,
        url: `${input.successUrl}?billing=stub&plan=${input.planCode}`,
      };
    }

    // Integration point: stripe.checkout.sessions.create({ ... })
    this.logger.log(
      `Stripe checkout placeholder for org=${input.organizationId} plan=${input.planCode}`,
    );
    return {
      providerCode: this.code,
      sessionId: 'stripe_pending_implementation',
      url: input.successUrl,
    };
  }
}
