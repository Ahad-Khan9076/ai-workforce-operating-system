-- Phase 2: Organization structure & employees

CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'PROBATION', 'SUSPENDED', 'TERMINATED', 'RESIGNED');
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY');
CREATE TYPE "SkillProficiency" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');
CREATE TYPE "EmployeeSkillSource" AS ENUM ('SELF_REPORTED', 'MANAGER', 'HR', 'SYSTEM', 'CERTIFICATION');
CREATE TYPE "TimelineEventType" AS ENUM ('HIRED', 'PROMOTION', 'DEPARTMENT_CHANGE', 'MANAGER_CHANGE', 'SALARY_CHANGE', 'LEAVE', 'TRAINING', 'PERFORMANCE_REVIEW', 'DOCUMENT', 'OTHER');
CREATE TYPE "DocumentVisibility" AS ENUM ('HR_ONLY', 'MANAGER', 'EMPLOYEE', 'ORGANIZATION');

CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "managerEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "leadEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "job_titles" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "job_titles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "userId" TEXT,
    "membershipId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "preferredName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "profilePhotoUrl" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "jobTitleId" TEXT,
    "departmentId" TEXT,
    "teamId" TEXT,
    "managerId" TEXT,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "employmentStatus" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinDate" TIMESTAMP(3),
    "probationEndDate" TIMESTAMP(3),
    "workLocation" TEXT,
    "address" JSONB,
    "emergencyContact" JSONB,
    "bio" TEXT,
    "certifications" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobTitleId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "teamId" TEXT,
    "code" TEXT,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "employeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_timeline_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "eventType" "TimelineEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_timeline_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_documents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "storageKey" TEXT,
    "uploadedByUserId" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "visibility" "DocumentVisibility" NOT NULL DEFAULT 'HR_ONLY',
    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skill_categories" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "skill_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_skills" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "proficiency" "SkillProficiency" NOT NULL,
    "yearsExperience" DOUBLE PRECISION,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "source" "EmployeeSkillSource" NOT NULL DEFAULT 'HR',
    CONSTRAINT "employee_skills_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "departments_organizationId_code_key" ON "departments"("organizationId", "code");
CREATE INDEX "departments_organizationId_name_idx" ON "departments"("organizationId", "name");
CREATE UNIQUE INDEX "teams_departmentId_name_key" ON "teams"("departmentId", "name");
CREATE INDEX "teams_organizationId_idx" ON "teams"("organizationId");
CREATE UNIQUE INDEX "job_titles_organizationId_title_key" ON "job_titles"("organizationId", "title");
CREATE UNIQUE INDEX "employees_organizationId_employeeNumber_key" ON "employees"("organizationId", "employeeNumber");
CREATE UNIQUE INDEX "employees_organizationId_email_key" ON "employees"("organizationId", "email");
CREATE UNIQUE INDEX "employees_membershipId_key" ON "employees"("membershipId");
CREATE INDEX "employees_organizationId_employmentStatus_idx" ON "employees"("organizationId", "employmentStatus");
CREATE INDEX "employees_organizationId_departmentId_idx" ON "employees"("organizationId", "departmentId");
CREATE INDEX "employees_organizationId_managerId_idx" ON "employees"("organizationId", "managerId");
CREATE INDEX "employees_organizationId_lastName_firstName_idx" ON "employees"("organizationId", "lastName", "firstName");
CREATE UNIQUE INDEX "positions_employeeId_key" ON "positions"("employeeId");
CREATE INDEX "positions_organizationId_idx" ON "positions"("organizationId");
CREATE INDEX "employee_timeline_events_organizationId_employeeId_occurredAt_idx" ON "employee_timeline_events"("organizationId", "employeeId", "occurredAt");
CREATE INDEX "employee_documents_organizationId_employeeId_idx" ON "employee_documents"("organizationId", "employeeId");
CREATE UNIQUE INDEX "skill_categories_organizationId_name_key" ON "skill_categories"("organizationId", "name");
CREATE UNIQUE INDEX "skills_organizationId_name_key" ON "skills"("organizationId", "name");
CREATE UNIQUE INDEX "employee_skills_employeeId_skillId_key" ON "employee_skills"("employeeId", "skillId");

ALTER TABLE "departments" ADD CONSTRAINT "departments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teams" ADD CONSTRAINT "teams_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teams" ADD CONSTRAINT "teams_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_titles" ADD CONSTRAINT "job_titles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "organization_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "job_titles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "positions" ADD CONSTRAINT "positions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "positions" ADD CONSTRAINT "positions_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "job_titles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "positions" ADD CONSTRAINT "positions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "positions" ADD CONSTRAINT "positions_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "positions" ADD CONSTRAINT "positions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employee_timeline_events" ADD CONSTRAINT "employee_timeline_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_timeline_events" ADD CONSTRAINT "employee_timeline_events_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_timeline_events" ADD CONSTRAINT "employee_timeline_events_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "skill_categories" ADD CONSTRAINT "skill_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skills" ADD CONSTRAINT "skills_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skills" ADD CONSTRAINT "skills_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "skill_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employee_skills" ADD CONSTRAINT "employee_skills_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_skills" ADD CONSTRAINT "employee_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "departments" ADD CONSTRAINT "departments_managerEmployeeId_fkey" FOREIGN KEY ("managerEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "teams" ADD CONSTRAINT "teams_leadEmployeeId_fkey" FOREIGN KEY ("leadEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "permissions" ("id", "code", "description", "createdAt")
SELECT gen_random_uuid()::text, 'department.read', 'department read', NOW()
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "code" = 'department.read');

INSERT INTO "permissions" ("id", "code", "description", "createdAt")
SELECT gen_random_uuid()::text, 'department.manage', 'department manage', NOW()
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "code" = 'department.manage');
