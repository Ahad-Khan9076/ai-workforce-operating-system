-- Phase 4: Modular payroll engine

CREATE TYPE "SalaryComponentType" AS ENUM ('EARNING', 'DEDUCTION');
CREATE TYPE "SalaryComponentCategory" AS ENUM ('BASIC', 'ALLOWANCE', 'BONUS', 'COMMISSION', 'OVERTIME', 'TAX', 'LOAN', 'UNPAID_LEAVE', 'OTHER_DEDUCTION');
CREATE TYPE "SalaryCalculationMethod" AS ENUM ('FIXED', 'PERCENTAGE_OF_BASE', 'PERCENTAGE_OF_GROSS', 'PER_DAY', 'PER_HOUR', 'ATTENDANCE_DERIVED');
CREATE TYPE "PayrollPeriodStatus" AS ENUM ('DRAFT', 'PROCESSING', 'REVIEW', 'APPROVED', 'PAID', 'LOCKED');
CREATE TYPE "EmployeeLoanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

CREATE TABLE "salary_structures" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "salary_structures_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "salary_components" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "salaryStructureId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "componentType" "SalaryComponentType" NOT NULL,
    "category" "SalaryComponentCategory" NOT NULL,
    "calculationMethod" "SalaryCalculationMethod" NOT NULL,
    "fixedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isTaxable" BOOLEAN NOT NULL DEFAULT false,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "salary_components_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_salaries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "salaryStructureId" TEXT NOT NULL,
    "baseAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "employee_salaries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payroll_periods" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'DRAFT',
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payroll_runs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "payrollPeriodId" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3),
    "calculatedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payroll_items" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "grossAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxableAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "breakdown" JSONB NOT NULL,
    "attendanceMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payroll_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payroll_adjustments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "componentId" TEXT,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "componentType" "SalaryComponentType" NOT NULL,
    "reason" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payroll_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payslips" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "payrollPeriodId" TEXT NOT NULL,
    "payrollItemId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "slipNumber" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdfStorageKey" TEXT,
    "snapshot" JSONB NOT NULL,
    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_loans" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "principalAmount" DOUBLE PRECISION NOT NULL,
    "installmentAmount" DOUBLE PRECISION NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "remainingBalance" DOUBLE PRECISION NOT NULL,
    "status" "EmployeeLoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "employee_loans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "salary_structures_organizationId_name_key" ON "salary_structures"("organizationId", "name");
CREATE UNIQUE INDEX "salary_components_salaryStructureId_code_key" ON "salary_components"("salaryStructureId", "code");
CREATE INDEX "salary_components_organizationId_salaryStructureId_idx" ON "salary_components"("organizationId", "salaryStructureId");
CREATE INDEX "employee_salaries_organizationId_employeeId_effectiveFrom_idx" ON "employee_salaries"("organizationId", "employeeId", "effectiveFrom");
CREATE UNIQUE INDEX "payroll_periods_organizationId_startDate_endDate_key" ON "payroll_periods"("organizationId", "startDate", "endDate");
CREATE INDEX "payroll_periods_organizationId_status_idx" ON "payroll_periods"("organizationId", "status");
CREATE INDEX "payroll_runs_organizationId_payrollPeriodId_idx" ON "payroll_runs"("organizationId", "payrollPeriodId");
CREATE UNIQUE INDEX "payroll_items_payrollRunId_employeeId_key" ON "payroll_items"("payrollRunId", "employeeId");
CREATE INDEX "payroll_items_organizationId_employeeId_idx" ON "payroll_items"("organizationId", "employeeId");
CREATE INDEX "payroll_adjustments_payrollRunId_employeeId_idx" ON "payroll_adjustments"("payrollRunId", "employeeId");
CREATE UNIQUE INDEX "payslips_payrollItemId_key" ON "payslips"("payrollItemId");
CREATE UNIQUE INDEX "payslips_organizationId_slipNumber_key" ON "payslips"("organizationId", "slipNumber");
CREATE INDEX "payslips_organizationId_employeeId_idx" ON "payslips"("organizationId", "employeeId");
CREATE INDEX "employee_loans_organizationId_employeeId_status_idx" ON "employee_loans"("organizationId", "employeeId", "status");

ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "salary_components" ADD CONSTRAINT "salary_components_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "salary_components" ADD CONSTRAINT "salary_components_salaryStructureId_fkey" FOREIGN KEY ("salaryStructureId") REFERENCES "salary_structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_salaries" ADD CONSTRAINT "employee_salaries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_salaries" ADD CONSTRAINT "employee_salaries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_salaries" ADD CONSTRAINT "employee_salaries_salaryStructureId_fkey" FOREIGN KEY ("salaryStructureId") REFERENCES "salary_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "salary_components"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payrollItemId_fkey" FOREIGN KEY ("payrollItemId") REFERENCES "payroll_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_loans" ADD CONSTRAINT "employee_loans_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_loans" ADD CONSTRAINT "employee_loans_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
