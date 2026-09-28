-- Phase 6: Onboarding LMS, training, performance

CREATE TYPE "OnboardingTaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');
CREATE TYPE "OnboardingTaskKind" AS ENUM ('DOCUMENTS', 'TRAINING', 'MANAGER_MEETING', 'EQUIPMENT', 'GOALS', 'COMPLIANCE');
CREATE TYPE "LessonContentType" AS ENUM ('TEXT', 'VIDEO', 'DOCUMENT');
CREATE TYPE "AssessmentQuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE');
CREATE TYPE "EnrollmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "CertificateStatus" AS ENUM ('ACTIVE', 'EXPIRING', 'EXPIRED');
CREATE TYPE "PerformanceCycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'REVIEW', 'FINALIZED');
CREATE TYPE "GoalStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "PerformanceReviewStatus" AS ENUM ('PENDING', 'MANAGER_REVIEW', 'EMPLOYEE_ACK', 'FINALIZED');

ALTER TABLE "onboarding_records" ADD COLUMN "onboardingPlanId" TEXT;
CREATE UNIQUE INDEX "onboarding_records_onboardingPlanId_key" ON "onboarding_records"("onboardingPlanId");

-- Tables created via prisma db push pattern; full DDL below

CREATE TABLE "onboarding_templates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleCode" TEXT,
    "departmentId" TEXT,
    "employmentType" "EmploymentType",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "onboarding_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "onboarding_template_tasks" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "OnboardingTaskKind" NOT NULL,
    "description" TEXT,
    "dueDays" INTEGER NOT NULL DEFAULT 7,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "courseId" TEXT,
    CONSTRAINT "onboarding_template_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "onboarding_template_milestones" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDays" INTEGER NOT NULL DEFAULT 30,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "onboarding_template_milestones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "onboarding_plans" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "templateId" TEXT,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "onboarding_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "onboarding_tasks" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "OnboardingTaskKind" NOT NULL,
    "description" TEXT,
    "status" "OnboardingTaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "courseId" TEXT,
    CONSTRAINT "onboarding_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "onboarding_milestones" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "onboarding_milestones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "course_modules" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "course_modules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentType" "LessonContentType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT,
    "resourceUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "passingScore" DOUBLE PRECISION NOT NULL DEFAULT 70,
    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assessment_questions" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionType" "AssessmentQuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB,
    "correctAnswer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assessment_attempts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "answers" JSONB NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assessment_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "learning_paths" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "learning_path_courses" (
    "id" TEXT NOT NULL,
    "learningPathId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "learning_path_courses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "training_assignments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "roleCode" TEXT,
    "departmentId" TEXT,
    "employeeId" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "training_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_enrollments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "employee_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "training_certificates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "status" "CertificateStatus" NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "training_certificates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "performance_cycles" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "PerformanceCycleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "performance_cycles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "dueDate" DATE,
    "status" "GoalStatus" NOT NULL DEFAULT 'DRAFT',
    "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kpis" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetValue" DOUBLE PRECISION,
    "unit" TEXT,
    CONSTRAINT "kpis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "performance_reviews" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT,
    "status" "PerformanceReviewStatus" NOT NULL DEFAULT 'PENDING',
    "managerSummary" TEXT,
    "employeeAckNote" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "performance_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "competencies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "competencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "performance_feedbacks" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "body" TEXT NOT NULL,
    "rating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "performance_feedbacks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "development_plans" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "cycleId" TEXT,
    "title" TEXT NOT NULL,
    "focusAreas" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "development_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workforce_insight_snapshots" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT,
    "snapshotType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workforce_insight_snapshots_pkey" PRIMARY KEY ("id")
);

-- Indexes & FKs (abbreviated — Prisma-aligned)
CREATE INDEX "onboarding_templates_organizationId_isActive_idx" ON "onboarding_templates"("organizationId", "isActive");
CREATE INDEX "onboarding_plans_organizationId_employeeId_idx" ON "onboarding_plans"("organizationId", "employeeId");
CREATE UNIQUE INDEX "employee_enrollments_employeeId_courseId_key" ON "employee_enrollments"("employeeId", "courseId");
CREATE UNIQUE INDEX "performance_reviews_cycleId_employeeId_key" ON "performance_reviews"("cycleId", "employeeId");
CREATE UNIQUE INDEX "training_certificates_organizationId_certificateNumber_key" ON "training_certificates"("organizationId", "certificateNumber");
CREATE UNIQUE INDEX "learning_paths_organizationId_name_key" ON "learning_paths"("organizationId", "name");
CREATE UNIQUE INDEX "competencies_organizationId_name_key" ON "competencies"("organizationId", "name");
CREATE UNIQUE INDEX "learning_path_courses_learningPathId_courseId_key" ON "learning_path_courses"("learningPathId", "courseId");

ALTER TABLE "onboarding_records" ADD CONSTRAINT "onboarding_records_onboardingPlanId_fkey" FOREIGN KEY ("onboardingPlanId") REFERENCES "onboarding_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "onboarding_templates" ADD CONSTRAINT "onboarding_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_templates" ADD CONSTRAINT "onboarding_templates_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "onboarding_template_tasks" ADD CONSTRAINT "onboarding_template_tasks_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "onboarding_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_plans" ADD CONSTRAINT "onboarding_plans_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_plans" ADD CONSTRAINT "onboarding_plans_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_plans" ADD CONSTRAINT "onboarding_plans_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "onboarding_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "onboarding_tasks" ADD CONSTRAINT "onboarding_tasks_planId_fkey" FOREIGN KEY ("planId") REFERENCES "onboarding_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_milestones" ADD CONSTRAINT "onboarding_milestones_planId_fkey" FOREIGN KEY ("planId") REFERENCES "onboarding_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "courses" ADD CONSTRAINT "courses_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "course_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_enrollments" ADD CONSTRAINT "employee_enrollments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_enrollments" ADD CONSTRAINT "employee_enrollments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_enrollments" ADD CONSTRAINT "employee_enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "training_certificates" ADD CONSTRAINT "training_certificates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "training_certificates" ADD CONSTRAINT "training_certificates_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "performance_cycles" ADD CONSTRAINT "performance_cycles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goals" ADD CONSTRAINT "goals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goals" ADD CONSTRAINT "goals_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "performance_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goals" ADD CONSTRAINT "goals_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "performance_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
