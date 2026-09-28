import { Injectable } from '@nestjs/common';
import {
  AttendanceStatus,
  EmploymentStatus,
  LeaveRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { toWorkDateStorage } from '../workforce/workforce-date.util.js';
import type { PayrollAttendanceSnapshot } from './engine/payroll.types.js';

function countWeekdaysBetween(start: Date, end: Date): number {
  let count = 0;
  const cursor = new Date(start);
  const endUtc = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate(),
  );
  while (
    Date.UTC(
      cursor.getUTCFullYear(),
      cursor.getUTCMonth(),
      cursor.getUTCDate(),
    ) <= endUtc
  ) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

function calendarDaysInclusive(start: Date, end: Date): number {
  const startMs = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
  );
  const endMs = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate(),
  );
  return Math.floor((endMs - startMs) / 86400000) + 1;
}

@Injectable()
export class AttendancePayrollDataService {
  constructor(private readonly prisma: PrismaService) {}

  async getEmployeeAttendanceSnapshot(
    organizationId: string,
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<PayrollAttendanceSnapshot> {
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        organizationId,
        employeeId,
        workDate: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    let workedDays = 0;
    let absentDays = 0;
    let overtimeMinutes = 0;

    for (const record of records) {
      overtimeMinutes += record.overtimeMinutes;
      if (
        record.clockInAt ||
        record.status === AttendanceStatus.PRESENT ||
        record.status === AttendanceStatus.LATE ||
        record.status === AttendanceStatus.HALF_DAY
      ) {
        workedDays += 1;
      } else if (
        record.status === AttendanceStatus.ABSENT &&
        !record.clockInAt
      ) {
        absentDays += 1;
      }
    }

    const unpaidLeaveDays = await this.countUnpaidLeaveDays(
      organizationId,
      employeeId,
      periodStart,
      periodEnd,
    );

    const standardWorkingDays = countWeekdaysBetween(periodStart, periodEnd);

    return {
      workedDays,
      absentDays,
      unpaidLeaveDays,
      overtimeMinutes,
      periodCalendarDays: calendarDaysInclusive(periodStart, periodEnd),
      standardWorkingDays,
    };
  }

  private async countUnpaidLeaveDays(
    organizationId: string,
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    const requests = await this.prisma.leaveRequest.findMany({
      where: {
        organizationId,
        employeeId,
        status: LeaveRequestStatus.APPROVED,
        startDate: { lte: periodEnd },
        endDate: { gte: periodStart },
        leaveType: { isPaid: false },
      },
      include: { leaveType: true },
    });

    let days = 0;
    for (const req of requests) {
      const start = req.startDate > periodStart ? req.startDate : periodStart;
      const end = req.endDate < periodEnd ? req.endDate : periodEnd;
      days += calendarDaysInclusive(start, end);
    }
    return days;
  }

  async listPayrollEligibleEmployeeIds(
    organizationId: string,
    periodEnd: Date,
  ): Promise<string[]> {
    const salaries = await this.prisma.employeeSalary.findMany({
      where: {
        organizationId,
        effectiveFrom: { lte: periodEnd },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodEnd } }],
        employee: { employmentStatus: EmploymentStatus.ACTIVE },
      },
      select: { employeeId: true },
      distinct: ['employeeId'],
    });
    return salaries.map((s) => s.employeeId);
  }
}
