-- CreateEnum
CREATE TYPE "WorkforceRiskCategory" AS ENUM ('ATTENDANCE', 'OVERTIME', 'PERFORMANCE', 'TRAINING', 'PAYROLL', 'SKILLS', 'WORKLOAD');
CREATE TYPE "WorkforceRiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "role_skill_requirements" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "profileName" TEXT NOT NULL,
    "jobTitleId" TEXT,
    "skillId" TEXT NOT NULL,
    "requiredProficiency" "SkillProficiency" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_skill_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_skill_assessments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "proficiency" "SkillProficiency" NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assessorUserId" TEXT,
    "notes" TEXT,

    CONSTRAINT "employee_skill_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_gaps" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "profileName" TEXT NOT NULL,
    "requiredProficiency" "SkillProficiency" NOT NULL,
    "actualProficiency" "SkillProficiency",
    "gapLevels" INTEGER NOT NULL DEFAULT 0,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_gaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workforce_risks" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" "WorkforceRiskCategory" NOT NULL,
    "severity" "WorkforceRiskSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "employeeId" TEXT,
    "departmentId" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workforce_risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workforce_insights" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "insightType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "whatHappened" TEXT NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "metrics" JSONB,
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workforce_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_skill_requirements_organizationId_profileName_skillId_key" ON "role_skill_requirements"("organizationId", "profileName", "skillId");
CREATE INDEX "role_skill_requirements_organizationId_profileName_idx" ON "role_skill_requirements"("organizationId", "profileName");
CREATE INDEX "employee_skill_assessments_organizationId_employeeId_idx" ON "employee_skill_assessments"("organizationId", "employeeId");
CREATE INDEX "skill_gaps_organizationId_employeeId_profileName_idx" ON "skill_gaps"("organizationId", "employeeId", "profileName");
CREATE INDEX "workforce_risks_organizationId_category_severity_idx" ON "workforce_risks"("organizationId", "category", "severity");
CREATE INDEX "workforce_risks_organizationId_ruleCode_idx" ON "workforce_risks"("organizationId", "ruleCode");
CREATE INDEX "workforce_insights_organizationId_insightType_createdAt_idx" ON "workforce_insights"("organizationId", "insightType", "createdAt");

-- AddForeignKey
ALTER TABLE "role_skill_requirements" ADD CONSTRAINT "role_skill_requirements_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_skill_requirements" ADD CONSTRAINT "role_skill_requirements_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "job_titles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "role_skill_requirements" ADD CONSTRAINT "role_skill_requirements_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_skill_assessments" ADD CONSTRAINT "employee_skill_assessments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_skill_assessments" ADD CONSTRAINT "employee_skill_assessments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_skill_assessments" ADD CONSTRAINT "employee_skill_assessments_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_gaps" ADD CONSTRAINT "skill_gaps_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_gaps" ADD CONSTRAINT "skill_gaps_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_gaps" ADD CONSTRAINT "skill_gaps_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workforce_risks" ADD CONSTRAINT "workforce_risks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workforce_risks" ADD CONSTRAINT "workforce_risks_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workforce_risks" ADD CONSTRAINT "workforce_risks_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workforce_insights" ADD CONSTRAINT "workforce_insights_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workforce_insights" ADD CONSTRAINT "workforce_insights_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
