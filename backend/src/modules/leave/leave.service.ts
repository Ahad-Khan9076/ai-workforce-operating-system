import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { LeaveRequestStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { EmployeeScopeService } from '../workforce/employee-scope.service.js';
import { AttendanceService } from '../attendance/attendance.service.js';
import {
  leaveDaysInclusive,
  toWorkDateStorage,
} from '../workforce/workforce-date.util.js';
import { notFoundInTenant } from '../../common/utils/tenant.util.js';
import { PERMISSIONS } from '../../common/constants/permissions.js';
import { AutomationActorType } from '@prisma/client';
import { AutomationEngineService } from '../proactive/automation/automation-engine.service.js';
import { AuditService } from '../audit/audit.service.js';

const DEFAULT_LEAVE_TYPES = [
  { code: 'ANNUAL', name: 'Annual', isPaid: true, defaultAnnualDays: 20 },
  { code: 'SICK', name: 'Sick', isPaid: true, defaultAnnualDays: 10 },
  { code: 'UNPAID', name: 'Unpaid', isPaid: false, defaultAnnualDays: 0 },
  { code: 'PERSONAL', name: 'Personal', isPaid: true, defaultAnnualDays: 5 },
] as const;

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: EmployeeScopeService,
    private readonly attendance: AttendanceService,
    private readonly automation: AutomationEngineService,
    private readonly auditService: AuditService,
  ) {}

  async ensureCatalog(organizationId: string) {
    for (const def of DEFAULT_LEAVE_TYPES) {
      const leaveType = await this.prisma.leaveType.upsert({
        where: {
          organizationId_code: { organizationId, code: def.code },
        },
        update: { name: def.name, isPaid: def.isPaid, isActive: true },
        create: {
          organizationId,
          code: def.code,
          name: def.name,
          isPaid: def.isPaid,
        },
      });

      await this.prisma.leavePolicy.upsert({
        where: {
          organizationId_leaveTypeId: {
            organizationId,
            leaveTypeId: leaveType.id,
          },
        },
        update: { defaultAnnualDays: def.defaultAnnualDays },
        create: {
          organizationId,
          leaveTypeId: leaveType.id,
          defaultAnnualDays: def.defaultAnnualDays,
        },
      });
    }
  }

  async listTypes(organizationId: string) {
    await this.ensureCatalog(organizationId);
    return this.prisma.leaveType.findMany({
      where: { organizationId, isActive: true },
      include: { policies: true },
      orderBy: { name: 'asc' },
    });
  }

  async getBalances(user: AuthenticatedUser, employeeId?: string) {
    const organizationId = user.organizationId!;
    await this.ensureCatalog(organizationId);

    let targetEmployeeId = employeeId;
    if (!targetEmployeeId) {
      const self = await this.scope.getEmployeeForUser(organizationId, user.userId);
      if (!self) {
        throw new BadRequestException('No employee profile linked');
      }
      targetEmployeeId = self.id;
    } else {
      await this.scope.assertCanAccessEmployee(user, targetEmployeeId);
    }

    const year = new Date().getUTCFullYear();
    await this.ensureEmployeeBalances(organizationId, targetEmployeeId, year);

    return this.prisma.leaveBalance.findMany({
      where: { organizationId, employeeId: targetEmployeeId, year },
      include: { leaveType: true },
    });
  }

  async listRequests(
    user: AuthenticatedUser,
    query: { status?: LeaveRequestStatus; employeeId?: string },
  ) {
    const employeeFilter = await this.scope.getAccessibleEmployeeFilter(user);
    return this.prisma.leaveRequest.findMany({
      where: {
        organizationId: user.organizationId!,
        ...(query.status ? { status: query.status } : {}),
        ...(query.employeeId ? { employeeId: query.employeeId } : {}),
        employee: employeeFilter,
      },
      include: {
        leaveType: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRequest(
    user: AuthenticatedUser,
    data: {
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      reason?: string;
      employeeId?: string;
    },
  ) {
    const organizationId = user.organizationId!;
    await this.ensureCatalog(organizationId);

    let employeeId = data.employeeId;
    if (employeeId) {
      if (!user.permissions.includes(PERMISSIONS.LEAVE_MANAGE)) {
        throw new ForbiddenException('Cannot request leave for another employee');
      }
      await this.scope.assertCanAccessEmployee(user, employeeId);
    } else {
      const self = await this.scope.getEmployeeForUser(organizationId, user.userId);
      if (!self) {
        throw new BadRequestException('No employee profile linked');
      }
      employeeId = self.id;
    }

    const start = toWorkDateStorage(data.startDate);
    const end = toWorkDateStorage(data.endDate);
    if (end < start) {
      throw new BadRequestException('End date must be on or after start date');
    }

    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id: data.leaveTypeId, organizationId, isActive: true },
    });
    if (!leaveType) notFoundInTenant('Leave type');

    const totalDays = leaveDaysInclusive(start, end);
    const year = start.getUTCFullYear();

    if (leaveType.isPaid) {
      await this.ensureEmployeeBalances(organizationId, employeeId, year);
      const balance = await this.prisma.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId,
            leaveTypeId: leaveType.id,
            year,
          },
        },
      });
      const available =
        (balance?.allocated ?? 0) -
        (balance?.used ?? 0) -
        (balance?.pending ?? 0);
      if (available < totalDays) {
        throw new BadRequestException('Insufficient leave balance');
      }
    }

    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.leaveRequest.create({
        data: {
          organizationId,
          employeeId,
          leaveTypeId: leaveType.id,
          startDate: start,
          endDate: end,
          totalDays,
          reason: data.reason,
          status: LeaveRequestStatus.PENDING,
        },
        include: { leaveType: true, employee: true },
      });

      if (leaveType.isPaid) {
        await tx.leaveBalance.update({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId,
              leaveTypeId: leaveType.id,
              year,
            },
          },
          data: { pending: { increment: totalDays } },
        });
      }

      return created;
    });

    await this.automation.handleEvent(
      organizationId,
      'LEAVE_SUBMITTED',
      {
        employeeId,
        requestId: request.id,
        title: 'Leave request submitted',
        body: `${request.employee.firstName} ${request.employee.lastName} submitted ${leaveType.name} leave (${data.startDate} – ${data.endDate}).`,
      },
      { type: AutomationActorType.SYSTEM, userId: user.userId },
    );

    return request;
  }

  async approveRequest(user: AuthenticatedUser, requestId: string, note?: string) {
    if (!user.permissions.includes(PERMISSIONS.LEAVE_APPROVE)) {
      throw new ForbiddenException('Cannot approve leave');
    }
    return this.decide(user, requestId, true, note);
  }

  async rejectRequest(user: AuthenticatedUser, requestId: string, note?: string) {
    if (!user.permissions.includes(PERMISSIONS.LEAVE_APPROVE)) {
      throw new ForbiddenException('Cannot reject leave');
    }
    return this.decide(user, requestId, false, note);
  }

  async cancelRequest(user: AuthenticatedUser, requestId: string) {
    const organizationId = user.organizationId!;
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id: requestId, organizationId },
      include: { leaveType: true },
    });
    if (!request) notFoundInTenant('Leave request');

    const self = await this.scope.getEmployeeForUser(organizationId, user.userId);
    const isOwner = self?.id === request.employeeId;
    const canManage = user.permissions.includes(PERMISSIONS.LEAVE_MANAGE);
    if (!isOwner && !canManage) {
      throw new ForbiddenException('Cannot cancel this request');
    }

    if (
      request.status !== LeaveRequestStatus.PENDING &&
      request.status !== LeaveRequestStatus.APPROVED
    ) {
      throw new BadRequestException('Request cannot be cancelled');
    }

    if (request.status === LeaveRequestStatus.APPROVED) {
      throw new BadRequestException(
        'Approved leave cannot be cancelled via self-service',
      );
    }

    return this.releasePendingAndUpdateStatus(
      request,
      LeaveRequestStatus.CANCELLED,
    );
  }

  async leaveReport(user: AuthenticatedUser, from: string, to: string) {
    const employeeFilter = await this.scope.getAccessibleEmployeeFilter(user);
    const requests = await this.prisma.leaveRequest.findMany({
      where: {
        organizationId: user.organizationId!,
        status: LeaveRequestStatus.APPROVED,
        startDate: { lte: toWorkDateStorage(to) },
        endDate: { gte: toWorkDateStorage(from) },
        employee: employeeFilter,
      },
      include: {
        leaveType: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        },
      },
    });

    return requests.map((r) => ({
      id: r.id,
      employee: r.employee,
      leaveType: r.leaveType,
      startDate: r.startDate.toISOString().slice(0, 10),
      endDate: r.endDate.toISOString().slice(0, 10),
      totalDays: r.totalDays,
      status: r.status,
    }));
  }

  private async decide(
    user: AuthenticatedUser,
    requestId: string,
    approve: boolean,
    note?: string,
  ) {
    const organizationId = user.organizationId!;
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id: requestId, organizationId },
      include: { leaveType: true, employee: true },
    });
    if (!request) notFoundInTenant('Leave request');
    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('Request is not pending');
    }

    await this.scope.assertCanAccessEmployee(user, request.employeeId);

    if (!approve) {
      const rejected = await this.releasePendingAndUpdateStatus(
        request,
        LeaveRequestStatus.REJECTED,
        user.userId,
        note,
      );
      await this.auditService.log({
        organizationId,
        actorUserId: user.userId,
        action: 'leave.rejected',
        resourceType: 'leave_request',
        resourceId: requestId,
        metadata: { note },
      });
      return rejected;
    }

    const year = request.startDate.getUTCFullYear();
    const updated = await this.prisma.$transaction(async (tx) => {
      if (request.leaveType.isPaid) {
        await tx.leaveBalance.update({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: request.employeeId,
              leaveTypeId: request.leaveTypeId,
              year,
            },
          },
          data: {
            pending: { decrement: request.totalDays },
            used: { increment: request.totalDays },
          },
        });
      }

      return tx.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: LeaveRequestStatus.APPROVED,
          approverUserId: user.userId,
          decidedAt: new Date(),
          decisionNote: note,
        },
        include: { leaveType: true, employee: true },
      });
    });

    await this.attendance.markOnLeaveForRange(
      organizationId,
      request.employeeId,
      request.startDate,
      request.endDate,
    );

    await this.auditService.log({
      organizationId,
      actorUserId: user.userId,
      action: 'leave.approved',
      resourceType: 'leave_request',
      resourceId: requestId,
      metadata: { note },
    });

    return updated;
  }

  private async releasePendingAndUpdateStatus(
    request: Prisma.LeaveRequestGetPayload<{ include: { leaveType: true } }>,
    status: LeaveRequestStatus,
    reviewerId?: string,
    note?: string,
  ) {
    const year = request.startDate.getUTCFullYear();
    return this.prisma.$transaction(async (tx) => {
      if (
        request.leaveType.isPaid &&
        request.status === LeaveRequestStatus.PENDING
      ) {
        await tx.leaveBalance.update({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: request.employeeId,
              leaveTypeId: request.leaveTypeId,
              year,
            },
          },
          data: { pending: { decrement: request.totalDays } },
        });
      }

      return tx.leaveRequest.update({
        where: { id: request.id },
        data: {
          status,
          approverUserId: reviewerId,
          decidedAt: reviewerId ? new Date() : undefined,
          decisionNote: note,
        },
        include: { leaveType: true, employee: true },
      });
    });
  }

  private async ensureEmployeeBalances(
    organizationId: string,
    employeeId: string,
    year: number,
  ) {
    await this.ensureCatalog(organizationId);
    const types = await this.prisma.leaveType.findMany({
      where: { organizationId, isActive: true },
      include: { policies: true },
    });

    for (const type of types) {
      const policy = type.policies[0];
      const allocated = policy?.defaultAnnualDays ?? 0;
      await this.prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId,
            leaveTypeId: type.id,
            year,
          },
        },
        update: {},
        create: {
          organizationId,
          employeeId,
          leaveTypeId: type.id,
          year,
          allocated,
        },
      });
    }
  }
}
