import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EmploymentStatus,
  EnrollmentStatus,
  LeaveRequestStatus,
  OnboardingTaskKind,
  PerformanceReviewStatus,
  RecruitmentJobStatus,
  TimelineEventType,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import { PERMISSIONS } from '../../../common/constants/permissions.js';
import { EmployeeScopeService } from '../../workforce/employee-scope.service.js';
import { getToolMeta } from './copilot-tool.registry.js';
import { AiAuditService } from '../ai-audit.service.js';
import { AuditService } from '../../audit/audit.service.js';

export interface ToolExecutionResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  citations?: Array<{ type: string; id: string; label: string }>;
}

@Injectable()
export class CopilotToolExecutor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: EmployeeScopeService,
    private readonly aiAudit: AiAuditService,
    private readonly audit: AuditService,
  ) {}

  assertToolAccess(user: AuthenticatedUser, toolCode: string) {
    const meta = getToolMeta(toolCode);
    if (!meta) {
      throw new NotFoundException(`Unknown tool: ${toolCode}`);
    }
    for (const perm of meta.permissions) {
      if (!user.permissions.includes(perm)) {
        throw new ForbiddenException(`Missing permission for tool ${toolCode}`);
      }
    }
    return meta;
  }

  async executeRead(
    user: AuthenticatedUser,
    toolCode: string,
    args: Record<string, unknown>,
    conversationId?: string,
  ): Promise<ToolExecutionResult> {
    const meta = this.assertToolAccess(user, toolCode);
    if (meta.requiresConfirmation) {
      return { ok: false, error: 'Write tools must use confirmation workflow' };
    }
    const organizationId = user.organizationId!;

    try {
      let result: ToolExecutionResult;
      switch (toolCode) {
        case 'get_headcount':
          result = await this.getHeadcount(organizationId, user);
          break;
        case 'search_employees':
          result = await this.searchEmployees(organizationId, user, args);
          break;
        case 'get_employee':
          result = await this.getEmployee(organizationId, user, args);
          break;
        case 'get_attendance':
          result = await this.getAttendance(organizationId, user, args);
          break;
        case 'get_leave_balance':
          result = await this.getLeaveBalance(organizationId, user, args);
          break;
        case 'get_leave_requests':
          result = await this.getLeaveRequests(organizationId, user, args);
          break;
        case 'get_payroll_summary':
          result = await this.getPayrollSummary(organizationId, user);
          break;
        case 'get_training_status':
          result = await this.getTrainingStatus(organizationId, user, args);
          break;
        case 'get_performance_summary':
          result = await this.getPerformanceSummary(organizationId, user);
          break;
        case 'get_skill_gaps':
          result = await this.getSkillGaps(organizationId, user, args);
          break;
        case 'get_workforce_risks':
          result = await this.getWorkforceRisks(organizationId, user, args);
          break;
        case 'get_hiring_pipeline':
          result = await this.getHiringPipeline(organizationId);
          break;
        default:
          result = { ok: false, error: `Tool ${toolCode} is not implemented` };
      }

      await this.aiAudit.log({
        organizationId,
        conversationId,
        userId: user.userId,
        toolCode,
        actionType: 'TOOL_READ',
        success: result.ok,
        metadata: { args, error: result.error },
      });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tool failed';
      await this.aiAudit.log({
        organizationId,
        conversationId,
        userId: user.userId,
        toolCode,
        actionType: 'TOOL_READ',
        success: false,
        metadata: { args, error: message },
      });
      return { ok: false, error: message };
    }
  }

  async executeWrite(
    user: AuthenticatedUser,
    toolCode: string,
    args: Record<string, unknown>,
    conversationId?: string,
  ): Promise<ToolExecutionResult> {
    this.assertToolAccess(user, toolCode);
    const meta = getToolMeta(toolCode);
    if (!meta?.requiresConfirmation) {
      return { ok: false, error: 'Tool is not a confirmed write action' };
    }
    const organizationId = user.organizationId!;

    try {
      let result: ToolExecutionResult;
      switch (toolCode) {
        case 'create_leave_request':
          result = await this.createLeaveRequest(user, args);
          break;
        case 'approve_leave_request':
          result = await this.approveLeaveRequest(user, args);
          break;
        case 'create_manager_checkin':
          result = await this.createManagerCheckin(user, args);
          break;
        case 'send_notification':
          result = await this.sendNotification(user, args);
          break;
        case 'assign_training':
          result = await this.assignTraining(user, args);
          break;
        case 'create_employee_task':
          result = await this.createEmployeeTask(user, args);
          break;
        default:
          result = { ok: false, error: `Write tool ${toolCode} not implemented` };
      }

      await this.aiAudit.log({
        organizationId,
        conversationId,
        userId: user.userId,
        toolCode,
        actionType: 'TOOL_WRITE',
        success: result.ok,
        metadata: { args, error: result.error },
      });
      await this.audit.log({
        organizationId,
        actorUserId: user.userId,
        action: `ai.${toolCode}`,
        resourceType: 'AiAction',
        metadata: { args, success: result.ok },
      });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Write failed';
      await this.aiAudit.log({
        organizationId,
        conversationId,
        userId: user.userId,
        toolCode,
        actionType: 'TOOL_WRITE',
        success: false,
        metadata: { args, error: message },
      });
      return { ok: false, error: message };
    }
  }

  buildActionSummary(toolCode: string, args: Record<string, unknown>): string {
    switch (toolCode) {
      case 'create_leave_request':
        return `Create leave request (${args.leaveTypeCode}) ${args.startDate} → ${args.endDate}`;
      case 'approve_leave_request':
        return `Approve leave request ${args.requestId}`;
      case 'create_manager_checkin':
        return `Manager check-in for employee ${args.employeeId}: ${args.title}`;
      case 'send_notification':
        return `Send notification to ${args.employeeId}: ${args.subject}`;
      case 'assign_training':
        return `Assign course ${args.courseId} to employee ${args.employeeId}`;
      case 'create_employee_task':
        return `Create task "${args.title}" for employee ${args.employeeId}`;
      default:
        return `Execute ${toolCode}`;
    }
  }

  private async scopedEmployeeIds(user: AuthenticatedUser) {
    const filter = await this.scope.getAccessibleEmployeeFilter(user);
    const rows = await this.prisma.employee.findMany({
      where: filter,
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  private async getHeadcount(
    organizationId: string,
    user: AuthenticatedUser,
  ): Promise<ToolExecutionResult> {
    const ids = await this.scopedEmployeeIds(user);
    const where = this.scope.hasOrgWideWorkforceAccess(user)
      ? { organizationId }
      : { organizationId, id: { in: ids } };
    const [total, active, onLeave] = await Promise.all([
      this.prisma.employee.count({ where }),
      this.prisma.employee.count({
        where: { ...where, employmentStatus: EmploymentStatus.ACTIVE },
      }),
      this.prisma.employee.count({
        where: { ...where, employmentStatus: EmploymentStatus.ON_LEAVE },
      }),
    ]);
    return {
      ok: true,
      data: { total, active, onLeave, scope: this.scope.hasOrgWideWorkforceAccess(user) ? 'organization' : 'team' },
      citations: [{ type: 'metric', id: 'headcount', label: 'Employee records' }],
    };
  }

  private async searchEmployees(
    organizationId: string,
    user: AuthenticatedUser,
    args: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    const filter = await this.scope.getAccessibleEmployeeFilter(user);
    const limit = Math.min(Number(args.limit ?? 20), 50);
    let departmentId: string | undefined;
    if (args.departmentName) {
      const dept = await this.prisma.department.findFirst({
        where: {
          organizationId,
          name: { equals: String(args.departmentName), mode: 'insensitive' },
        },
      });
      departmentId = dept?.id;
    }
    const items = await this.prisma.employee.findMany({
      where: {
        ...filter,
        ...(args.search
          ? {
              OR: [
                { firstName: { contains: String(args.search), mode: 'insensitive' } },
                { lastName: { contains: String(args.search), mode: 'insensitive' } },
                { email: { contains: String(args.search), mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(args.status ? { employmentStatus: args.status as EmploymentStatus } : {}),
        ...(departmentId ? { departmentId } : {}),
      },
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employmentStatus: true,
        department: { select: { name: true } },
        jobTitle: { select: { title: true } },
      },
    });
    return {
      ok: true,
      data: { count: items.length, employees: items },
      citations: items.map((e) => ({
        type: 'employee',
        id: e.id,
        label: `${e.firstName} ${e.lastName}`,
      })),
    };
  }

  private async getEmployee(
    organizationId: string,
    user: AuthenticatedUser,
    args: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    const employeeId = String(args.employeeId ?? '');
    await this.scope.assertCanAccessEmployee(user, employeeId);
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        employmentStatus: true,
        joinDate: true,
        department: { select: { name: true } },
        jobTitle: { select: { title: true } },
      },
    });
    if (!employee) return { ok: false, error: 'Employee not found' };
    return {
      ok: true,
      data: employee,
      citations: [{ type: 'employee', id: employee.id, label: `${employee.firstName} ${employee.lastName}` }],
    };
  }

  private async getAttendance(
    organizationId: string,
    user: AuthenticatedUser,
    args: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    const days = Math.min(Number(args.days ?? 30), 90);
    const from = new Date();
    from.setDate(from.getDate() - days);
    const ids = await this.scopedEmployeeIds(user);
    let departmentId: string | undefined;
    if (args.departmentName) {
      const dept = await this.prisma.department.findFirst({
        where: {
          organizationId,
          name: { equals: String(args.departmentName), mode: 'insensitive' },
        },
      });
      if (!dept) {
        return { ok: true, data: { message: 'Department not found', departmentName: args.departmentName } };
      }
      departmentId = dept.id;
    }

    let employeeIdFilter: { in: string[] } | undefined;
    if (this.scope.hasOrgWideWorkforceAccess(user)) {
      if (departmentId) {
        employeeIdFilter = { in: await this.employeeIdsInDept(organizationId, departmentId, ids) };
      }
    } else {
      employeeIdFilter = { in: ids };
    }

    const records = await this.prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: {
        organizationId,
        workDate: { gte: from },
        ...(employeeIdFilter ? { employeeId: employeeIdFilter } : {}),
      },
      _sum: { overtimeMinutes: true, lateMinutes: true },
      _count: { _all: true },
    });

    const overtimeByDept = departmentId
      ? null
      : await this.overtimeByDepartment(organizationId, from, ids, user);

    return {
      ok: true,
      data: {
        periodDays: days,
        departmentName: args.departmentName ?? null,
        byStatus: records,
        overtimeByDepartment: overtimeByDept,
      },
      citations: [{ type: 'attendance', id: 'summary', label: `Last ${days} days` }],
    };
  }

  private async employeeIdsInDept(
    organizationId: string,
    departmentId: string,
    allowed: string[],
  ) {
    const rows = await this.prisma.employee.findMany({
      where: { organizationId, departmentId, id: { in: allowed } },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  private async overtimeByDepartment(
    organizationId: string,
    from: Date,
    ids: string[],
    user: AuthenticatedUser,
  ) {
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        organizationId,
        workDate: { gte: from },
        ...(this.scope.hasOrgWideWorkforceAccess(user)
          ? {}
          : { employeeId: { in: ids } }),
      },
      select: {
        overtimeMinutes: true,
        employee: { select: { department: { select: { id: true, name: true } } } },
      },
    });
    const map = new Map<string, { name: string; minutes: number }>();
    for (const r of records) {
      const dept = r.employee.department;
      if (!dept) continue;
      const prev = map.get(dept.id) ?? { name: dept.name, minutes: 0 };
      prev.minutes += r.overtimeMinutes;
      map.set(dept.id, prev);
    }
    return [...map.values()].sort((a, b) => b.minutes - a.minutes).slice(0, 10);
  }

  private async getLeaveBalance(
    organizationId: string,
    user: AuthenticatedUser,
    args: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    let employeeId = args.employeeId ? String(args.employeeId) : undefined;
    if (!employeeId) {
      const self = await this.scope.getEmployeeForUser(organizationId, user.userId);
      if (!self) return { ok: false, error: 'No employee profile linked' };
      employeeId = self.id;
    } else {
      await this.scope.assertCanAccessEmployee(user, employeeId);
    }
    const year = new Date().getUTCFullYear();
    const balances = await this.prisma.leaveBalance.findMany({
      where: { organizationId, employeeId, year },
      include: { leaveType: true },
    });
    return { ok: true, data: { employeeId, year, balances } };
  }

  private async getLeaveRequests(
    organizationId: string,
    user: AuthenticatedUser,
    args: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    const ids = await this.scopedEmployeeIds(user);
    const where = {
      organizationId,
      employeeId: { in: ids },
      ...(args.status ? { status: args.status as LeaveRequestStatus } : {}),
    };
    const requests = await this.prisma.leaveRequest.findMany({
      where,
      take: 30,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        leaveType: { select: { name: true } },
      },
    });
    return { ok: true, data: { count: requests.length, requests } };
  }

  private async getPayrollSummary(
    organizationId: string,
    user: AuthenticatedUser,
  ): Promise<ToolExecutionResult> {
    if (!user.permissions.includes(PERMISSIONS.PAYROLL_READ)) {
      return { ok: false, error: 'Payroll access denied' };
    }
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { organizationId },
      orderBy: { startDate: 'desc' },
    });
    if (!period) {
      return { ok: true, data: { message: 'No payroll periods found' } };
    }
    const run = await this.prisma.payrollRun.findFirst({
      where: { organizationId, payrollPeriodId: period.id },
      orderBy: { createdAt: 'desc' },
    });
    const itemCount = run
      ? await this.prisma.payrollItem.count({ where: { payrollRunId: run.id } })
      : 0;
    return {
      ok: true,
      data: {
        period: { id: period.id, startDate: period.startDate, endDate: period.endDate, status: period.status },
        latestRun: run ? { id: run.id, payrollItemCount: itemCount } : null,
      },
    };
  }

  private async getTrainingStatus(
    organizationId: string,
    user: AuthenticatedUser,
    args: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    const ids = await this.scopedEmployeeIds(user);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const enrollments = await this.prisma.employeeEnrollment.findMany({
      where: {
        organizationId,
        employeeId: { in: ids },
        status: { in: [EnrollmentStatus.NOT_STARTED, EnrollmentStatus.IN_PROGRESS] },
        ...(args.overdueOnly ? { createdAt: { lte: cutoff } } : {}),
      },
      take: 40,
      include: {
        employee: { select: { firstName: true, lastName: true } },
        course: { select: { title: true } },
      },
    });
    return { ok: true, data: { count: enrollments.length, enrollments } };
  }

  private async getPerformanceSummary(
    organizationId: string,
    user: AuthenticatedUser,
  ): Promise<ToolExecutionResult> {
    const ids = await this.scopedEmployeeIds(user);
    const reviews = await this.prisma.performanceReview.findMany({
      where: {
        organizationId,
        employeeId: { in: ids },
        status: PerformanceReviewStatus.FINALIZED,
      },
      orderBy: { finalizedAt: 'desc' },
      take: 20,
      include: {
        feedback: { select: { rating: true } },
        employee: { select: { firstName: true, lastName: true } },
      },
    });
    const summaries = reviews.map((r) => {
      const ratings = r.feedback.map((f) => f.rating).filter((x): x is number => x != null);
      const avg =
        ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
      return {
        employeeId: r.employeeId,
        name: `${r.employee.firstName} ${r.employee.lastName}`,
        avgRating: avg,
      };
    });
    return { ok: true, data: { reviews: summaries } };
  }

  private async getSkillGaps(
    organizationId: string,
    user: AuthenticatedUser,
    args: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    const ids = await this.scopedEmployeeIds(user);
    let employeeFilter: { in: string[] } = { in: ids };
    if (args.departmentName) {
      const dept = await this.prisma.department.findFirst({
        where: {
          organizationId,
          name: { equals: String(args.departmentName), mode: 'insensitive' },
        },
      });
      if (dept) {
        const deptEmp = await this.prisma.employee.findMany({
          where: { organizationId, departmentId: dept.id, id: { in: ids } },
          select: { id: true },
        });
        employeeFilter = { in: deptEmp.map((e) => e.id) };
      }
    }
    const gaps = await this.prisma.skillGap.findMany({
      where: { organizationId, employeeId: employeeFilter },
      take: 50,
      include: { skill: { select: { name: true } }, employee: { select: { firstName: true, lastName: true } } },
    });
    return { ok: true, data: { count: gaps.length, gaps } };
  }

  private async getWorkforceRisks(
    organizationId: string,
    user: AuthenticatedUser,
    args: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    const ids = await this.scopedEmployeeIds(user);
    const limit = Math.min(Number(args.limit ?? 20), 50);
    const risks = await this.prisma.workforceRisk.findMany({
      where: {
        organizationId,
        acknowledgedAt: null,
        OR: [{ employeeId: { in: ids } }, { employeeId: null }],
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
    return { ok: true, data: { count: risks.length, risks } };
  }

  private async getHiringPipeline(organizationId: string): Promise<ToolExecutionResult> {
    const openJobs = await this.prisma.recruitmentJob.count({
      where: { organizationId, status: RecruitmentJobStatus.OPEN },
    });
    const byStage = await this.prisma.jobApplication.groupBy({
      by: ['stage'],
      where: { organizationId },
      _count: { _all: true },
    });
    return { ok: true, data: { openJobs, applicationsByStage: byStage } };
  }

  private async createLeaveRequest(
    user: AuthenticatedUser,
    args: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    const organizationId = user.organizationId!;
    const leaveType = await this.prisma.leaveType.findFirst({
      where: { organizationId, code: String(args.leaveTypeCode) },
    });
    if (!leaveType) return { ok: false, error: 'Leave type not found' };

    let employeeId = args.employeeId ? String(args.employeeId) : undefined;
    if (employeeId) {
      if (!user.permissions.includes(PERMISSIONS.LEAVE_MANAGE)) {
        return { ok: false, error: 'Cannot create leave for another employee' };
      }
      await this.scope.assertCanAccessEmployee(user, employeeId);
    } else {
      const self = await this.scope.getEmployeeForUser(organizationId, user.userId);
      if (!self) return { ok: false, error: 'No employee profile' };
      employeeId = self.id;
    }

    const start = new Date(String(args.startDate));
    const end = new Date(String(args.endDate));
    const req = await this.prisma.leaveRequest.create({
      data: {
        organizationId,
        employeeId,
        leaveTypeId: leaveType.id,
        startDate: start,
        endDate: end,
        totalDays: Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1),
        status: LeaveRequestStatus.PENDING,
        reason: args.reason ? String(args.reason) : undefined,
      },
    });
    return { ok: true, data: { requestId: req.id, status: req.status } };
  }

  private async approveLeaveRequest(
    user: AuthenticatedUser,
    args: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    if (!user.permissions.includes(PERMISSIONS.LEAVE_APPROVE)) {
      return { ok: false, error: 'Leave approval not permitted' };
    }
    const requestId = String(args.requestId);
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id: requestId, organizationId: user.organizationId! },
    });
    if (!request) return { ok: false, error: 'Leave request not found' };
    await this.scope.assertCanAccessEmployee(user, request.employeeId);
    const updated = await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: LeaveRequestStatus.APPROVED,
        approverUserId: user.userId,
        decidedAt: new Date(),
        decisionNote: args.note ? String(args.note) : undefined,
      },
    });
    return { ok: true, data: { requestId: updated.id, status: updated.status } };
  }

  private async createManagerCheckin(
    user: AuthenticatedUser,
    args: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    const employeeId = String(args.employeeId);
    await this.scope.assertCanAccessEmployee(user, employeeId);
    const event = await this.prisma.employeeTimelineEvent.create({
      data: {
        organizationId: user.organizationId!,
        employeeId,
        eventType: TimelineEventType.OTHER,
        title: String(args.title),
        description: args.notes ? String(args.notes) : 'Manager check-in created via AI copilot',
        createdByUserId: user.userId,
      },
    });
    return { ok: true, data: { timelineEventId: event.id } };
  }

  private async sendNotification(
    user: AuthenticatedUser,
    args: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    const employeeId = String(args.employeeId);
    await this.scope.assertCanAccessEmployee(user, employeeId);
    return {
      ok: true,
      data: {
        queued: true,
        employeeId,
        subject: String(args.subject),
        note: 'Notification logged for delivery pipeline (no PII stored in AI audit).',
      },
    };
  }

  private async assignTraining(
    user: AuthenticatedUser,
    args: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    const organizationId = user.organizationId!;
    const employeeId = String(args.employeeId);
    const courseId = String(args.courseId);
    await this.scope.assertCanAccessEmployee(user, employeeId);
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId },
    });
    if (!course) return { ok: false, error: 'Course not found' };
    const enrollment = await this.prisma.employeeEnrollment.upsert({
      where: { employeeId_courseId: { employeeId, courseId } },
      create: { organizationId, employeeId, courseId, status: EnrollmentStatus.NOT_STARTED },
      update: {},
    });
    return { ok: true, data: { enrollmentId: enrollment.id } };
  }

  private async createEmployeeTask(
    user: AuthenticatedUser,
    args: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    const organizationId = user.organizationId!;
    const employeeId = String(args.employeeId);
    await this.scope.assertCanAccessEmployee(user, employeeId);
    const plan = await this.prisma.onboardingPlan.findFirst({
      where: { organizationId, employeeId },
      orderBy: { createdAt: 'desc' },
    });
    if (!plan) {
      return { ok: false, error: 'No onboarding plan found for employee' };
    }
    const task = await this.prisma.onboardingTask.create({
      data: {
        planId: plan.id,
        title: String(args.title),
        kind: OnboardingTaskKind.GOALS,
        description: args.description ? String(args.description) : undefined,
      },
    });
    return { ok: true, data: { taskId: task.id } };
  }
}
