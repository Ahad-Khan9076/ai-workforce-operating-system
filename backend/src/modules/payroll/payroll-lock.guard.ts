import { BadRequestException } from '@nestjs/common';
import { PayrollPeriodStatus, type PayrollPeriod } from '@prisma/client';

const LOCKED_STATUSES: PayrollPeriodStatus[] = [
  PayrollPeriodStatus.LOCKED,
  PayrollPeriodStatus.PAID,
];

export function assertPayrollPeriodEditable(period: Pick<PayrollPeriod, 'status' | 'lockedAt'>) {
  if (
    period.status === PayrollPeriodStatus.LOCKED ||
    period.lockedAt ||
    period.status === PayrollPeriodStatus.PAID
  ) {
    throw new BadRequestException('Payroll period is locked and cannot be modified');
  }
}

export function assertPayrollPeriodNotLocked(period: Pick<PayrollPeriod, 'status'>) {
  if (LOCKED_STATUSES.includes(period.status)) {
    throw new BadRequestException('Payroll period is locked');
  }
}
