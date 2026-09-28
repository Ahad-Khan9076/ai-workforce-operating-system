import { describe, it, expect } from 'vitest';
import {
  SalaryCalculationMethod,
  SalaryComponentCategory,
  SalaryComponentType,
} from '@prisma/client';
import { PayrollCalculationEngine } from './payroll-calculation.engine.js';
import type { PayrollComponentConfig } from './payroll.types.js';

const engine = new PayrollCalculationEngine();

function component(
  partial: Partial<PayrollComponentConfig> & Pick<PayrollComponentConfig, 'code' | 'category'>,
): PayrollComponentConfig {
  return {
    id: partial.code,
    name: partial.code,
    componentType:
      partial.componentType ??
      (partial.category === SalaryComponentCategory.TAX ||
      partial.category === SalaryComponentCategory.UNPAID_LEAVE ||
      partial.category === SalaryComponentCategory.LOAN
        ? SalaryComponentType.DEDUCTION
        : SalaryComponentType.EARNING),
    calculationMethod: SalaryCalculationMethod.FIXED,
    fixedAmount: 0,
    percentage: 0,
    isTaxable: false,
    sortOrder: 0,
    ...partial,
  };
}

const attendance = {
  workedDays: 20,
  absentDays: 1,
  unpaidLeaveDays: 2,
  overtimeMinutes: 120,
  periodCalendarDays: 30,
  standardWorkingDays: 22,
};

describe('PayrollCalculationEngine', () => {
  it('calculates basic salary as gross foundation', () => {
    const result = engine.calculate({
      employeeId: 'e1',
      baseAmount: 5000,
      currency: 'USD',
      components: [
        component({
          code: 'BASIC',
          category: SalaryComponentCategory.BASIC,
          calculationMethod: SalaryCalculationMethod.FIXED,
          sortOrder: 10,
        }),
      ],
      adjustments: [],
      attendance,
      loanInstallment: 0,
    });
    expect(result.grossAmount).toBe(5000);
    expect(result.netAmount).toBe(5000);
  });

  it('adds fixed allowance and bonus adjustment', () => {
    const result = engine.calculate({
      employeeId: 'e1',
      baseAmount: 4000,
      currency: 'USD',
      components: [
        component({
          code: 'BASIC',
          category: SalaryComponentCategory.BASIC,
          sortOrder: 10,
        }),
        component({
          code: 'ALLOW',
          category: SalaryComponentCategory.ALLOWANCE,
          fixedAmount: 500,
          sortOrder: 20,
        }),
      ],
      adjustments: [
        {
          label: 'Performance bonus',
          amount: 300,
          componentType: SalaryComponentType.EARNING,
        },
      ],
      attendance,
      loanInstallment: 0,
    });
    expect(result.grossAmount).toBe(4800);
    expect(result.netAmount).toBe(4800);
  });

  it('computes overtime from attendance minutes', () => {
    const result = engine.calculate({
      employeeId: 'e1',
      baseAmount: 4400,
      currency: 'USD',
      components: [
        component({
          code: 'BASIC',
          category: SalaryComponentCategory.BASIC,
          sortOrder: 10,
        }),
        component({
          code: 'OT',
          category: SalaryComponentCategory.OVERTIME,
          calculationMethod: SalaryCalculationMethod.ATTENDANCE_DERIVED,
          sortOrder: 30,
        }),
      ],
      adjustments: [],
      attendance: { ...attendance, overtimeMinutes: 60 },
      loanInstallment: 0,
    });
    const ot = result.breakdown.find((l) => l.category === 'OVERTIME');
    expect(ot?.amount).toBeGreaterThan(0);
    expect(result.grossAmount).toBeGreaterThan(4400);
  });

  it('deducts unpaid leave, loan, and tax consistently', () => {
    const result = engine.calculate({
      employeeId: 'e1',
      baseAmount: 2200,
      currency: 'USD',
      components: [
        component({
          code: 'BASIC',
          category: SalaryComponentCategory.BASIC,
          isTaxable: true,
          sortOrder: 10,
        }),
        component({
          code: 'UNPAID',
          category: SalaryComponentCategory.UNPAID_LEAVE,
          calculationMethod: SalaryCalculationMethod.ATTENDANCE_DERIVED,
          sortOrder: 110,
        }),
        component({
          code: 'LOAN',
          category: SalaryComponentCategory.LOAN,
          calculationMethod: SalaryCalculationMethod.ATTENDANCE_DERIVED,
          sortOrder: 120,
        }),
        component({
          code: 'TAX',
          category: SalaryComponentCategory.TAX,
          componentType: SalaryComponentType.DEDUCTION,
          percentage: 10,
          sortOrder: 200,
        }),
      ],
      adjustments: [],
      attendance: { ...attendance, unpaidLeaveDays: 1, overtimeMinutes: 0 },
      loanInstallment: 100,
    });

    const unpaid = result.breakdown.find((l) => l.category === 'UNPAID_LEAVE')!.amount;
    const loan = result.breakdown.find((l) => l.category === 'LOAN')!.amount;
    const tax = result.breakdown.find((l) => l.category === 'TAX')!.amount;

    expect(loan).toBe(100);
    expect(unpaid).toBeGreaterThan(0);
    expect(tax).toBe(220);
    expect(result.netAmount).toBe(
      Math.round((result.grossAmount - result.totalDeductions) * 100) / 100,
    );
    expect(result.netAmount).toBe(result.grossAmount - result.totalDeductions);
  });

  it('applies percentage allowance on base', () => {
    const result = engine.calculate({
      employeeId: 'e1',
      baseAmount: 1000,
      currency: 'USD',
      components: [
        component({
          code: 'BASIC',
          category: SalaryComponentCategory.BASIC,
          sortOrder: 10,
        }),
        component({
          code: 'COMM',
          category: SalaryComponentCategory.COMMISSION,
          calculationMethod: SalaryCalculationMethod.PERCENTAGE_OF_BASE,
          percentage: 5,
          sortOrder: 20,
        }),
      ],
      adjustments: [],
      attendance,
      loanInstallment: 0,
    });
    expect(result.grossAmount).toBe(1050);
  });
});
