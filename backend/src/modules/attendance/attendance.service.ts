import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceCorrectionStatus, AttendanceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { EmployeeScopeService } from '../workforce/employee-scope.service.js';
import { AttendanceCalculationService } from './attendance-calculation.service.js';
import { ShiftsService } from './shifts.service.js';
import {
  getOrgWorkDate,
  parseOrgWorkDate,
} from '../workforce/workforce-time.util.js';
import {
  eachWorkDateInRange,
  toWorkDateStorage,
  workDateFromStorage,
} from '../workforce/workforce-date.util.js';
import { notFoundInTenant } from '../../common/utils/tenant.util.js';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: EmployeeScopeService,
    private readonly calculation: AttendanceCalculationService,
    private readonly shifts: ShiftsService,
  ) {}

  private async getOrgTimezone(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { timezone: true },
    });
    return org?.timezone ?? 'UTC';
  }

  private recordInclude = {
    employee: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNumber: true,
        departmentId: true,
      },
    },
    shiftTemplate: true,
    breaks: { orderBy: { startAt: 'asc' as const } },
  };

  async getTodayForUser(user: AuthenticatedUser) {
    const employee = await this.requireLinkedEmployee(user);
    const timezone = await this.getOrgTimezone(user.organizationId!);
    const workDate = getOrgWorkDate(new Date(), timezone);
    const record = await this.ensureRecord(
      user.organizationId!,
      employee.id,
      workDate,
      timezone,
    );
    return this.findRecordById(user.organizationId!, record.id);
  }

  async clockIn(user: AuthenticatedUser) {
    const employee = await this.requireLinkedEmployee(user);
    const organizationId = user.organizationId!;
    const timezone = await this.getOrgTimezone(organizationId);
    const now = new Date();
    const workDate = getOrgWorkDate(now, timezone);

    const record = await this.ensureRecord(
      organizationId,
      employee.id,
      workDate,
      timezone,
    );

    if (record.clockInAt && !record.clockOutAt) {
      throw new BadRequestException('Already clocked in');
    }
    if (record.clockInAt && record.clockOutAt) {
      throw new BadRequestException('Already completed attendance for today');
    }

    const openBreak = await this.prisma.attendanceBreak.findFirst({
      where: { attendanceRecordId: record.id, endAt: null },
    });
    if (openBreak) {
      throw new BadRequestException('End your break before clocking in again');
    }

    await this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: { clockInAt: now, clockOutAt: null, missingClockOut: false },
    });

    return this.recalculateAndReturn(organizationId, record.id, timezone);
  }

  async clockOut(user: AuthenticatedUser) {
    const employee = await this.requireLinkedEmployee(user);
    const organizationId = user.organizationId!;
    const timezone = await this.getOrgTimezone(organizationId);
    const workDate = getOrgWorkDate(new Date(), timezone);

    const record = await this.prisma.attendanceRecord.findFirst({
      where: {
        organizationId,
        employeeId: employee.id,
        workDate: toWorkDateStorage(workDate),
      },
      include: { breaks: true },
    });

    if (!record?.clockInAt) {
      throw new BadRequestException('Clock in before clocking out');
    }
    if (record.clockOutAt) {
      throw new BadRequestException('Already clocked out');
    }

    const openBreak = record.breaks.find((b) => !b.endAt);
    if (openBreak) {
      throw new BadRequestException('End your break before clocking out');
    }

    const now = new Date();
    if (now < record.clockInAt) {
      throw new BadRequestException('Clock out cannot be before clock in');
    }

    await this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: { clockOutAt: now },
    });

    return this.recalculateAndReturn(organizationId, record.id, timezone);
  }

  async startBreak(user: AuthenticatedUser) {
    const employee = await this.requireLinkedEmployee(user);
    const organizationId = user.organizationId!;
    const timezone = await this.getOrgTimezone(organizationId);
    const workDate = getOrgWorkDate(new Date(), timezone);

    const record = await this.prisma.attendanceRecord.findFirst({
      where: {
        organizationId,
        employeeId: employee.id,
        workDate: toWorkDateStorage(workDate),
      },
    });

    if (!record?.clockInAt || record.clockOutAt) {
      throw new BadRequestException('Clock in before starting a break');
    }

    const openBreak = await this.prisma.attendanceBreak.findFirst({
      where: { attendanceRecordId: record.id, endAt: null },
    });
    if (openBreak) {
      throw new BadRequestException('A break is already in progress');
    }

    await this.prisma.attendanceBreak.create({
      data: { attendanceRecordId: record.id, startAt: new Date() },
    });

    return this.recalculateAndReturn(organizationId, record.id, timezone);
  }

  async endBreak(user: AuthenticatedUser) {
    const employee = await this.requireLinkedEmployee(user);
    const organizationId = user.organizationId!;
    const timezone = await this.getOrgTimezone(organizationId);
    const workDate = getOrgWorkDate(new Date(), timezone);

    const record = await this.prisma.attendanceRecord.findFirst({
      where: {
        organizationId,
        employeeId: employee.id,
        workDate: toWorkDateStorage(workDate),
      },
    });

    if (!record) {
      throw new BadRequestException('No active attendance record');
    }

    const openBreak = await this.prisma.attendanceBreak.findFirst({
      where: { attendanceRecordId: record.id, endAt: null },
    });
    if (!openBreak) {
      throw new BadRequestException('No break in progress');
    }

    const now = new Date();
    if (now < openBreak.startAt) {
      throw new BadRequestException('Invalid break end time');
    }

    await this.prisma.attendanceBreak.update({
      where: { id: openBreak.id },
      data: { endAt: now },
    });

    return this.recalculateAndReturn(organizationId, record.id, timezone);
  }

  async listRecords(
    user: AuthenticatedUser,
    query: {
      from?: string;
      to?: string;
      employeeId?: string;
      departmentId?: string;
      status?: AttendanceStatus;
      page?: number;
      pageSize?: number;
    },
  ) {
    const employeeFilter = await this.scope.getAccessibleEmployeeFilter(user);
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 50, 100);

    const where: Prisma.AttendanceRecordWhereInput = {
      organizationId: user.organizationId!,
      employee: employeeFilter,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.departmentId
        ? { employee: { departmentId: query.departmentId } }
        : {}),
    };

    if (query.from || query.to) {
      where.workDate = {};
      if (query.from) {
        where.workDate.gte = toWorkDateStorage(query.from);
      }
      if (query.to) {
        where.workDate.lte = toWorkDateStorage(query.to);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where,
        include: this.recordInclude,
        orderBy: [{ workDate: 'desc' }, { employee: { lastName: 'asc' } }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.attendanceRecord.count({ where }),
    ]);

    return {
      items: items.map((r) => this.serializeRecord(r)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async calendar(
    user: AuthenticatedUser,
    query: {
      view: 'month' | 'week' | 'day';
      anchor: string;
      employeeId?: string;
      departmentId?: string;
      status?: AttendanceStatus;
    },
  ) {
    const timezone = await this.getOrgTimezone(user.organizationId!);
    const anchor = parseOrgWorkDate(query.anchor, timezone);
    let from: string;
    let to: string;

    if (query.view === 'day') {
      from = query.anchor;
      to = query.anchor;
    } else if (query.view === 'week') {
      const start = anchor.startOf('week');
      const end = anchor.endOf('week');
      from = start.toISODate()!;
      to = end.toISODate()!;
    } else {
      const start = anchor.startOf('month');
      const end = anchor.endOf('month');
      from = start.toISODate()!;
      to = end.toISODate()!;
    }

    return this.listRecords(user, {
      from,
      to,
      employeeId: query.employeeId,
      departmentId: query.departmentId,
      status: query.status,
      pageSize: 500,
    });
  }

  async managerOverview(user: AuthenticatedUser) {
    const organizationId = user.organizationId!;
    const timezone = await this.getOrgTimezone(organizationId);
    const workDate = getOrgWorkDate(new Date(), timezone);
    const workDateStored = toWorkDateStorage(workDate);
    const employeeFilter = await this.scope.getAccessibleEmployeeFilter(user);

    const [todayRecords, pendingCorrections, pendingLeave] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: {
          organizationId,
          workDate: workDateStored,
          employee: employeeFilter,
        },
        include: this.recordInclude,
      }),
      this.prisma.attendanceCorrection.count({
        where: {
          organizationId,
          status: AttendanceCorrectionStatus.PENDING,
          attendanceRecord: { employee: employeeFilter },
        },
      }),
      this.prisma.leaveRequest.count({
        where: {
          organizationId,
          status: 'PENDING',
          employee: employeeFilter,
        },
      }),
    ]);

    const serialized = todayRecords.map((r) => this.serializeRecord(r));
    return {
      workDate,
      timezone,
      today: serialized,
      lateEmployees: serialized.filter(
        (r) => r.status === AttendanceStatus.LATE || r.lateMinutes > 0,
      ),
      absentEmployees: serialized.filter(
        (r) => r.status === AttendanceStatus.ABSENT && !r.clockInAt,
      ),
      presentCount: serialized.filter(
        (r) =>
          r.clockInAt &&
          r.status !== AttendanceStatus.ABSENT &&
          r.status !== AttendanceStatus.ON_LEAVE,
      ).length,
      pendingCorrections,
      pendingLeave,
    };
  }

  async requestCorrection(
    user: AuthenticatedUser,
    attendanceRecordId: string,
    data: {
      proposedClockInAt?: string;
      proposedClockOutAt?: string;
      reason: string;
    },
  ) {
    const record = await this.prisma.attendanceRecord.findFirst({
      where: { id: attendanceRecordId, organizationId: user.organizationId! },
    });
    if (!record) notFoundInTenant('Attendance record');
    await this.scope.assertCanAccessEmployee(user, record!.employeeId);

    return this.prisma.attendanceCorrection.create({
      data: {
        organizationId: user.organizationId!,
        attendanceRecordId,
        requestedByUserId: user.userId,
        reason: data.reason,
        proposedClockInAt: data.proposedClockInAt
          ? new Date(data.proposedClockInAt)
          : undefined,
        proposedClockOutAt: data.proposedClockOutAt
          ? new Date(data.proposedClockOutAt)
          : undefined,
      },
    });
  }

  async reviewCorrection(
    user: AuthenticatedUser,
    correctionId: string,
    approve: boolean,
  ) {
    const correction = await this.prisma.attendanceCorrection.findFirst({
      where: { id: correctionId, organizationId: user.organizationId! },
      include: { attendanceRecord: true },
    });
    if (!correction) notFoundInTenant('Correction');
    if (correction.status !== AttendanceCorrectionStatus.PENDING) {
      throw new BadRequestException('Correction already reviewed');
    }

    await this.scope.assertCanAccessEmployee(
      user,
      correction.attendanceRecord.employeeId,
    );

    const timezone = await this.getOrgTimezone(user.organizationId!);

    if (approve) {
      const { proposedClockInAt, proposedClockOutAt } = correction;
      if (proposedClockInAt && proposedClockOutAt && proposedClockOutAt < proposedClockInAt) {
        throw new BadRequestException('Invalid proposed times');
      }
      await this.prisma.attendanceRecord.update({
        where: { id: correction.attendanceRecordId },
        data: {
          clockInAt: proposedClockInAt ?? correction.attendanceRecord.clockInAt,
          clockOutAt:
            proposedClockOutAt ?? correction.attendanceRecord.clockOutAt,
        },
      });
      await this.recalculateAndReturn(
        user.organizationId!,
        correction.attendanceRecordId,
        timezone,
      );
    }

    return this.prisma.attendanceCorrection.update({
      where: { id: correctionId },
      data: {
        status: approve
          ? AttendanceCorrectionStatus.APPROVED
          : AttendanceCorrectionStatus.REJECTED,
        reviewedByUserId: user.userId,
        reviewedAt: new Date(),
      },
    });
  }

  async reports(
    user: AuthenticatedUser,
    type: 'summary' | 'late' | 'overtime' | 'absence',
    from: string,
    to: string,
  ) {
    const employeeFilter = await this.scope.getAccessibleEmployeeFilter(user);
    const where: Prisma.AttendanceRecordWhereInput = {
      organizationId: user.organizationId!,
      workDate: {
        gte: toWorkDateStorage(from),
        lte: toWorkDateStorage(to),
      },
      employee: employeeFilter,
    };

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      include: {
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

    if (type === 'late') {
      return records
        .filter((r) => r.lateMinutes > 0)
        .map((r) => ({
          employee: r.employee,
          workDate: workDateFromStorage(r.workDate),
          lateMinutes: r.lateMinutes,
          status: r.status,
        }));
    }

    if (type === 'overtime') {
      return records
        .filter((r) => r.overtimeMinutes > 0)
        .map((r) => ({
          employee: r.employee,
          workDate: workDateFromStorage(r.workDate),
          overtimeMinutes: r.overtimeMinutes,
          workedMinutes: r.workedMinutes,
        }));
    }

    if (type === 'absence') {
      return records
        .filter((r) => r.status === AttendanceStatus.ABSENT && !r.clockInAt)
        .map((r) => ({
          employee: r.employee,
          workDate: workDateFromStorage(r.workDate),
          status: r.status,
        }));
    }

    const byEmployee = new Map<
      string,
      {
        employee: (typeof records)[0]['employee'];
        presentDays: number;
        lateDays: number;
        absentDays: number;
        totalWorkedMinutes: number;
        totalOvertimeMinutes: number;
      }
    >();

    for (const r of records) {
      const key = r.employeeId;
      let row = byEmployee.get(key);
      if (!row) {
        row = {
          employee: r.employee,
          presentDays: 0,
          lateDays: 0,
          absentDays: 0,
          totalWorkedMinutes: 0,
          totalOvertimeMinutes: 0,
        };
        byEmployee.set(key, row);
      }
      if (r.clockInAt) row.presentDays += 1;
      if (r.lateMinutes > 0) row.lateDays += 1;
      if (r.status === AttendanceStatus.ABSENT && !r.clockInAt) {
        row.absentDays += 1;
      }
      row.totalWorkedMinutes += r.workedMinutes;
      row.totalOvertimeMinutes += r.overtimeMinutes;
    }

    return [...byEmployee.values()];
  }

  async markOnLeaveForRange(
    organizationId: string,
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const timezone = await this.getOrgTimezone(organizationId);
    for (const iso of eachWorkDateInRange(startDate, endDate)) {
      const record = await this.ensureRecord(
        organizationId,
        employeeId,
        iso,
        timezone,
      );
      await this.prisma.attendanceRecord.update({
        where: { id: record.id },
        data: {
          status: AttendanceStatus.ON_LEAVE,
          clockInAt: null,
          clockOutAt: null,
          workedMinutes: 0,
          lateMinutes: 0,
          overtimeMinutes: 0,
          breakMinutes: 0,
          earlyDepartureMinutes: 0,
          missingClockOut: false,
        },
      });
    }
  }

  private async requireLinkedEmployee(user: AuthenticatedUser) {
    const employee = await this.scope.getEmployeeForUser(
      user.organizationId!,
      user.userId,
    );
    if (!employee) {
      throw new BadRequestException(
        'No employee profile linked to your account',
      );
    }
    return employee;
  }

  private async ensureRecord(
    organizationId: string,
    employeeId: string,
    workDate: string,
    _timezone: string,
  ) {
    const stored = toWorkDateStorage(workDate);
    const existing = await this.prisma.attendanceRecord.findUnique({
      where: {
        organizationId_employeeId_workDate: {
          organizationId,
          employeeId,
          workDate: stored,
        },
      },
    });
    if (existing) return existing;

    const shift = await this.shifts.getActiveShift(
      organizationId,
      employeeId,
      new Date(),
    );

    return this.prisma.attendanceRecord.create({
      data: {
        organizationId,
        employeeId,
        workDate: stored,
        shiftTemplateId: shift?.id,
        status: AttendanceStatus.ABSENT,
      },
    });
  }

  private async recalculateAndReturn(
    organizationId: string,
    recordId: string,
    timezone: string,
  ) {
    const record = await this.prisma.attendanceRecord.findFirst({
      where: { id: recordId, organizationId },
      include: { breaks: true, shiftTemplate: true },
    });
    if (!record) throw new NotFoundException('Attendance record not found');

    if (record.status === AttendanceStatus.ON_LEAVE) {
      return this.findRecordById(organizationId, recordId);
    }

    const breakMinutes = record.breaks.reduce((sum, b) => {
      if (!b.endAt) return sum;
      return (
        sum +
        Math.max(
          0,
          Math.round((b.endAt.getTime() - b.startAt.getTime()) / 60000),
        )
      );
    }, 0);

    const shift =
      record.shiftTemplate ??
      (await this.shifts.getActiveShift(
        organizationId,
        record.employeeId,
        record.clockInAt ?? new Date(),
      ));

    const workDate = workDateFromStorage(record.workDate);
    const metrics = this.calculation.calculate({
      timezone,
      workDate,
      shift,
      clockInAt: record.clockInAt,
      clockOutAt: record.clockOutAt,
      breakMinutes,
    });

    await this.prisma.attendanceRecord.update({
      where: { id: recordId },
      data: {
        shiftTemplateId: shift?.id,
        workedMinutes: metrics.workedMinutes,
        lateMinutes: metrics.lateMinutes,
        overtimeMinutes: metrics.overtimeMinutes,
        earlyDepartureMinutes: metrics.earlyDepartureMinutes,
        missingClockOut: metrics.missingClockOut,
        breakMinutes,
        status: metrics.status,
      },
    });

    return this.findRecordById(organizationId, recordId);
  }

  private async findRecordById(organizationId: string, id: string) {
    const record = await this.prisma.attendanceRecord.findFirst({
      where: { id, organizationId },
      include: this.recordInclude,
    });
    if (!record) notFoundInTenant('Attendance record');
    return this.serializeRecord(record!);
  }

  private serializeRecord(
    record: Prisma.AttendanceRecordGetPayload<{
      include: typeof AttendanceService.prototype.recordInclude;
    }>,
  ) {
    return {
      ...record,
      workDate: workDateFromStorage(record.workDate),
    };
  }
}
