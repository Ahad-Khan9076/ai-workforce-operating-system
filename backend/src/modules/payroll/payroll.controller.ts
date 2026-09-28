import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { PayrollService } from './payroll.service.js';
import { SalaryStructureService } from './salary-structure.service.js';
import { EmployeeLoanService } from './employee-loan.service.js';
import { PayslipService } from './payslip.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireOrganization } from '../../common/decorators/require-organization.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { CreatePayrollPeriodDto } from './dto/create-period.dto.js';
import { CreatePayrollAdjustmentDto } from './dto/create-adjustment.dto.js';
import { CreateEmployeeLoanDto } from './dto/create-loan.dto.js';

@Controller('payroll')
@RequireOrganization()
export class PayrollController {
  constructor(
    private readonly payroll: PayrollService,
    private readonly structures: SalaryStructureService,
    private readonly loans: EmployeeLoanService,
    private readonly payslips: PayslipService,
  ) {}

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.PAYROLL_READ)
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.payroll.getDashboard(user.organizationId!);
  }

  @Get('periods')
  @RequirePermissions(PERMISSIONS.PAYROLL_READ)
  listPeriods(@CurrentUser() user: AuthenticatedUser) {
    return this.payroll.listPeriods(user.organizationId!);
  }

  @Post('periods')
  @RequirePermissions(PERMISSIONS.PAYROLL_MANAGE)
  createPeriod(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePayrollPeriodDto,
  ) {
    return this.payroll.createPeriod(user.organizationId!, dto);
  }

  @Get('periods/:periodId')
  @RequirePermissions(PERMISSIONS.PAYROLL_READ)
  getPeriod(
    @CurrentUser() user: AuthenticatedUser,
    @Param('periodId') periodId: string,
  ) {
    return this.payroll.getPeriod(user.organizationId!, periodId);
  }

  @Post('periods/:periodId/calculate')
  @RequirePermissions(PERMISSIONS.PAYROLL_MANAGE)
  calculate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('periodId') periodId: string,
  ) {
    return this.payroll.calculatePeriod(user, periodId);
  }

  @Post('periods/:periodId/approve')
  @RequirePermissions(PERMISSIONS.PAYROLL_APPROVE)
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('periodId') periodId: string,
  ) {
    return this.payroll.approvePeriod(user, periodId);
  }

  @Post('periods/:periodId/mark-paid')
  @RequirePermissions(PERMISSIONS.PAYROLL_APPROVE)
  markPaid(
    @CurrentUser() user: AuthenticatedUser,
    @Param('periodId') periodId: string,
  ) {
    return this.payroll.markPaid(user, periodId);
  }

  @Post('periods/:periodId/lock')
  @RequirePermissions(PERMISSIONS.PAYROLL_APPROVE)
  lock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('periodId') periodId: string,
  ) {
    return this.payroll.lockPeriod(user, periodId);
  }

  @Post('periods/:periodId/adjustments')
  @RequirePermissions(PERMISSIONS.PAYROLL_MANAGE)
  addAdjustment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('periodId') periodId: string,
    @Body() dto: CreatePayrollAdjustmentDto,
  ) {
    return this.payroll.addAdjustment(user, periodId, dto);
  }

  @Get('structures')
  @RequirePermissions(PERMISSIONS.PAYROLL_READ)
  listStructures(@CurrentUser() user: AuthenticatedUser) {
    return this.structures.listStructures(user.organizationId!);
  }

  @Post('structures/default')
  @RequirePermissions(PERMISSIONS.PAYROLL_MANAGE)
  ensureDefault(@CurrentUser() user: AuthenticatedUser) {
    return this.structures.ensureDefaultStructure(user.organizationId!);
  }

  @Get('salaries')
  @RequirePermissions(PERMISSIONS.PAYROLL_READ)
  listSalaries(@CurrentUser() user: AuthenticatedUser) {
    return this.structures.listEmployeeSalaries(user.organizationId!);
  }

  @Get('loans')
  @RequirePermissions(PERMISSIONS.PAYROLL_READ)
  listLoans(@CurrentUser() user: AuthenticatedUser) {
    return this.loans.list(user.organizationId!);
  }

  @Post('loans')
  @RequirePermissions(PERMISSIONS.PAYROLL_MANAGE)
  createLoan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEmployeeLoanDto,
  ) {
    return this.loans.create(user.organizationId!, dto);
  }

  @Get('payslips')
  @RequirePermissions(PERMISSIONS.PAYROLL_READ)
  listPayslips(@CurrentUser() user: AuthenticatedUser) {
    return this.payslips.listPayslips(user.organizationId!);
  }

  @Get('me/payslips')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  myPayslips(@CurrentUser() user: AuthenticatedUser) {
    return this.payroll.listMyPayslips(user);
  }

  @Get('payslips/:payslipId')
  @RequirePermissions(PERMISSIONS.PAYROLL_READ)
  getPayslip(
    @CurrentUser() user: AuthenticatedUser,
    @Param('payslipId') payslipId: string,
  ) {
    return this.payslips.getPayslip(user.organizationId!, payslipId);
  }
}
