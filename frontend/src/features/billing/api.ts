import { apiRequest } from '@/lib/api-client';

export interface BillingPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  limits: Record<string, number | null>;
}

export interface BillingSubscription {
  id: string;
  status: string;
  plan: BillingPlan;
}

export interface UsageMetricRow {
  metric: string;
  quantity: number;
  limit: number | null;
}

export interface BillingInvoice {
  id: string;
  status: string;
  amountCents: number;
  currency: string;
  createdAt: string;
}

export function fetchBillingPlans() {
  return apiRequest<BillingPlan[]>('/billing/plans', { skipAuthRefresh: true });
}

export function fetchBillingSubscription() {
  return apiRequest<BillingSubscription>('/billing/subscription');
}

export function fetchBillingUsage() {
  return apiRequest<{ metrics: UsageMetricRow[]; recordedAt: string }>('/billing/usage');
}

export function fetchBillingInvoices() {
  return apiRequest<BillingInvoice[]>('/billing/invoices');
}
