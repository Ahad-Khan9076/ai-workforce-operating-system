import { Injectable } from '@nestjs/common';
import { AttendanceStatus } from '@prisma/client';
import type { ShiftTemplate } from '@prisma/client';
import {
  combineOrgDateAndTime,
  diffMinutes,
  isWorkingDay,
} from '../workforce/workforce-time.util.js';

export interface AttendanceMetricsInput {
  timezone: string;
  workDate: string;
  shift: ShiftTemplate | null;
  clockInAt: Date | null;
  clockOutAt: Date | null;
  breakMinutes: number;
}

export interface AttendanceMetrics {
  workedMinutes: number;
  lateMinutes: number;
  overtimeMinutes: number;
  earlyDepartureMinutes: number;
  missingClockOut: boolean;
  status: AttendanceStatus;
}

@Injectable()
export class AttendanceCalculationService {
  calculate(input: AttendanceMetricsInput): AttendanceMetrics {
    const { timezone, workDate, shift, clockInAt, clockOutAt, breakMinutes } =
      input;

    if (shift && !isWorkingDay(workDate, shift.workingDays as number[], timezone)) {
      return {
        workedMinutes: 0,
        lateMinutes: 0,
        overtimeMinutes: 0,
        earlyDepartureMinutes: 0,
        missingClockOut: false,
        status: AttendanceStatus.WEEKEND,
      };
    }

    if (!clockInAt) {
      return {
        workedMinutes: 0,
        lateMinutes: 0,
        overtimeMinutes: 0,
        earlyDepartureMinutes: 0,
        missingClockOut: false,
        status: AttendanceStatus.ABSENT,
      };
    }

    const missingClockOut = !clockOutAt;
    const effectiveClockOut = clockOutAt ?? new Date();

    let workedMinutes = diffMinutes(clockInAt, effectiveClockOut) - breakMinutes;
    workedMinutes = Math.max(0, workedMinutes);

    let lateMinutes = 0;
    let earlyDepartureMinutes = 0;
    let overtimeMinutes = 0;
    let scheduledMinutes = 0;

    if (shift) {
      const shiftStart = combineOrgDateAndTime(
        workDate,
        shift.startTime,
        timezone,
      );
      const shiftEnd = combineOrgDateAndTime(workDate, shift.endTime, timezone);
      scheduledMinutes = Math.max(
        0,
        diffMinutes(shiftStart, shiftEnd) - shift.breakDurationMinutes,
      );

      const graceEnd = new Date(
        shiftStart.getTime() + shift.gracePeriodMinutes * 60000,
      );
      if (clockInAt > graceEnd) {
        lateMinutes = diffMinutes(graceEnd, clockInAt);
      }

      if (clockOutAt && clockOutAt < shiftEnd) {
        earlyDepartureMinutes = diffMinutes(clockOutAt, shiftEnd);
      }

      const overtimeBase = scheduledMinutes + shift.overtimeThresholdMinutes;
      if (workedMinutes > overtimeBase) {
        overtimeMinutes = workedMinutes - overtimeBase;
      }
    }

    let status: AttendanceStatus = AttendanceStatus.PRESENT;
    if (lateMinutes > 0) {
      status = AttendanceStatus.LATE;
    }
    if (scheduledMinutes > 0 && workedMinutes < scheduledMinutes / 2) {
      status = AttendanceStatus.HALF_DAY;
    }

    return {
      workedMinutes,
      lateMinutes,
      overtimeMinutes,
      earlyDepartureMinutes,
      missingClockOut,
      status,
    };
  }
}
