export interface CheckoutSessionRequest {
  organizationId: string;
  planCode: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

export interface CheckoutSessionResult {
  providerCode: string;
  sessionId: string;
  url: string;
}

export interface PaymentProvider {
  readonly code: string;
  createCheckoutSession(
    input: CheckoutSessionRequest,
  ): Promise<CheckoutSessionResult>;
}
