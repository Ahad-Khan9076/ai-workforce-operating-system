import {
  SalaryCalculationMethod,
  SalaryComponentCategory,
  SalaryComponentType,
} from '@prisma/client';
import type {
  EmployeePayrollCalculationInput,
  EmployeePayrollCalculationResult,
  PayrollBreakdownLine,
  PayrollComponentConfig,
} from './payroll.types.js';

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function hourlyRate(baseAmount: number, workingDays: number, hoursPerDay = 8): number {
  const hours = workingDays * hoursPerDay;
  if (hours <= 0) return 0;
  return baseAmount / hours;
}

function dailyRate(baseAmount: number, workingDays: number): number {
  if (workingDays <= 0) return 0;
  return baseAmount / workingDays;
}

function calculateComponentAmount(
  component: PayrollComponentConfig,
  ctx: {
    baseAmount: number;
    grossBeforeTax: number;
    taxableEarnings: number;
    attendance: EmployeePayrollCalculationInput['attendance'];
    loanInstallment: number;
  },
): number {
  const { baseAmount, attendance, loanInstallment } = ctx;
  const workingDays = attendance.standardWorkingDays;

  if (component.category === SalaryComponentCategory.BASIC) {
    return roundMoney(baseAmount);
  }

  switch (component.calculationMethod) {
    case SalaryCalculationMethod.FIXED:
      return roundMoney(component.fixedAmount);

    case SalaryCalculationMethod.PERCENTAGE_OF_BASE:
      return roundMoney((baseAmount * component.percentage) / 100);

    case SalaryCalculationMethod.PERCENTAGE_OF_GROSS:
      return roundMoney((ctx.grossBeforeTax * component.percentage) / 100);

    case SalaryCalculationMethod.PER_DAY:
      return roundMoney(component.fixedAmount * attendance.periodCalendarDays);

    case SalaryCalculationMethod.PER_HOUR: {
      const rate =
        component.fixedAmount > 0
          ? component.fixedAmount
          : hourlyRate(baseAmount, workingDays);
      const hours = attendance.overtimeMinutes / 60;
      return roundMoney(rate * hours);
    }

    case SalaryCalculationMethod.ATTENDANCE_DERIVED:
      if (component.category === SalaryComponentCategory.OVERTIME) {
        const rate =
          component.fixedAmount > 0
            ? component.fixedAmount
            : hourlyRate(baseAmount, workingDays);
        return roundMoney(rate * (attendance.overtimeMinutes / 60));
      }
      if (component.category === SalaryComponentCategory.UNPAID_LEAVE) {
        const rate =
          component.fixedAmount > 0
            ? component.fixedAmount
            : dailyRate(baseAmount, workingDays);
        return roundMoney(rate * attendance.unpaidLeaveDays);
      }
      if (component.category === SalaryComponentCategory.LOAN) {
        return roundMoney(loanInstallment);
      }
      return 0;

    default:
      return 0;
  }
}

function lineFromComponent(
  component: PayrollComponentConfig,
  amount: number,
  source: PayrollBreakdownLine['source'] = 'component',
): PayrollBreakdownLine {
  return {
    code: component.code,
    name: component.name,
    componentType: component.componentType,
    category: component.category,
    amount: roundMoney(amount),
    taxable: component.isTaxable,
    source,
    componentId: component.id,
  };
}

export class PayrollCalculationEngine {
  calculate(input: EmployeePayrollCalculationInput): EmployeePayrollCalculationResult {
    const breakdown: PayrollBreakdownLine[] = [];
    const sorted = [...input.components].sort((a, b) => a.sortOrder - b.sortOrder);

    const passOneComponents = sorted.filter(
      (c) =>
        c.calculationMethod !== SalaryCalculationMethod.PERCENTAGE_OF_GROSS &&
        c.category !== SalaryComponentCategory.TAX,
    );
    const taxComponents = sorted.filter((c) => c.category === SalaryComponentCategory.TAX);
    const grossComponents = sorted.filter(
      (c) => c.calculationMethod === SalaryCalculationMethod.PERCENTAGE_OF_GROSS,
    );

    let grossBeforeTax = 0;
    let taxableEarnings = 0;

    const ctxBase = {
      baseAmount: input.baseAmount,
      grossBeforeTax: 0,
      taxableEarnings: 0,
      attendance: input.attendance,
      loanInstallment: input.loanInstallment,
    };

    for (const component of passOneComponents) {
      const amount = calculateComponentAmount(component, {
        ...ctxBase,
        grossBeforeTax,
        taxableEarnings,
      });
      if (amount === 0 && component.category !== SalaryComponentCategory.BASIC) {
        continue;
      }
      const line = lineFromComponent(component, amount);
      breakdown.push(line);
      if (component.componentType === SalaryComponentType.EARNING) {
        grossBeforeTax = roundMoney(grossBeforeTax + amount);
        if (component.isTaxable) {
          taxableEarnings = roundMoney(taxableEarnings + amount);
        }
      }
    }

    for (const adjustment of input.adjustments) {
      const line: PayrollBreakdownLine = {
        code: 'ADJ',
        name: adjustment.label,
        componentType: adjustment.componentType,
        category:
          adjustment.componentType === SalaryComponentType.EARNING
            ? SalaryComponentCategory.BONUS
            : SalaryComponentCategory.OTHER_DEDUCTION,
        amount: roundMoney(adjustment.amount),
        taxable: adjustment.componentType === SalaryComponentType.EARNING,
        source: 'adjustment',
        componentId: adjustment.componentId ?? undefined,
      };
      breakdown.push(line);
      if (adjustment.componentType === SalaryComponentType.EARNING) {
        grossBeforeTax = roundMoney(grossBeforeTax + adjustment.amount);
        taxableEarnings = roundMoney(taxableEarnings + adjustment.amount);
      }
    }

    ctxBase.grossBeforeTax = grossBeforeTax;
    ctxBase.taxableEarnings = taxableEarnings;

    for (const component of grossComponents) {
      const amount = calculateComponentAmount(component, {
        ...ctxBase,
        grossBeforeTax,
        taxableEarnings,
      });
      if (amount === 0) continue;
      breakdown.push(lineFromComponent(component, amount));
    }

    for (const component of taxComponents) {
      const taxBase = taxableEarnings;
      let finalAmount = 0;
      if (
        component.calculationMethod === SalaryCalculationMethod.FIXED &&
        component.fixedAmount > 0
      ) {
        finalAmount = component.fixedAmount;
      } else if (component.percentage > 0) {
        finalAmount = roundMoney((taxBase * component.percentage) / 100);
      }
      if (finalAmount === 0) continue;
      breakdown.push(lineFromComponent(component, finalAmount));
    }

    let grossAmount = 0;
    let totalDeductions = 0;
    for (const line of breakdown) {
      if (line.componentType === SalaryComponentType.EARNING) {
        grossAmount = roundMoney(grossAmount + line.amount);
      } else {
        totalDeductions = roundMoney(totalDeductions + line.amount);
      }
    }

    const netAmount = roundMoney(grossAmount - totalDeductions);

    return {
      grossAmount,
      totalDeductions,
      netAmount,
      taxableAmount: taxableEarnings,
      breakdown,
      attendanceMeta: input.attendance,
    };
  }
}
