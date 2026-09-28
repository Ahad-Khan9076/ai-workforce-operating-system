import type {
  SalaryCalculationMethod,
  SalaryComponentCategory,
  SalaryComponentType,
} from '@prisma/client';

export interface PayrollBreakdownLine {
  code: string;
  name: string;
  componentType: SalaryComponentType;
  category: SalaryComponentCategory;
  amount: number;
  taxable: boolean;
  source: 'component' | 'adjustment' | 'attendance' | 'loan';
  componentId?: string;
  metadata?: Record<string, unknown>;
}

export interface PayrollAttendanceSnapshot {
  workedDays: number;
  absentDays: number;
  unpaidLeaveDays: number;
  overtimeMinutes: number;
  periodCalendarDays: number;
  standardWorkingDays: number;
}

export interface PayrollComponentConfig {
  id: string;
  code: string;
  name: string;
  componentType: SalaryComponentType;
  category: SalaryComponentCategory;
  calculationMethod: SalaryCalculationMethod;
  fixedAmount: number;
  percentage: number;
  isTaxable: boolean;
  sortOrder: number;
}

export interface PayrollAdjustmentInput {
  label: string;
  amount: number;
  componentType: SalaryComponentType;
  componentId?: string | null;
}

export interface EmployeePayrollCalculationInput {
  employeeId: string;
  baseAmount: number;
  currency: string;
  components: PayrollComponentConfig[];
  adjustments: PayrollAdjustmentInput[];
  attendance: PayrollAttendanceSnapshot;
  loanInstallment: number;
}

export interface EmployeePayrollCalculationResult {
  grossAmount: number;
  totalDeductions: number;
  netAmount: number;
  taxableAmount: number;
  breakdown: PayrollBreakdownLine[];
  attendanceMeta: PayrollAttendanceSnapshot;
}
