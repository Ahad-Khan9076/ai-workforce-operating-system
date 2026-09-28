-- Phase 5: Recruitment / ATS + AI screening

CREATE TYPE "RecruitmentJobStatus" AS ENUM ('DRAFT', 'OPEN', 'PAUSED', 'CLOSED');
CREATE TYPE "CandidatePipelineStage" AS ENUM ('APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED');
CREATE TYPE "InterviewType" AS ENUM ('PHONE', 'VIDEO', 'ONSITE', 'TECHNICAL', 'HR', 'OTHER');
CREATE TYPE "AiMatchRecommendation" AS ENUM ('STRONG_MATCH', 'POTENTIAL_MATCH', 'WEAK_MATCH');
CREATE TYPE "RecruitmentEmailTemplateKind" AS ENUM ('INTERVIEW_INVITATION', 'REJECTION', 'OFFER', 'GENERAL');
CREATE TYPE "CandidateDocumentKind" AS ENUM ('CV', 'COVER_LETTER', 'OTHER');
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

CREATE TABLE "recruitment_jobs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "departmentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT,
    "responsibilities" TEXT,
    "skills" JSONB NOT NULL DEFAULT '[]',
    "experienceYears" DOUBLE PRECISION,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "location" TEXT,
    "salaryMin" DOUBLE PRECISION,
    "salaryMax" DOUBLE PRECISION,
    "status" "RecruitmentJobStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "recruitment_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "source" TEXT,
    "parsedProfile" JSONB,
    "cvText" TEXT,
    "employeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "job_applications" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "stage" "CandidatePipelineStage" NOT NULL DEFAULT 'APPLIED',
    "stageOrder" INTEGER NOT NULL DEFAULT 0,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hiredAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "candidate_documents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "kind" "CandidateDocumentKind" NOT NULL DEFAULT 'CV',
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT,
    "fileUrl" TEXT,
    "extractedText" TEXT,
    "parsedProfile" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "candidate_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "candidate_stage_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromStage" "CandidatePipelineStage",
    "toStage" "CandidatePipelineStage" NOT NULL,
    "changedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "candidate_stage_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "interviewType" "InterviewType" NOT NULL DEFAULT 'VIDEO',
    "scheduledAt" TIMESTAMP(3),
    "questions" JSONB NOT NULL DEFAULT '[]',
    "candidateAnswers" JSONB,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "interview_scores" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "criterion" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "interview_scores_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "candidate_notes" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "applicationId" TEXT,
    "body" TEXT NOT NULL,
    "authorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "candidate_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_candidate_evaluations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "strengths" JSONB NOT NULL DEFAULT '[]',
    "missingSkills" JSONB NOT NULL DEFAULT '[]',
    "experienceMatch" TEXT,
    "educationMatch" TEXT,
    "reasoningSummary" TEXT NOT NULL,
    "recommendation" "AiMatchRecommendation" NOT NULL,
    "evaluationVersion" TEXT NOT NULL DEFAULT 'v1',
    "disclaimer" TEXT NOT NULL DEFAULT 'AI-assisted screening; human review required.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_candidate_evaluations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_screening_audits" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "inputReference" TEXT NOT NULL,
    "output" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_screening_audits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recruitment_email_templates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "RecruitmentEmailTemplateKind" NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "recruitment_email_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "onboarding_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'PENDING',
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "onboarding_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "candidates_employeeId_key" ON "candidates"("employeeId");
CREATE UNIQUE INDEX "candidates_organizationId_email_key" ON "candidates"("organizationId", "email");
CREATE INDEX "candidates_organizationId_lastName_firstName_idx" ON "candidates"("organizationId", "lastName", "firstName");
CREATE UNIQUE INDEX "job_applications_jobId_candidateId_key" ON "job_applications"("jobId", "candidateId");
CREATE INDEX "job_applications_organizationId_stage_idx" ON "job_applications"("organizationId", "stage");
CREATE INDEX "job_applications_organizationId_jobId_idx" ON "job_applications"("organizationId", "jobId");
CREATE INDEX "recruitment_jobs_organizationId_status_idx" ON "recruitment_jobs"("organizationId", "status");
CREATE INDEX "candidate_documents_organizationId_candidateId_idx" ON "candidate_documents"("organizationId", "candidateId");
CREATE INDEX "candidate_stage_events_applicationId_createdAt_idx" ON "candidate_stage_events"("applicationId", "createdAt");
CREATE INDEX "interviews_organizationId_applicationId_idx" ON "interviews"("organizationId", "applicationId");
CREATE INDEX "interview_scores_interviewId_idx" ON "interview_scores"("interviewId");
CREATE INDEX "candidate_notes_organizationId_candidateId_idx" ON "candidate_notes"("organizationId", "candidateId");
CREATE INDEX "ai_candidate_evaluations_organizationId_applicationId_idx" ON "ai_candidate_evaluations"("organizationId", "applicationId");
CREATE UNIQUE INDEX "ai_screening_audits_evaluationId_key" ON "ai_screening_audits"("evaluationId");
CREATE INDEX "ai_screening_audits_organizationId_createdAt_idx" ON "ai_screening_audits"("organizationId", "createdAt");
CREATE UNIQUE INDEX "recruitment_email_templates_organizationId_kind_name_key" ON "recruitment_email_templates"("organizationId", "kind", "name");
CREATE UNIQUE INDEX "onboarding_records_applicationId_key" ON "onboarding_records"("applicationId");
CREATE INDEX "onboarding_records_organizationId_employeeId_idx" ON "onboarding_records"("organizationId", "employeeId");

ALTER TABLE "recruitment_jobs" ADD CONSTRAINT "recruitment_jobs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recruitment_jobs" ADD CONSTRAINT "recruitment_jobs_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "recruitment_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidate_documents" ADD CONSTRAINT "candidate_documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidate_documents" ADD CONSTRAINT "candidate_documents_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidate_stage_events" ADD CONSTRAINT "candidate_stage_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidate_stage_events" ADD CONSTRAINT "candidate_stage_events_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interview_scores" ADD CONSTRAINT "interview_scores_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidate_notes" ADD CONSTRAINT "candidate_notes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidate_notes" ADD CONSTRAINT "candidate_notes_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidate_notes" ADD CONSTRAINT "candidate_notes_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "job_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_candidate_evaluations" ADD CONSTRAINT "ai_candidate_evaluations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_candidate_evaluations" ADD CONSTRAINT "ai_candidate_evaluations_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_screening_audits" ADD CONSTRAINT "ai_screening_audits_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_screening_audits" ADD CONSTRAINT "ai_screening_audits_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "ai_candidate_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recruitment_email_templates" ADD CONSTRAINT "recruitment_email_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_records" ADD CONSTRAINT "onboarding_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_records" ADD CONSTRAINT "onboarding_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_records" ADD CONSTRAINT "onboarding_records_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
