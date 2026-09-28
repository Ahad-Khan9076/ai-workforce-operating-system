import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SkillProficiency } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { EmployeeScopeService } from '../workforce/employee-scope.service.js';
import { analyzeSkillGaps } from './skill-gap.engine.js';
import { RiskEngineService } from './risk/risk-engine.service.js';
import { TalentMatchingService } from './talent-matching.service.js';
import { WorkforceInsightsService } from './workforce-insights.service.js';
import { IntelligenceDashboardService } from './intelligence-dashboard.service.js';

@Injectable()
export class IntelligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employeeScope: EmployeeScopeService,
    private readonly riskEngine: RiskEngineService,
    private readonly talentMatching: TalentMatchingService,
    private readonly insightsService: WorkforceInsightsService,
    private readonly dashboardService: IntelligenceDashboardService,
  ) {}

  listRoleProfiles(organizationId: string) {
    return this.prisma.roleSkillRequirement.groupBy({
      by: ['profileName'],
      where: { organizationId },
      _count: { skillId: true },
    });
  }

  async getRoleRequirements(organizationId: string, profileName: string) {
    return this.prisma.roleSkillRequirement.findMany({
      where: { organizationId, profileName },
      include: { skill: { include: { category: true } }, jobTitle: true },
      orderBy: { skill: { name: 'asc' } },
    });
  }

  async upsertRoleRequirement(
    organizationId: string,
    profileName: string,
    skillId: string,
    requiredProficiency: SkillProficiency,
    jobTitleId?: string,
  ) {
    const skill = await this.prisma.skill.findFirst({
      where: { id: skillId, organizationId },
    });
    if (!skill) throw new NotFoundException('Skill not found');

    return this.prisma.roleSkillRequirement.upsert({
      where: {
        organizationId_profileName_skillId: {
          organizationId,
          profileName,
          skillId,
        },
      },
      create: {
        organizationId,
        profileName,
        skillId,
        requiredProficiency,
        jobTitleId,
      },
      update: { requiredProficiency, jobTitleId },
    });
  }

  async deleteRoleRequirement(organizationId: string, id: string) {
    const row = await this.prisma.roleSkillRequirement.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Requirement not found');
    await this.prisma.roleSkillRequirement.delete({ where: { id } });
  }

  async analyzeEmployeeGaps(
    user: AuthenticatedUser,
    employeeId: string,
    profileName: string,
  ) {
    await this.employeeScope.assertCanAccessEmployee(user, employeeId);
    const organizationId = user.organizationId!;

    const requirements = await this.prisma.roleSkillRequirement.findMany({
      where: { organizationId, profileName },
      include: { skill: { select: { name: true } } },
    });
    if (requirements.length === 0) {
      throw new BadRequestException('No requirements defined for this profile');
    }

    const skills = await this.prisma.employeeSkill.findMany({
      where: { employeeId, organizationId },
      include: { skill: { select: { id: true, name: true } } },
    });

    const analysis = analyzeSkillGaps(
      requirements.map((r) => ({
        skillId: r.skillId,
        skillName: r.skill.name,
        requiredProficiency: r.requiredProficiency,
      })),
      skills.map((s) => ({ skillId: s.skillId, proficiency: s.proficiency })),
    );

    await this.prisma.skillGap.deleteMany({
      where: { organizationId, employeeId, profileName },
    });
    for (const gap of analysis.gaps) {
      await this.prisma.skillGap.create({
        data: {
          organizationId,
          employeeId,
          skillId: gap.skillId,
          profileName,
          requiredProficiency: gap.requiredProficiency,
          actualProficiency: gap.actualProficiency ?? undefined,
          gapLevels: gap.gapLevels,
        },
      });
    }

    return { profileName, ...analysis };
  }

  async recordSkillAssessment(
    organizationId: string,
    employeeId: string,
    skillId: string,
    proficiency: SkillProficiency,
    assessorUserId?: string,
    notes?: string,
  ) {
    return this.prisma.employeeSkillAssessment.create({
      data: {
        organizationId,
        employeeId,
        skillId,
        proficiency,
        assessorUserId,
        notes,
      },
    });
  }

  async talentSearch(user: AuthenticatedUser, profileName: string) {
    const filter = await this.employeeScope.getAccessibleEmployeeFilter(user);
    const employees = await this.prisma.employee.findMany({
      where: filter,
      select: { id: true },
    });
    const idFilter =
      filter.id === '__none__'
        ? { id: '__none__' }
        : 'OR' in filter
          ? { id: { in: employees.map((e) => e.id) } }
          : {};

    return this.talentMatching.findCandidatesForProfile(
      user.organizationId!,
      profileName,
      idFilter,
    );
  }

  async refreshIntelligence(user: AuthenticatedUser) {
    const organizationId = user.organizationId!;
    if (!this.employeeScope.hasOrgWideWorkforceAccess(user)) {
      throw new BadRequestException('Org-wide access required to refresh intelligence');
    }
    await this.riskEngine.syncRisks(organizationId);
    const insightCount = await this.insightsService.refreshInsights(organizationId);
    return { risksSynced: true, insightsCreated: insightCount };
  }

  async listRisks(user: AuthenticatedUser) {
    const organizationId = user.organizationId!;
    const filter = await this.employeeScope.getAccessibleEmployeeFilter(user);
    const employees = await this.prisma.employee.findMany({
      where: filter,
      select: { id: true, departmentId: true },
    });
    const ids = employees.map((e) => e.id);
    const deptIds = [...new Set(employees.map((e) => e.departmentId).filter(Boolean))] as string[];

    const where =
      this.employeeScope.hasOrgWideWorkforceAccess(user)
        ? { organizationId }
        : {
            organizationId,
            OR: [
              { employeeId: { in: ids } },
              { employeeId: null, departmentId: { in: deptIds } },
            ],
          };

    return this.prisma.workforceRisk.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: 100,
      include: {
        employee: { select: { firstName: true, lastName: true } },
        department: { select: { name: true } },
      },
    });
  }

  listRiskRules() {
    return this.riskEngine.listRuleDefinitions();
  }

  listInsights(user: AuthenticatedUser) {
    return this.insightsService.listInsights(user.organizationId!);
  }

  getDashboard(user: AuthenticatedUser, variant?: 'executive' | 'hr' | 'manager') {
    return this.dashboardService.getDashboard(user, variant);
  }

  async scanRisksForScope(user: AuthenticatedUser) {
    const organizationId = user.organizationId!;
    if (this.employeeScope.hasOrgWideWorkforceAccess(user)) {
      await this.riskEngine.syncRisks(organizationId);
    } else {
      const filter = await this.employeeScope.getAccessibleEmployeeFilter(user);
      await this.riskEngine.syncRisks(organizationId, filter);
    }
    return this.listRisks(user);
  }
}
