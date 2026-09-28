import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { PayrollPeriodStatus } from '@prisma/client';
import { assertPayrollPeriodEditable } from './payroll-lock.guard.js';

describe('payroll lock guard', () => {
  it('blocks edits on locked payroll', () => {
    expect(() =>
      assertPayrollPeriodEditable({
        status: PayrollPeriodStatus.LOCKED,
        lockedAt: new Date(),
      }),
    ).toThrow(BadRequestException);
  });

  it('allows edits on draft payroll', () => {
    expect(() =>
      assertPayrollPeriodEditable({
        status: PayrollPeriodStatus.DRAFT,
        lockedAt: null,
      }),
    ).not.toThrow();
  });
});
