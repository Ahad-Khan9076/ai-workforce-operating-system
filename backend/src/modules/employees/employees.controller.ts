import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { EmployeesService } from './employees.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireOrganization } from '../../common/decorators/require-organization.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { QueryEmployeesDto } from './dto/query-employees.dto.js';
import { CreateEmployeeDocumentDto } from './dto/create-document.dto.js';
import { AssignEmployeeSkillDto } from './dto/assign-skill.dto.js';

@Controller('employees')
@RequireOrganization()
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryEmployeesDto) {
    return this.employeesService.list(user.organizationId!, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.EMPLOYEE_CREATE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(user.organizationId!, user.userId, dto);
  }

  @Get(':employeeId')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  get(@CurrentUser() user: AuthenticatedUser, @Param('employeeId') employeeId: string) {
    return this.employeesService.getById(user.organizationId!, employeeId);
  }

  @Patch(':employeeId')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_UPDATE)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(
      user.organizationId!,
      employeeId,
      user.userId,
      dto,
    );
  }

  @Delete(':employeeId')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_DELETE)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
  ) {
    return this.employeesService.remove(user.organizationId!, employeeId, user.userId);
  }

  @Get(':employeeId/timeline')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  timeline(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
  ) {
    return this.employeesService.listTimeline(user.organizationId!, employeeId);
  }

  @Get(':employeeId/documents')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  documents(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
  ) {
    return this.employeesService.listDocuments(user.organizationId!, employeeId);
  }

  @Post(':employeeId/documents')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_UPDATE)
  addDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateEmployeeDocumentDto,
  ) {
    return this.employeesService.addDocument(
      user.organizationId!,
      employeeId,
      user.userId,
      dto,
    );
  }

  @Get(':employeeId/skills')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  skills(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
  ) {
    return this.employeesService.listSkills(user.organizationId!, employeeId);
  }

  @Post(':employeeId/skills')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_UPDATE)
  assignSkill(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Body() dto: AssignEmployeeSkillDto,
  ) {
    return this.employeesService.assignSkill(user.organizationId!, employeeId, dto);
  }
}
