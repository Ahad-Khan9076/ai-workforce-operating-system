import { Injectable } from '@nestjs/common';
import {
  EmploymentType,
  OnboardingStatus,
  OnboardingTaskKind,
  OnboardingTaskStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { notFoundInTenant } from '../../common/utils/tenant.util.js';
import { TrainingService } from '../training/training.service.js';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly training: TrainingService,
  ) {}

  async ensureDefaultTemplate(organizationId: string) {
    const existing = await this.prisma.onboardingTemplate.findFirst({
      where: { organizationId, name: 'Default onboarding' },
    });
    if (existing) return existing;

    const template = await this.prisma.onboardingTemplate.create({
      data: {
        organizationId,
        name: 'Default onboarding',
        isActive: true,
      },
    });

    const defaults: Array<{ title: string; kind: OnboardingTaskKind; dueDays: number }> = [
      { title: 'Submit employment documents', kind: OnboardingTaskKind.DOCUMENTS, dueDays: 3 },
      { title: 'Complete compliance training', kind: OnboardingTaskKind.COMPLIANCE, dueDays: 7 },
      { title: 'Meet your manager', kind: OnboardingTaskKind.MANAGER_MEETING, dueDays: 5 },
      { title: 'Collect equipment', kind: OnboardingTaskKind.EQUIPMENT, dueDays: 7 },
      { title: 'Set initial goals', kind: OnboardingTaskKind.GOALS, dueDays: 14 },
    ];

    for (const [index, task] of defaults.entries()) {
      await this.prisma.onboardingTemplateTask.create({
        data: {
          templateId: template.id,
          title: task.title,
          kind: task.kind,
          dueDays: task.dueDays,
          sortOrder: (index + 1) * 10,
        },
      });
    }

    await this.prisma.onboardingTemplateMilestone.create({
      data: {
        templateId: template.id,
        title: 'Onboarding complete',
        dueDays: 30,
        sortOrder: 10,
      },
    });

    return template;
  }

  async createPlanForEmployee(
    organizationId: string,
    employeeId: string,
    context: {
      roleCode?: string | null;
      departmentId?: string | null;
      employmentType?: EmploymentType | null;
    },
  ) {
    await this.ensureDefaultTemplate(organizationId);

    const templates = await this.prisma.onboardingTemplate.findMany({
      where: { organizationId, isActive: true },
      include: { tasks: true, milestones: true },
    });

    const template =
      templates
        .map((t) => ({
          template: t,
          score:
            (t.roleCode && t.roleCode === context.roleCode ? 4 : 0) +
            (t.departmentId && t.departmentId === context.departmentId ? 2 : 0) +
            (t.employmentType && t.employmentType === context.employmentType ? 1 : 0),
        }))
        .sort((a, b) => b.score - a.score)[0]?.template ?? templates[0];

    const start = new Date();
    const plan = await this.prisma.onboardingPlan.create({
      data: {
        organizationId,
        employeeId,
        templateId: template?.id,
        status: OnboardingStatus.IN_PROGRESS,
      },
    });

    if (template) {
      for (const task of template.tasks) {
        const dueDate = new Date(start);
        dueDate.setDate(dueDate.getDate() + task.dueDays);
        await this.prisma.onboardingTask.create({
          data: {
            planId: plan.id,
            title: task.title,
            kind: task.kind,
            description: task.description,
            dueDate,
            sortOrder: task.sortOrder,
            courseId: task.courseId,
          },
        });
      }

      for (const milestone of template.milestones) {
        const dueDate = new Date(start);
        dueDate.setDate(dueDate.getDate() + milestone.dueDays);
        await this.prisma.onboardingMilestone.create({
          data: {
            planId: plan.id,
            title: milestone.title,
            dueDate,
            sortOrder: milestone.sortOrder,
          },
        });
      }
    }

    await this.training.assignRequiredCoursesForEmployee(organizationId, employeeId, context);

    return this.getPlan(organizationId, plan.id);
  }

  async getPlan(organizationId: string, planId: string) {
    const plan = await this.prisma.onboardingPlan.findFirst({
      where: { id: planId, organizationId },
      include: {
        tasks: { orderBy: { sortOrder: 'asc' } },
        milestones: { orderBy: { sortOrder: 'asc' } },
        employee: true,
        template: true,
      },
    });
    if (!plan) notFoundInTenant('Onboarding plan');
    await this.refreshTaskStatuses(plan.id);
    return this.prisma.onboardingPlan.findFirst({
      where: { id: planId },
      include: {
        tasks: { orderBy: { sortOrder: 'asc' } },
        milestones: { orderBy: { sortOrder: 'asc' } },
        employee: true,
        template: true,
      },
    });
  }

  async updateTaskStatus(
    organizationId: string,
    taskId: string,
    status: OnboardingTaskStatus,
  ) {
    const task = await this.prisma.onboardingTask.findFirst({
      where: { id: taskId, plan: { organizationId } },
    });
    if (!task) notFoundInTenant('Onboarding task');

    return this.prisma.onboardingTask.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === OnboardingTaskStatus.COMPLETED ? new Date() : null,
      },
    });
  }

  private async refreshTaskStatuses(planId: string) {
    const now = new Date();
    const tasks = await this.prisma.onboardingTask.findMany({ where: { planId } });
    for (const task of tasks) {
      if (task.status === OnboardingTaskStatus.COMPLETED) continue;
      if (task.dueDate && task.dueDate < now && task.status !== OnboardingTaskStatus.IN_PROGRESS) {
        await this.prisma.onboardingTask.update({
          where: { id: task.id },
          data: { status: OnboardingTaskStatus.OVERDUE },
        });
      }
    }
  }

  listTemplates(organizationId: string) {
    return this.prisma.onboardingTemplate.findMany({
      where: { organizationId, isActive: true },
      include: { tasks: true, milestones: true },
    });
  }
}
