-- Phase 3: Shifts, attendance, leave

CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'WEEKEND');
CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "AttendanceCorrectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "shift_templates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "breakDurationMinutes" INTEGER NOT NULL DEFAULT 0,
    "workingDays" JSONB NOT NULL,
    "gracePeriodMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeThresholdMinutes" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shift_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_shift_assignments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "shiftTemplateId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_shift_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "shiftTemplateId" TEXT,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'ABSENT',
    "clockInAt" TIMESTAMP(3),
    "clockOutAt" TIMESTAMP(3),
    "workedMinutes" INTEGER NOT NULL DEFAULT 0,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "earlyDepartureMinutes" INTEGER NOT NULL DEFAULT 0,
    "missingClockOut" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_breaks" (
    "id" TEXT NOT NULL,
    "attendanceRecordId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    CONSTRAINT "attendance_breaks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_corrections" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "attendanceRecordId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "proposedClockInAt" TIMESTAMP(3),
    "proposedClockOutAt" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "status" "AttendanceCorrectionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_corrections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leave_types" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leave_policies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "defaultAnnualDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leave_balances" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "allocated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "used" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pending" DOUBLE PRECISION NOT NULL DEFAULT 0,
    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalDays" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "approverUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shift_templates_organizationId_name_key" ON "shift_templates"("organizationId", "name");
CREATE INDEX "employee_shift_assignments_organizationId_employeeId_effectiveFrom_idx" ON "employee_shift_assignments"("organizationId", "employeeId", "effectiveFrom");
CREATE UNIQUE INDEX "attendance_records_organizationId_employeeId_workDate_key" ON "attendance_records"("organizationId", "employeeId", "workDate");
CREATE INDEX "attendance_records_organizationId_workDate_status_idx" ON "attendance_records"("organizationId", "workDate", "status");
CREATE INDEX "attendance_breaks_attendanceRecordId_idx" ON "attendance_breaks"("attendanceRecordId");
CREATE INDEX "attendance_corrections_organizationId_status_idx" ON "attendance_corrections"("organizationId", "status");
CREATE UNIQUE INDEX "leave_types_organizationId_code_key" ON "leave_types"("organizationId", "code");
CREATE UNIQUE INDEX "leave_policies_organizationId_leaveTypeId_key" ON "leave_policies"("organizationId", "leaveTypeId");
CREATE UNIQUE INDEX "leave_balances_employeeId_leaveTypeId_year_key" ON "leave_balances"("employeeId", "leaveTypeId", "year");
CREATE INDEX "leave_balances_organizationId_employeeId_year_idx" ON "leave_balances"("organizationId", "employeeId", "year");
CREATE INDEX "leave_requests_organizationId_status_idx" ON "leave_requests"("organizationId", "status");
CREATE INDEX "leave_requests_organizationId_employeeId_idx" ON "leave_requests"("organizationId", "employeeId");

ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "employee_shift_assignments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "employee_shift_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "employee_shift_assignments_shiftTemplateId_fkey" FOREIGN KEY ("shiftTemplateId") REFERENCES "shift_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_shiftTemplateId_fkey" FOREIGN KEY ("shiftTemplateId") REFERENCES "shift_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_breaks" ADD CONSTRAINT "attendance_breaks_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_types" ADD CONSTRAINT "leave_types_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_policies" ADD CONSTRAINT "leave_policies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_policies" ADD CONSTRAINT "leave_policies_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
