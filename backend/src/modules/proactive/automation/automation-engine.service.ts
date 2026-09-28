import { Injectable } from '@nestjs/common';
import { AutomationActorType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import { NotificationService } from '../../notifications/notification.service.js';

export const DEFAULT_AUTOMATIONS = [
  {
    code: 'TRAINING_OVERDUE_NOTIFY',
    name: 'Training overdue reminder',
    description: 'When mandatory training is overdue, notify the employee.',
    triggerEvent: 'TRAINING_OVERDUE',
    actionType: 'NOTIFY_EMPLOYEE',
  },
  {
    code: 'LEAVE_SUBMITTED_NOTIFY_MANAGER',
    name: 'Leave submitted',
    description: 'When a leave request is submitted, notify the manager.',
    triggerEvent: 'LEAVE_SUBMITTED',
    actionType: 'NOTIFY_MANAGER',
  },
  {
    code: 'CERTIFICATE_EXPIRING_NOTIFY',
    name: 'Certificate expiring',
    description: 'When a certificate is 30 days from expiry, notify employee and HR.',
    triggerEvent: 'CERTIFICATE_EXPIRING',
    actionType: 'NOTIFY_EMPLOYEE_AND_HR',
  },
] as const;

@Injectable()
export class AutomationEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  async ensureOrgAutomations(organizationId: string) {
    for (const def of DEFAULT_AUTOMATIONS) {
      await this.prisma.automationRule.upsert({
        where: {
          organizationId_code: { organizationId, code: def.code },
        },
        create: {
          organizationId,
          code: def.code,
          name: def.name,
          description: def.description,
          triggerEvent: def.triggerEvent,
          actionType: def.actionType,
          enabled: true,
        },
        update: {
          name: def.name,
          description: def.description,
        },
      });
    }
  }

  listRules(organizationId: string) {
    return this.prisma.automationRule.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async setEnabled(organizationId: string, ruleId: string, enabled: boolean) {
    const rule = await this.prisma.automationRule.findFirst({
      where: { id: ruleId, organizationId },
    });
    if (!rule) return null;
    return this.prisma.automationRule.update({
      where: { id: ruleId },
      data: { enabled },
    });
  }

  async handleEvent(
    organizationId: string,
    triggerEvent: string,
    payload: Record<string, unknown>,
    actor: { type: AutomationActorType; userId?: string },
  ) {
    await this.ensureOrgAutomations(organizationId);
    const rules = await this.prisma.automationRule.findMany({
      where: { organizationId, triggerEvent, enabled: true },
    });

    for (const rule of rules) {
      const duplicate = await this.findRecentDuplicate(
        organizationId,
        rule.code,
        payload,
      );
      if (duplicate) continue;

      const success = await this.executeRule(organizationId, rule, payload);
      await this.prisma.automationAuditLog.create({
        data: {
          organizationId,
          automationRuleId: rule.id,
          trigger: triggerEvent,
          ruleCode: rule.code,
          action: rule.actionType,
          actorType: actor.type,
          actorUserId: actor.userId,
          success,
          metadata: payload as Prisma.InputJsonValue,
        },
      });
    }
  }

  private async findRecentDuplicate(
    organizationId: string,
    ruleCode: string,
    payload: Record<string, unknown>,
  ) {
    const since = new Date();
    since.setHours(since.getHours() - 1);
    const key = JSON.stringify({
      employeeId: payload.employeeId,
      requestId: payload.requestId,
      enrollmentId: payload.enrollmentId,
    });
    const recent = await this.prisma.automationAuditLog.findFirst({
      where: {
        organizationId,
        ruleCode,
        createdAt: { gte: since },
        metadata: { equals: payload as Prisma.InputJsonValue },
      },
    });
    if (recent) return true;
    const recentByKey = await this.prisma.automationAuditLog.findMany({
      where: { organizationId, ruleCode, createdAt: { gte: since } },
      take: 20,
    });
    return recentByKey.some(
      (r) => JSON.stringify(r.metadata) === key || JSON.stringify(r.metadata) === JSON.stringify(payload),
    );
  }

  private async executeRule(
    organizationId: string,
    rule: { actionType: string; code: string },
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      switch (rule.actionType) {
        case 'NOTIFY_EMPLOYEE':
          return this.notifyEmployee(organizationId, payload);
        case 'NOTIFY_MANAGER':
          return this.notifyManager(organizationId, payload);
        case 'NOTIFY_EMPLOYEE_AND_HR':
          return this.notifyEmployeeAndHr(organizationId, payload);
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  private async notifyEmployee(
    organizationId: string,
    payload: Record<string, unknown>,
  ) {
    const employeeId = String(payload.employeeId ?? '');
    if (!employeeId) return false;
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      include: { membership: { include: { user: true } } },
    });
    const userId = employee?.membership?.userId;
    if (!userId) return false;
    await this.notifications.sendInApp({
      organizationId,
      userId,
      title: String(payload.title ?? 'Workforce notification'),
      body: String(payload.body ?? 'You have a workforce update.'),
      metadata: payload,
      email: employee.membership?.user.email,
      sendEmail: true,
    });
    return true;
  }

  private async notifyManager(
    organizationId: string,
    payload: Record<string, unknown>,
  ) {
    const employeeId = String(payload.employeeId ?? '');
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      include: {
        manager: { include: { membership: { include: { user: true } } } },
      },
    });
    const manager = employee?.manager;
    const userId = manager?.membership?.userId;
    if (!userId) return false;
    await this.notifications.sendInApp({
      organizationId,
      userId,
      title: String(payload.title ?? 'Team update'),
      body: String(payload.body ?? 'A direct report submitted an update.'),
      metadata: payload,
      email: manager.membership?.user.email,
      sendEmail: true,
    });
    return true;
  }

  private async notifyEmployeeAndHr(
    organizationId: string,
    payload: Record<string, unknown>,
  ) {
    const okEmp = await this.notifyEmployee(organizationId, payload);
    const hrMembers = await this.prisma.organizationMember.findMany({
      where: {
        organizationId,
        role: { code: { in: ['HR_ADMIN', 'HR_MANAGER', 'OWNER'] } },
      },
      include: { user: true },
      take: 5,
    });
    for (const m of hrMembers) {
      await this.notifications.sendInApp({
        organizationId,
        userId: m.userId,
        title: String(payload.title ?? 'Certificate expiry'),
        body: String(payload.body ?? 'Certificate renewal needed.'),
        metadata: payload,
        email: m.user.email,
        sendEmail: true,
      });
    }
    return okEmp || hrMembers.length > 0;
  }
}
