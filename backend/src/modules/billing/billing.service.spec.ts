import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillingService, DEFAULT_PLANS } from './billing.service.js';

describe('BillingService', () => {
  let service: BillingService;
  const prisma = {
    plan: { upsert: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    subscription: {
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
    },
    invoice: { findMany: vi.fn(), create: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BillingService(
      prisma as never,
      { createCheckoutSession: vi.fn() } as never,
      { snapshot: vi.fn() } as never,
      { log: vi.fn() } as never,
    );
  });

  it('defines four default plans', () => {
    expect(DEFAULT_PLANS.map((p) => p.code)).toEqual([
      'FREE',
      'STARTER',
      'GROWTH',
      'ENTERPRISE',
    ]);
  });

  it('seeds plans via upsert', async () => {
    await service.ensurePlansSeeded();
    expect(prisma.plan.upsert).toHaveBeenCalledTimes(DEFAULT_PLANS.length);
  });
});
