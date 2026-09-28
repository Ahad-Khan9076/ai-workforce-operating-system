import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RecruitmentJobStatus, RecruitmentEmailTemplateKind } from '@prisma/client';
import { RecruitmentService } from './recruitment.service.js';
import { RecruitmentEmailService } from './recruitment-email.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireOrganization } from '../../common/decorators/require-organization.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { CreateRecruitmentJobDto } from './dto/create-job.dto.js';
import { CreateCandidateDto } from './dto/create-candidate.dto.js';
import { ApplyJobDto } from './dto/apply-job.dto.js';
import { MoveStageDto } from './dto/move-stage.dto.js';
import { UploadCvDto } from './dto/upload-cv.dto.js';
import { HireCandidateDto } from './dto/hire-candidate.dto.js';
import { UpdateJobStatusDto } from './dto/update-job-status.dto.js';
import { notFoundInTenant } from '../../common/utils/tenant.util.js';

@Controller('recruitment')
@RequireOrganization()
export class RecruitmentController {
  constructor(
    private readonly recruitment: RecruitmentService,
    private readonly emails: RecruitmentEmailService,
  ) {}

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_READ)
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.recruitment.getDashboard(user.organizationId!);
  }

  @Get('jobs')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_READ)
  listJobs(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: RecruitmentJobStatus,
  ) {
    return this.recruitment.listJobs(user.organizationId!, status);
  }

  @Post('jobs')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  createJob(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRecruitmentJobDto,
  ) {
    return this.recruitment.createJob(user.organizationId!, dto);
  }

  @Get('jobs/:jobId')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_READ)
  getJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
  ) {
    return this.recruitment.getJob(user.organizationId!, jobId);
  }

  @Patch('jobs/:jobId/status')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  updateJobStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
    @Body() dto: UpdateJobStatusDto,
  ) {
    return this.recruitment.updateJobStatus(user.organizationId!, jobId, dto.status);
  }

  @Post('candidates')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  createCandidate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCandidateDto,
  ) {
    return this.recruitment.createCandidate(user.organizationId!, dto);
  }

  @Post('applications')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  apply(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ApplyJobDto,
  ) {
    return this.recruitment.applyToJob(user.organizationId!, dto);
  }

  @Get('applications')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_READ)
  applications(
    @CurrentUser() user: AuthenticatedUser,
    @Query('jobId') jobId?: string,
  ) {
    return this.recruitment.listApplications(user.organizationId!, jobId);
  }

  @Get('kanban')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_READ)
  kanban(
    @CurrentUser() user: AuthenticatedUser,
    @Query('jobId') jobId?: string,
  ) {
    return this.recruitment.getKanban(user.organizationId!, jobId);
  }

  @Patch('applications/:applicationId/stage')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  moveStage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('applicationId') applicationId: string,
    @Body() dto: MoveStageDto,
  ) {
    return this.recruitment.moveApplicationStage(user, applicationId, dto);
  }

  @Post('candidates/:candidateId/cv')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  uploadCv(
    @CurrentUser() user: AuthenticatedUser,
    @Param('candidateId') candidateId: string,
    @Body() dto: UploadCvDto,
  ) {
    return this.recruitment.uploadCv(user.organizationId!, candidateId, dto);
  }

  @Post('applications/:applicationId/screen')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  screen(
    @CurrentUser() user: AuthenticatedUser,
    @Param('applicationId') applicationId: string,
  ) {
    return this.recruitment.runAiScreening(user.organizationId!, applicationId);
  }

  @Post('applications/:applicationId/hire')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  hire(
    @CurrentUser() user: AuthenticatedUser,
    @Param('applicationId') applicationId: string,
    @Body() dto: HireCandidateDto,
  ) {
    return this.recruitment.hireCandidate(user, applicationId, dto);
  }

  @Get('email-templates')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_READ)
  emailTemplates(@CurrentUser() user: AuthenticatedUser) {
    return this.emails.listTemplates(user.organizationId!);
  }

  @Post('applications/:applicationId/email')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  async sendEmail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('applicationId') applicationId: string,
    @Body()
    body: {
      kind: RecruitmentEmailTemplateKind;
      message?: string;
    },
  ) {
    const apps = await this.recruitment.listApplications(user.organizationId!);
    const application = apps.find((a) => a.id === applicationId);
    if (!application) notFoundInTenant('Application');
    const org = user.organizationId!;
    return this.emails.sendTemplate(org, {
      kind: body.kind,
      to: application.candidate.email,
      variables: {
        candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`,
        jobTitle: application.job.title,
        organizationName: 'Your organization',
        message: body.message ?? '',
      },
    });
  }
}
