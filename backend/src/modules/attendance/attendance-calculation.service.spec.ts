import { describe, it, expect } from 'vitest';
import { AttendanceStatus } from '@prisma/client';
import { AttendanceCalculationService } from './attendance-calculation.service.js';

describe('AttendanceCalculationService', () => {
  const service = new AttendanceCalculationService();

  const shift = {
    id: 's1',
    organizationId: 'org',
    name: 'Standard',
    startTime: '09:00',
    endTime: '17:00',
    breakDurationMinutes: 60,
    workingDays: [1, 2, 3, 4, 5],
    gracePeriodMinutes: 15,
    overtimeThresholdMinutes: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('marks weekend when shift does not cover day', () => {
    const result = service.calculate({
      timezone: 'UTC',
      workDate: '2025-09-28',
      shift,
      clockInAt: null,
      clockOutAt: null,
      breakMinutes: 0,
    });
    expect(result.status).toBe(AttendanceStatus.WEEKEND);
  });

  it('computes late minutes after grace', () => {
    const workDate = '2025-09-29';
    const clockInAt = new Date('2025-09-29T09:20:00.000Z');
    const clockOutAt = new Date('2025-09-29T17:00:00.000Z');
    const result = service.calculate({
      timezone: 'UTC',
      workDate,
      shift,
      clockInAt,
      clockOutAt,
      breakMinutes: 0,
    });
    expect(result.lateMinutes).toBe(5);
    expect(result.status).toBe(AttendanceStatus.LATE);
  });

  it('computes overtime beyond scheduled duration', () => {
    const workDate = '2025-09-29';
    const clockInAt = new Date('2025-09-29T09:00:00.000Z');
    const clockOutAt = new Date('2025-09-29T18:00:00.000Z');
    const result = service.calculate({
      timezone: 'UTC',
      workDate,
      shift,
      clockInAt,
      clockOutAt,
      breakMinutes: 0,
    });
    expect(result.workedMinutes).toBe(540);
    expect(result.overtimeMinutes).toBe(120);
  });
});
