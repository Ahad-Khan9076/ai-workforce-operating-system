import {
  EnrollmentStatus,
  WorkforceRiskCategory,
  WorkforceRiskSeverity,
} from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service.js';
import type { WorkforceRiskRule } from '../risk-rule.types.js';

const OVERDUE_DAYS = 30;

export function createTrainingOverdueRule(prisma: PrismaService): WorkforceRiskRule {
  return {
    code: 'TRAINING_OVERDUE',
    description:
      'Flags required training enrollments that remain incomplete more than 30 days after enrollment.',
    async detect(ctx) {
      const cutoff = new Date(ctx.now);
      cutoff.setDate(cutoff.getDate() - OVERDUE_DAYS);

      const enrollments = await prisma.employeeEnrollment.findMany({
        where: {
          organizationId: ctx.organizationId,
          status: { in: [EnrollmentStatus.NOT_STARTED, EnrollmentStatus.IN_PROGRESS] },
          createdAt: { lte: cutoff },
          course: {
            assignments: {
              some: { organizationId: ctx.organizationId, isRequired: true },
            },
          },
        },
        include: {
          course: { select: { title: true } },
          employee: { select: { departmentId: true } },
        },
      });

      return enrollments.map((e) => ({
        category: WorkforceRiskCategory.TRAINING,
        severity:
          e.status === EnrollmentStatus.NOT_STARTED
            ? WorkforceRiskSeverity.HIGH
            : WorkforceRiskSeverity.MEDIUM,
        title: 'Mandatory training overdue',
        summary: `Rule TRAINING_OVERDUE: "${e.course.title}" enrollment is ${e.status.replace('_', ' ').toLowerCase()} and was created before ${cutoff.toISOString().slice(0, 10)} (${OVERDUE_DAYS}+ day threshold).`,
        ruleCode: 'TRAINING_OVERDUE',
        evidence: {
          enrollmentId: e.id,
          courseId: e.courseId,
          courseTitle: e.course.title,
          status: e.status,
          enrolledAt: e.createdAt.toISOString(),
          overdueDaysThreshold: OVERDUE_DAYS,
        },
        employeeId: e.employeeId,
        departmentId: e.employee.departmentId ?? undefined,
      }));
    },
  };
}
