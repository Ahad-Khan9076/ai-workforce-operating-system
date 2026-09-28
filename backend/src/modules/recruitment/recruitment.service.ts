import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  CandidatePipelineStage,
  EmploymentType,
  OnboardingStatus,
  Prisma,
  RecruitmentJobStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { notFoundInTenant } from '../../common/utils/tenant.util.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { EmployeesService } from '../employees/employees.service.js';
import { DefaultCvDocumentProcessor } from './cv/default-cv-document.processor.js';
import { MockCandidateScreeningProvider } from './ai/mock-candidate-screening.provider.js';
import {
  AI_EVALUATION_VERSION,
  AI_SCREENING_PROMPT_VERSION,
  validateCandidateScreeningResult,
} from './ai/candidate-screening.types.js';
import { RecruitmentEmailService } from './recruitment-email.service.js';
import { OnboardingService } from '../onboarding/onboarding.service.js';

const STAGES = Object.values(CandidatePipelineStage);

@Injectable()
export class RecruitmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employees: EmployeesService,
    private readonly cvProcessor: DefaultCvDocumentProcessor,
    private readonly screeningProvider: MockCandidateScreeningProvider,
    private readonly emailService: RecruitmentEmailService,
    private readonly onboarding: OnboardingService,
  ) {}

  listJobs(organizationId: string, status?: RecruitmentJobStatus) {
    return this.prisma.recruitmentJob.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      include: { department: true, _count: { select: { applications: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  createJob(
    organizationId: string,
    data: {
      title: string;
      departmentId?: string;
      description: string;
      requirements?: string;
      responsibilities?: string;
      skills?: string[];
      experienceYears?: number;
      employmentType?: EmploymentType;
      location?: string;
      salaryMin?: number;
      salaryMax?: number;
    },
  ) {
    return this.prisma.recruitmentJob.create({
      data: {
        organizationId,
        title: data.title,
        departmentId: data.departmentId,
        description: data.description,
        requirements: data.requirements,
        responsibilities: data.responsibilities,
        skills: (data.skills ?? []) as Prisma.InputJsonValue,
        experienceYears: data.experienceYears,
        employmentType: data.employmentType ?? EmploymentType.FULL_TIME,
        location: data.location,
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        status: RecruitmentJobStatus.DRAFT,
      },
    });
  }

  async updateJobStatus(
    organizationId: string,
    jobId: string,
    status: RecruitmentJobStatus,
  ) {
    const job = await this.prisma.recruitmentJob.findFirst({
      where: { id: jobId, organizationId },
    });
    if (!job) notFoundInTenant('Job');

    return this.prisma.recruitmentJob.update({
      where: { id: jobId },
      data: {
        status,
        publishedAt:
          status === RecruitmentJobStatus.OPEN ? new Date() : job.publishedAt,
        closedAt:
          status === RecruitmentJobStatus.CLOSED ? new Date() : job.closedAt,
      },
    });
  }

  async getJob(organizationId: string, jobId: string) {
    const job = await this.prisma.recruitmentJob.findFirst({
      where: { id: jobId, organizationId },
      include: { department: true },
    });
    if (!job) notFoundInTenant('Job');
    return job;
  }

  async createCandidate(
    organizationId: string,
    data: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      source?: string;
    },
  ) {
    try {
      return await this.prisma.candidate.create({
        data: {
          organizationId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email.toLowerCase(),
          phone: data.phone,
          source: data.source,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Candidate email already exists');
      }
      throw error;
    }
  }

  async applyToJob(
    organizationId: string,
    data: { jobId: string; candidateId: string },
  ) {
    await this.getJob(organizationId, data.jobId);
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: data.candidateId, organizationId },
    });
    if (!candidate) notFoundInTenant('Candidate');

    try {
      return await this.prisma.jobApplication.create({
        data: {
          organizationId,
          jobId: data.jobId,
          candidateId: data.candidateId,
          stage: CandidatePipelineStage.APPLIED,
        },
        include: {
          candidate: true,
          job: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Candidate already applied to this job');
      }
      throw error;
    }
  }

  async uploadCv(
    organizationId: string,
    candidateId: string,
    input: {
      fileName: string;
      mimeType: string;
      contentBase64: string;
    },
  ) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: candidateId, organizationId },
    });
    if (!candidate) notFoundInTenant('Candidate');

    const buffer = Buffer.from(input.contentBase64, 'base64');
    const processed = await this.cvProcessor.process({
      fileName: input.fileName,
      mimeType: input.mimeType,
      buffer,
    });

    const doc = await this.prisma.candidateDocument.create({
      data: {
        organizationId,
        candidateId,
        fileName: input.fileName,
        mimeType: input.mimeType,
        storageKey: `candidates/${candidateId}/${input.fileName}`,
        extractedText: processed.extractedText,
        parsedProfile: processed.parsedProfile as unknown as Prisma.InputJsonValue,
        processedAt: new Date(),
      },
    });

    await this.prisma.candidate.update({
      where: { id: candidateId },
      data: {
        cvText: processed.extractedText,
        parsedProfile: processed.parsedProfile as unknown as Prisma.InputJsonValue,
        firstName: processed.parsedProfile.fullName?.split(' ')[0] ?? candidate.firstName,
        lastName:
          processed.parsedProfile.fullName?.split(' ').slice(1).join(' ') ||
          candidate.lastName,
        phone: processed.parsedProfile.phone ?? candidate.phone,
        email: processed.parsedProfile.email?.toLowerCase() ?? candidate.email,
      },
    });

    return doc;
  }

  async getKanban(organizationId: string, jobId?: string) {
    const applications = await this.prisma.jobApplication.findMany({
      where: {
        organizationId,
        ...(jobId ? { jobId } : {}),
      },
      include: {
        candidate: true,
        job: { select: { id: true, title: true } },
        aiEvaluations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: [{ stage: 'asc' }, { stageOrder: 'asc' }, { appliedAt: 'desc' }],
    });

    const board: Record<CandidatePipelineStage, typeof applications> = {
      APPLIED: [],
      SCREENING: [],
      SHORTLISTED: [],
      INTERVIEW: [],
      OFFER: [],
      HIRED: [],
      REJECTED: [],
    };

    for (const app of applications) {
      board[app.stage].push(app);
    }

    return { stages: STAGES, board };
  }

  async moveApplicationStage(
    user: AuthenticatedUser,
    applicationId: string,
    data: { stage: CandidatePipelineStage; stageOrder?: number },
  ) {
    const organizationId = user.organizationId!;
    const application = await this.prisma.jobApplication.findFirst({
      where: { id: applicationId, organizationId },
    });
    if (!application) notFoundInTenant('Application');

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.jobApplication.update({
        where: { id: applicationId },
        data: {
          stage: data.stage,
          stageOrder: data.stageOrder ?? 0,
          hiredAt: data.stage === CandidatePipelineStage.HIRED ? new Date() : application.hiredAt,
          rejectedAt:
            data.stage === CandidatePipelineStage.REJECTED ? new Date() : application.rejectedAt,
        },
        include: { candidate: true, job: true },
      });

      await tx.candidateStageEvent.create({
        data: {
          organizationId,
          applicationId,
          fromStage: application.stage,
          toStage: data.stage,
          changedByUserId: user.userId,
        },
      });

      return row;
    });

    return updated;
  }

  async runAiScreening(organizationId: string, applicationId: string) {
    const application = await this.prisma.jobApplication.findFirst({
      where: { id: applicationId, organizationId },
      include: {
        candidate: true,
        job: true,
      },
    });
    if (!application) notFoundInTenant('Application');

    const cvText = application.candidate.cvText ?? '';
    if (!cvText.trim()) {
      throw new BadRequestException('Upload and process a CV before AI screening');
    }

    const jobSkills = Array.isArray(application.job.skills)
      ? (application.job.skills as string[])
      : [];

    const screeningInput = {
      jobRequirements: application.job.requirements ?? application.job.description,
      jobSkills,
      candidateProfile: (application.candidate.parsedProfile ?? {}) as Record<string, unknown>,
      cvText,
    };

    const raw = await this.screeningProvider.screen(screeningInput);
    if (!validateCandidateScreeningResult(raw)) {
      throw new BadRequestException('AI provider returned invalid screening payload');
    }

    const inputReference = `application:${applicationId}`;

    const evaluation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.aiCandidateEvaluation.create({
        data: {
          organizationId,
          applicationId,
          matchScore: raw.matchScore,
          strengths: raw.strengths,
          missingSkills: raw.missingSkills,
          experienceMatch: raw.experienceMatch,
          educationMatch: raw.educationMatch,
          reasoningSummary: raw.reasoningSummary,
          recommendation: raw.recommendation,
          evaluationVersion: AI_EVALUATION_VERSION,
        },
      });

      await tx.aiScreeningAudit.create({
        data: {
          organizationId,
          evaluationId: created.id,
          provider: this.screeningProvider.providerName,
          model: this.screeningProvider.modelName,
          promptVersion: AI_SCREENING_PROMPT_VERSION,
          inputReference,
          output: raw as unknown as Prisma.InputJsonValue,
        },
      });

      if (application.stage === CandidatePipelineStage.APPLIED) {
        await tx.jobApplication.update({
          where: { id: applicationId },
          data: { stage: CandidatePipelineStage.SCREENING },
        });
      }

      return created;
    });

    return evaluation;
  }

  async createInterview(
    organizationId: string,
    data: {
      applicationId: string;
      interviewType: import('@prisma/client').InterviewType;
      scheduledAt?: string;
      questions?: string[];
    },
  ) {
    return this.prisma.interview.create({
      data: {
        organizationId,
        applicationId: data.applicationId,
        interviewType: data.interviewType,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        questions: (data.questions ?? []) as Prisma.InputJsonValue,
      },
    });
  }

  async scoreInterview(
    organizationId: string,
    interviewId: string,
    scores: Array<{ criterion: string; score: number; notes?: string }>,
  ) {
    const interview = await this.prisma.interview.findFirst({
      where: { id: interviewId, organizationId },
    });
    if (!interview) notFoundInTenant('Interview');

    await this.prisma.interviewScore.deleteMany({ where: { interviewId } });
    await this.prisma.interviewScore.createMany({
      data: scores.map((s) => ({
        interviewId,
        criterion: s.criterion,
        score: s.score,
        notes: s.notes,
      })),
    });

    return this.prisma.interview.findFirst({
      where: { id: interviewId },
      include: { scores: true },
    });
  }

  async hireCandidate(
    user: AuthenticatedUser,
    applicationId: string,
    data: {
      managerId?: string;
      jobTitleId?: string;
      membershipId?: string;
    },
  ) {
    const organizationId = user.organizationId!;
    const application = await this.prisma.jobApplication.findFirst({
      where: { id: applicationId, organizationId },
      include: { candidate: true, job: true, onboarding: true },
    });
    if (!application) notFoundInTenant('Application');
    if (application.candidate.employeeId) {
      throw new BadRequestException('Candidate already converted to employee');
    }

    const profile = (application.candidate.parsedProfile ?? {}) as Record<string, unknown>;

    const employee = await this.employees.create(organizationId, user.userId, {
      firstName: application.candidate.firstName,
      lastName: application.candidate.lastName,
      email: application.candidate.email,
      phone: application.candidate.phone ?? undefined,
      departmentId: application.job.departmentId ?? undefined,
      jobTitleId: data.jobTitleId,
      managerId: data.managerId,
      membershipId: data.membershipId,
      employmentType: application.job.employmentType,
      workLocation: application.job.location ?? undefined,
      joinDate: new Date().toISOString(),
      bio: typeof profile.summary === 'string' ? profile.summary : undefined,
    });

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.candidate.update({
        where: { id: application.candidateId },
        data: { employeeId: employee.id },
      });

      const app = await tx.jobApplication.update({
        where: { id: applicationId },
        data: {
          stage: CandidatePipelineStage.HIRED,
          hiredAt: new Date(),
        },
      });

      const onboarding = await tx.onboardingRecord.create({
        data: {
          organizationId,
          employeeId: employee.id,
          candidateId: application.candidateId,
          applicationId,
          status: OnboardingStatus.PENDING,
          checklist: [
            { key: 'account', label: 'Provision account access', done: false },
            { key: 'equipment', label: 'Assign equipment', done: false },
            { key: 'orientation', label: 'Schedule orientation', done: false },
          ],
        },
      });

      return { application: app, employee, onboarding };
    });

    const plan = await this.onboarding.createPlanForEmployee(
      organizationId,
      result.employee.id,
      {
        roleCode: 'EMPLOYEE',
        departmentId: result.employee.departmentId,
        employmentType: result.employee.employmentType,
      },
    );

    if (plan) {
      await this.prisma.onboardingRecord.update({
        where: { id: result.onboarding.id },
        data: {
          onboardingPlanId: plan.id,
          status: OnboardingStatus.IN_PROGRESS,
        },
      });
    }

    return { ...result, onboardingPlan: plan };
  }

  async getDashboard(organizationId: string) {
    const [openJobs, candidates, byStage, applications, interviews] =
      await Promise.all([
        this.prisma.recruitmentJob.count({
          where: { organizationId, status: RecruitmentJobStatus.OPEN },
        }),
        this.prisma.candidate.count({ where: { organizationId } }),
        this.prisma.jobApplication.groupBy({
          by: ['stage'],
          where: { organizationId },
          _count: true,
        }),
        this.prisma.jobApplication.findMany({
          where: { organizationId },
          select: { appliedAt: true, hiredAt: true, stage: true },
        }),
        this.prisma.interview.count({ where: { organizationId } }),
      ]);

    const hired = applications.filter((a) => a.hiredAt);
    const timeToHireDays = hired.length
      ? hired.reduce((sum, a) => {
          const days =
            (a.hiredAt!.getTime() - a.appliedAt.getTime()) / 86400000;
          return sum + days;
        }, 0) / hired.length
      : null;

    const funnel = STAGES.map((stage) => ({
      stage,
      count: byStage.find((g) => g.stage === stage)?._count ?? 0,
    }));

    return {
      openJobs,
      candidates,
      candidatesByStage: funnel,
      timeToHireDays: timeToHireDays ? Math.round(timeToHireDays) : null,
      interviewPipeline: interviews,
      hiringFunnel: funnel,
    };
  }

  listApplications(organizationId: string, jobId?: string) {
    return this.prisma.jobApplication.findMany({
      where: { organizationId, ...(jobId ? { jobId } : {}) },
      include: {
        candidate: true,
        job: { select: { title: true } },
        aiEvaluations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
