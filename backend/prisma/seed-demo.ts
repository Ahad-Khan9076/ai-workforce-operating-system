import { PrismaClient, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ROLE_CODES } from '../src/common/constants/permissions.js';

/** Development-only credentials — do not enable in production seeds without review. */
export const DEMO_CREDENTIALS = {
  email: process.env.DEMO_USER_EMAIL ?? 'demo@hrworkforce.local',
  password: process.env.DEMO_USER_PASSWORD ?? 'DemoOwner1',
  organizationName: 'Demo Workforce Co',
  organizationSlug: 'demo-workforce',
} as const;

export async function seedDemoUser(prisma: PrismaClient) {
  if (process.env.SEED_DEMO === 'false') {
    return;
  }

  const ownerRole = await prisma.role.findUnique({
    where: { code: ROLE_CODES.OWNER },
  });
  if (!ownerRole) {
    console.warn('[seed-demo] OWNER role missing — run permissions seed first');
    return;
  }

  const freePlan = await prisma.plan.findUnique({ where: { code: 'FREE' } });

  const passwordHash = await bcrypt.hash(DEMO_CREDENTIALS.password, 12);
  const email = DEMO_CREDENTIALS.email.toLowerCase();

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      firstName: 'Demo',
      lastName: 'Owner',
      isActive: true,
      emailVerifiedAt: new Date(),
    },
    create: {
      email,
      passwordHash,
      firstName: 'Demo',
      lastName: 'Owner',
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });

  const organization = await prisma.organization.upsert({
    where: { slug: DEMO_CREDENTIALS.organizationSlug },
    update: {
      name: DEMO_CREDENTIALS.organizationName,
      industry: 'Technology',
      companySize: '50-200',
      country: 'US',
      timezone: 'America/New_York',
      settings: {
        ai: { copilotEnabled: true },
        notifications: { emailDigest: true },
      },
    },
    create: {
      name: DEMO_CREDENTIALS.organizationName,
      legalName: 'Demo Workforce Co LLC',
      slug: DEMO_CREDENTIALS.organizationSlug,
      industry: 'Technology',
      companySize: '50-200',
      country: 'US',
      timezone: 'America/New_York',
      currency: 'USD',
      primaryContact: email,
      settings: {
        ai: { copilotEnabled: true },
        notifications: { emailDigest: true },
      },
    },
  });

  const membership = await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: { roleId: ownerRole.id },
    create: {
      organizationId: organization.id,
      userId: user.id,
      roleId: ownerRole.id,
    },
  });

  const department = await prisma.department.upsert({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: 'ENG',
      },
    },
    update: { name: 'Engineering' },
    create: {
      organizationId: organization.id,
      code: 'ENG',
      name: 'Engineering',
      description: 'Demo department for walkthroughs',
    },
  });

  await prisma.employee.upsert({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email,
      },
    },
    update: {
      membershipId: membership.id,
      userId: user.id,
      departmentId: department.id,
      firstName: 'Demo',
      lastName: 'Owner',
      employmentStatus: 'ACTIVE',
    },
    create: {
      organizationId: organization.id,
      employeeNumber: 'EMP-DEMO-001',
      membershipId: membership.id,
      userId: user.id,
      firstName: 'Demo',
      lastName: 'Owner',
      email,
      departmentId: department.id,
      employmentType: 'FULL_TIME',
      employmentStatus: 'ACTIVE',
      joinDate: new Date(),
      workLocation: 'Hybrid',
    },
  });

  if (freePlan) {
    const existingSub = await prisma.subscription.findFirst({
      where: { organizationId: organization.id },
    });
    if (!existingSub) {
      await prisma.subscription.create({
        data: {
          organizationId: organization.id,
          planId: freePlan.id,
          status: SubscriptionStatus.ACTIVE,
          items: {
            create: { planId: freePlan.id, quantity: 1 },
          },
        },
      });
    }
  }

  console.log('\n=== Demo account (development) ===');
  console.log(`Email:    ${DEMO_CREDENTIALS.email}`);
  console.log(`Password: ${DEMO_CREDENTIALS.password}`);
  console.log(`Org:      ${DEMO_CREDENTIALS.organizationName} (${DEMO_CREDENTIALS.organizationSlug})`);
  console.log('Role:     OWNER (full access)\n');
}
