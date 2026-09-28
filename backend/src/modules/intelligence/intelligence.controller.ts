import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { IntelligenceService } from './intelligence.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireOrganization } from '../../common/decorators/require-organization.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import {
  AnalyzeSkillGapDto,
  RecordSkillAssessmentDto,
  TalentSearchDto,
  UpsertRoleSkillRequirementDto,
} from './dto/role-skill-requirement.dto.js';

@Controller('intelligence')
@RequireOrganization()
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  dashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query('variant') variant?: 'executive' | 'hr' | 'manager',
  ) {
    return this.intelligenceService.getDashboard(user, variant);
  }

  @Get('insights')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  insights(@CurrentUser() user: AuthenticatedUser) {
    return this.intelligenceService.listInsights(user);
  }

  @Post('insights/refresh')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ, PERMISSIONS.EMPLOYEE_READ)
  refresh(@CurrentUser() user: AuthenticatedUser) {
    return this.intelligenceService.refreshIntelligence(user);
  }

  @Get('risks')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  risks(@CurrentUser() user: AuthenticatedUser) {
    return this.intelligenceService.listRisks(user);
  }

  @Post('risks/scan')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  scanRisks(@CurrentUser() user: AuthenticatedUser) {
    return this.intelligenceService.scanRisksForScope(user);
  }

  @Get('risks/rules')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  riskRules() {
    return this.intelligenceService.listRiskRules();
  }

  @Get('skills/profiles')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  profiles(@CurrentUser() user: AuthenticatedUser) {
    return this.intelligenceService.listRoleProfiles(user.organizationId!);
  }

  @Get('skills/profiles/:profileName/requirements')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  profileRequirements(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileName') profileName: string,
  ) {
    return this.intelligenceService.getRoleRequirements(
      user.organizationId!,
      decodeURIComponent(profileName),
    );
  }

  @Post('skills/requirements')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_UPDATE)
  upsertRequirement(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertRoleSkillRequirementDto,
  ) {
    return this.intelligenceService.upsertRoleRequirement(
      user.organizationId!,
      dto.profileName,
      dto.skillId,
      dto.requiredProficiency,
      dto.jobTitleId,
    );
  }

  @Delete('skills/requirements/:id')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_UPDATE)
  deleteRequirement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.intelligenceService.deleteRoleRequirement(user.organizationId!, id);
  }

  @Post('skills/employees/:employeeId/gap-analysis')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  gapAnalysis(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Body() dto: AnalyzeSkillGapDto,
  ) {
    return this.intelligenceService.analyzeEmployeeGaps(
      user,
      employeeId,
      dto.profileName,
    );
  }

  @Post('skills/employees/:employeeId/assessments')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_UPDATE)
  recordAssessment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Body() dto: RecordSkillAssessmentDto,
  ) {
    return this.intelligenceService.recordSkillAssessment(
      user.organizationId!,
      employeeId,
      dto.skillId,
      dto.proficiency,
      user.userId,
      dto.notes,
    );
  }

  @Post('talent/search')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ, PERMISSIONS.ANALYTICS_READ)
  talentSearch(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TalentSearchDto,
  ) {
    return this.intelligenceService.talentSearch(user, dto.profileName);
  }
}
