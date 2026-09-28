import { Injectable, NotFoundException } from '@nestjs/common';
import {
  InvoiceStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { StripePaymentProvider } from './stripe-payment.provider.js';
import { UsageService } from './usage.service.js';
import { AuditService } from '../audit/audit.service.js';

export const DEFAULT_PLANS = [
  {
    code: 'FREE',
    name: 'Free',
    description: 'Evaluation and small teams',
    priceCents: 0,
    sortOrder: 0,
    limits: {
      activeEmployees: 25,
      recruitmentCandidates: 50,
      aiRequestsPerMonth: 100,
      storageBytes: 1_073_741_824,
      trainingUsers: 25,
    },
  },
  {
    code: 'STARTER',
    name: 'Starter',
    description: 'Growing HR teams',
    priceCents: 9900,
    sortOrder: 1,
    limits: {
      activeEmployees: 100,
      recruitmentCandidates: 500,
      aiRequestsPerMonth: 1000,
      storageBytes: 10_737_418_240,
      trainingUsers: 100,
    },
  },
  {
    code: 'GROWTH',
    name: 'Growth',
    description: 'Multi-module workforce platform',
    priceCents: 29900,
    sortOrder: 2,
    limits: {
      activeEmployees: 500,
      recruitmentCandidates: 5000,
      aiRequestsPerMonth: 10000,
      storageBytes: 107_374_182_400,
      trainingUsers: 500,
    },
  },
  {
    code: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Custom limits and SSO (contact sales)',
    priceCents: 0,
    sortOrder: 3,
    limits: {
      activeEmployees: null,
      recruitmentCandidates: null,
      aiRequestsPerMonth: null,
      storageBytes: null,
      trainingUsers: null,
    },
  },
] as const;

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripePaymentProvider,
    private readonly usage: UsageService,
    private readonly audit: AuditService,
  ) {}

  async ensurePlansSeeded() {
    for (const p of DEFAULT_PLANS) {
      await this.prisma.plan.upsert({
        where: { code: p.code },
        create: {
          code: p.code,
          name: p.name,
          description: p.description,
          priceCents: p.priceCents,
          sortOrder: p.sortOrder,
          limits: p.limits,
        },
        update: {
          name: p.name,
          description: p.description,
          priceCents: p.priceCents,
          limits: p.limits,
        },
      });
    }
  }

  listPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getSubscription(organizationId: string) {
    await this.ensurePlansSeeded();
    let sub = await this.prisma.subscription.findFirst({
      where: { organizationId },
      include: { plan: true, items: { include: { plan: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (!sub) {
      sub = await this.assignFreePlan(organizationId);
    }
    return sub;
  }

  async assignFreePlan(organizationId: string) {
    await this.ensurePlansSeeded();
    const plan = await this.prisma.plan.findUnique({ where: { code: 'FREE' } });
    if (!plan) throw new NotFoundException('FREE plan missing');

    const existing = await this.prisma.subscription.findFirst({
      where: { organizationId },
    });
    if (existing) {
      return this.prisma.subscription.findUniqueOrThrow({
        where: { id: existing.id },
        include: { plan: true, items: { include: { plan: true } } },
      });
    }

    const sub = await this.prisma.subscription.create({
      data: {
        organizationId,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        items: {
          create: { planId: plan.id, quantity: 1 },
        },
      },
      include: { plan: true, items: { include: { plan: true } } },
    });

    await this.audit.log({
      organizationId,
      action: 'billing.subscription.created',
      resourceType: 'subscription',
      resourceId: sub.id,
      metadata: { planCode: plan.code },
    });

    return sub;
  }

  async startCheckout(
    organizationId: string,
    planCode: string,
    actorUserId: string,
    successUrl: string,
    cancelUrl: string,
  ) {
    const plan = await this.prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan) throw new NotFoundException('Plan not found');

    const session = await this.stripe.createCheckoutSession({
      organizationId,
      planCode,
      successUrl,
      cancelUrl,
    });

    await this.audit.log({
      organizationId,
      actorUserId,
      action: 'billing.checkout.started',
      resourceType: 'plan',
      resourceId: plan.id,
      metadata: { provider: session.providerCode, sessionId: session.sessionId },
    });

    return session;
  }

  async listInvoices(organizationId: string) {
    return this.prisma.invoice.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 24,
    });
  }

  async recordUsageSnapshot(organizationId: string) {
    return this.usage.snapshot(organizationId);
  }

  async createSampleInvoice(organizationId: string, actorUserId: string) {
    const sub = await this.getSubscription(organizationId);
    const invoice = await this.prisma.invoice.create({
      data: {
        organizationId,
        subscriptionId: sub.id,
        status: InvoiceStatus.OPEN,
        amountCents: sub.plan.priceCents,
        currency: sub.plan.currency,
        issuedAt: new Date(),
        lineItems: [
          {
            description: `${sub.plan.name} plan`,
            amountCents: sub.plan.priceCents,
          },
        ],
      },
    });
    await this.audit.log({
      organizationId,
      actorUserId,
      action: 'billing.invoice.created',
      resourceType: 'invoice',
      resourceId: invoice.id,
    });
    return invoice;
  }
}
