import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { DepartmentsService } from './departments.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireOrganization } from '../../common/decorators/require-organization.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';

@Controller()
@RequireOrganization()
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get('departments')
  @RequirePermissions(PERMISSIONS.DEPARTMENT_READ)
  listDepartments(@CurrentUser() user: AuthenticatedUser) {
    return this.departmentsService.listDepartments(user.organizationId!);
  }

  @Get('departments/:departmentId')
  @RequirePermissions(PERMISSIONS.DEPARTMENT_READ)
  getDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('departmentId') departmentId: string,
  ) {
    return this.departmentsService.getDepartment(user.organizationId!, departmentId);
  }

  @Post('departments')
  @RequirePermissions(PERMISSIONS.DEPARTMENT_MANAGE)
  createDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      name: string;
      code?: string;
      description?: string;
      managerEmployeeId?: string;
    },
  ) {
    return this.departmentsService.createDepartment(user.organizationId!, body);
  }

  @Patch('departments/:departmentId')
  @RequirePermissions(PERMISSIONS.DEPARTMENT_MANAGE)
  updateDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('departmentId') departmentId: string,
    @Body()
    body: {
      name?: string;
      code?: string;
      description?: string;
      managerEmployeeId?: string | null;
    },
  ) {
    return this.departmentsService.updateDepartment(
      user.organizationId!,
      departmentId,
      body,
    );
  }

  @Get('teams')
  @RequirePermissions(PERMISSIONS.DEPARTMENT_READ)
  listTeams(
    @CurrentUser() user: AuthenticatedUser,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.departmentsService.listTeams(user.organizationId!, departmentId);
  }

  @Post('teams')
  @RequirePermissions(PERMISSIONS.DEPARTMENT_MANAGE)
  createTeam(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      departmentId: string;
      name: string;
      description?: string;
      leadEmployeeId?: string;
    },
  ) {
    return this.departmentsService.createTeam(user.organizationId!, body);
  }

  @Get('job-titles')
  @RequirePermissions(PERMISSIONS.DEPARTMENT_READ)
  listJobTitles(@CurrentUser() user: AuthenticatedUser) {
    return this.departmentsService.listJobTitles(user.organizationId!);
  }

  @Post('job-titles')
  @RequirePermissions(PERMISSIONS.DEPARTMENT_MANAGE)
  createJobTitle(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { title: string; level?: string; description?: string },
  ) {
    return this.departmentsService.createJobTitle(user.organizationId!, body);
  }

  @Get('positions')
  @RequirePermissions(PERMISSIONS.DEPARTMENT_READ)
  listPositions(@CurrentUser() user: AuthenticatedUser) {
    return this.departmentsService.listPositions(user.organizationId!);
  }

  @Post('positions')
  @RequirePermissions(PERMISSIONS.DEPARTMENT_MANAGE)
  createPosition(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      jobTitleId: string;
      departmentId: string;
      teamId?: string;
      code?: string;
      isOpen?: boolean;
      employeeId?: string;
    },
  ) {
    return this.departmentsService.createPosition(user.organizationId!, body);
  }

  @Get('skills/catalog')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  listSkills(@CurrentUser() user: AuthenticatedUser) {
    return this.departmentsService.listSkills(user.organizationId!);
  }

  @Post('skills/catalog')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_UPDATE)
  createSkill(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { name: string; description?: string; categoryId?: string },
  ) {
    return this.departmentsService.createSkill(user.organizationId!, body);
  }

  @Post('skills/categories')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_UPDATE)
  createSkillCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { name: string; description?: string },
  ) {
    return this.departmentsService.createSkillCategory(
      user.organizationId!,
      body.name,
      body.description,
    );
  }

  @Get('organization/structure')
  @RequirePermissions(PERMISSIONS.ORGANIZATION_READ)
  structure(@CurrentUser() user: AuthenticatedUser) {
    return this.departmentsService.getOrganizationStructure(user.organizationId!);
  }
}
