import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PayrollPeriodStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { PERMISSIONS } from '../../common/constants/permissions.js';
import { notFoundInTenant } from '../../common/utils/tenant.util.js';
import { toWorkDateStorage } from '../workforce/workforce-date.util.js';
import { EmployeeScopeService } from '../workforce/employee-scope.service.js';
import { PayrollCalculationEngine } from './engine/payroll-calculation.engine.js';
import { AttendancePayrollDataService } from './attendance-payroll-data.service.js';
import { SalaryStructureService } from './salary-structure.service.js';
import { EmployeeLoanService } from './employee-loan.service.js';
import { PayslipService } from './payslip.service.js';
import {
  assertPayrollPeriodEditable,
  assertPayrollPeriodNotLocked,
} from './payroll-lock.guard.js';
import type { PayrollComponentConfig } from './engine/payroll.types.js';

@Injectable()
export class PayrollService {
  private readonly engine = new PayrollCalculationEngine();

  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: EmployeeScopeService,
    private readonly attendanceData: AttendancePayrollDataService,
    private readonly salaryStructures: SalaryStructureService,
    private readonly loans: EmployeeLoanService,
    private readonly payslips: PayslipService,
  ) {}

  listPeriods(organizationId: string) {
    return this.prisma.payrollPeriod.findMany({
      where: { organizationId },
      orderBy: { startDate: 'desc' },
      include: { runs: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
  }

  createPeriod(
    organizationId: string,
    data: { name: string; startDate: string; endDate: string },
  ) {
    const start = toWorkDateStorage(data.startDate);
    const end = toWorkDateStorage(data.endDate);
    if (end < start) {
      throw new BadRequestException('Invalid period range');
    }
    return this.prisma.payrollPeriod.create({
      data: {
        organizationId,
        name: data.name,
        startDate: start,
        endDate: end,
        status: PayrollPeriodStatus.DRAFT,
      },
    });
  }

  async getPeriod(organizationId: string, periodId: string) {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id: periodId, organizationId },
      include: {
        runs: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                employee: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    employeeNumber: true,
                    departmentId: true,
                  },
                },
              },
            },
            adjustments: true,
          },
        },
      },
    });
    if (!period) notFoundInTenant('Payroll period');
    return period;
  }

  async calculatePeriod(user: AuthenticatedUser, periodId: string) {
    const organizationId = user.organizationId!;
    const period = await this.getPeriod(organizationId, periodId);
    assertPayrollPeriodNotLocked(period);
    if (
      period.status !== PayrollPeriodStatus.DRAFT &&
      period.status !== PayrollPeriodStatus.REVIEW
    ) {
      throw new BadRequestException(
        'Payroll can only be calculated in DRAFT or REVIEW status',
      );
    }

    await this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: PayrollPeriodStatus.PROCESSING },
    });

    await this.salaryStructures.ensureDefaultStructure(organizationId);

    let runId = period.runs[0]?.id;
    if (!runId) {
      const created = await this.prisma.payrollRun.create({
        data: { organizationId, payrollPeriodId: periodId },
      });
      runId = created.id;
    }

    const run = await this.prisma.payrollRun.findFirstOrThrow({
      where: { id: runId },
      include: { adjustments: true },
    });

    await this.prisma.payrollItem.deleteMany({ where: { payrollRunId: run.id } });

    const employeeIds = await this.attendanceData.listPayrollEligibleEmployeeIds(
      organizationId,
      period.endDate,
    );

    for (const employeeId of employeeIds) {
      await this.calculateEmployeePayroll(
        organizationId,
        run.id,
        employeeId,
        period.startDate,
        period.endDate,
        run.adjustments.filter((a) => a.employeeId === employeeId),
      );
    }

    await this.prisma.payrollRun.update({
      where: { id: run.id },
      data: {
        calculatedAt: new Date(),
        calculatedByUserId: user.userId,
      },
    });

    await this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: PayrollPeriodStatus.REVIEW },
    });

    return this.getPeriod(organizationId, periodId);
  }

  private async calculateEmployeePayroll(
    organizationId: string,
    payrollRunId: string,
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
    adjustments: Array<{
      label: string;
      amount: number;
      componentType: import('@prisma/client').SalaryComponentType;
      componentId: string | null;
    }>,
  ) {
    const salary = await this.prisma.employeeSalary.findFirst({
      where: {
        organizationId,
        employeeId,
        effectiveFrom: { lte: periodEnd },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodStart } }],
      },
      include: {
        salaryStructure: {
          include: {
            components: {
              where: {
                isActive: true,
                effectiveFrom: { lte: periodEnd },
                OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodStart } }],
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!salary) return;

    const attendance = await this.attendanceData.getEmployeeAttendanceSnapshot(
      organizationId,
      employeeId,
      periodStart,
      periodEnd,
    );

    const loanInstallment = await this.loans.getInstallmentForPeriod(
      organizationId,
      employeeId,
      periodStart,
      periodEnd,
    );

    const components: PayrollComponentConfig[] = salary.salaryStructure.components.map(
      (c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        componentType: c.componentType,
        category: c.category,
        calculationMethod: c.calculationMethod,
        fixedAmount: c.fixedAmount,
        percentage: c.percentage,
        isTaxable: c.isTaxable,
        sortOrder: c.sortOrder,
      }),
    );

    const result = this.engine.calculate({
      employeeId,
      baseAmount: salary.baseAmount,
      currency: salary.currency,
      components,
      adjustments: adjustments.map((a) => ({
        label: a.label,
        amount: a.amount,
        componentType: a.componentType,
        componentId: a.componentId,
      })),
      attendance,
      loanInstallment,
    });

    await this.prisma.payrollItem.create({
      data: {
        organizationId,
        payrollRunId,
        employeeId,
        currency: salary.currency,
        grossAmount: result.grossAmount,
        totalDeductions: result.totalDeductions,
        netAmount: result.netAmount,
        taxableAmount: result.taxableAmount,
        breakdown: result.breakdown as unknown as Prisma.InputJsonValue,
        attendanceMeta: result.attendanceMeta as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async approvePeriod(user: AuthenticatedUser, periodId: string) {
    if (!user.permissions.includes(PERMISSIONS.PAYROLL_APPROVE)) {
      throw new ForbiddenException('Cannot approve payroll');
    }
    const organizationId = user.organizationId!;
    const period = await this.getPeriod(organizationId, periodId);
    if (period.status !== PayrollPeriodStatus.REVIEW) {
      throw new BadRequestException('Payroll must be in REVIEW to approve');
    }

    const run = period.runs[0];
    if (!run) throw new BadRequestException('No payroll run to approve');

    await this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: PayrollPeriodStatus.APPROVED },
    });

    await this.prisma.payrollRun.update({
      where: { id: run.id },
      data: {
        approvedAt: new Date(),
        approvedByUserId: user.userId,
      },
    });

    await this.payslips.generateForRun(organizationId, run.id);

    return this.getPeriod(organizationId, periodId);
  }

  async markPaid(user: AuthenticatedUser, periodId: string) {
    if (!user.permissions.includes(PERMISSIONS.PAYROLL_APPROVE)) {
      throw new ForbiddenException('Cannot mark payroll as paid');
    }
    const organizationId = user.organizationId!;
    const period = await this.getPeriod(organizationId, periodId);
    if (period.status !== PayrollPeriodStatus.APPROVED) {
      throw new BadRequestException('Payroll must be approved before marking paid');
    }

    const run = period.runs[0];
    if (run) {
      for (const item of run.items) {
        const breakdown = item.breakdown as Array<{ category: string; amount: number }>;
        const loanDeduction = breakdown
          .filter((l) => l.category === 'LOAN')
          .reduce((s, l) => s + l.amount, 0);
        if (loanDeduction > 0) {
          await this.loans.applyInstallmentPayment(
            organizationId,
            item.employeeId,
            loanDeduction,
          );
        }
      }
      await this.prisma.payrollRun.update({
        where: { id: run.id },
        data: { paidAt: new Date() },
      });
    }

    await this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: PayrollPeriodStatus.PAID },
    });

    return this.getPeriod(organizationId, periodId);
  }

  async lockPeriod(user: AuthenticatedUser, periodId: string) {
    if (!user.permissions.includes(PERMISSIONS.PAYROLL_APPROVE)) {
      throw new ForbiddenException('Cannot lock payroll');
    }
    const organizationId = user.organizationId!;
    const period = await this.getPeriod(organizationId, periodId);
    if (
      period.status !== PayrollPeriodStatus.PAID &&
      period.status !== PayrollPeriodStatus.APPROVED
    ) {
      throw new BadRequestException('Payroll must be approved or paid before locking');
    }

    await this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: {
        status: PayrollPeriodStatus.LOCKED,
        lockedAt: new Date(),
      },
    });

    return this.getPeriod(organizationId, periodId);
  }

  async addAdjustment(
    user: AuthenticatedUser,
    periodId: string,
    data: {
      employeeId: string;
      label: string;
      amount: number;
      componentType: import('@prisma/client').SalaryComponentType;
      componentId?: string;
      reason?: string;
    },
  ) {
    const organizationId = user.organizationId!;
    const period = await this.getPeriod(organizationId, periodId);
    assertPayrollPeriodEditable(period);

    const run = period.runs[0];
    if (!run) {
      throw new BadRequestException('Create a payroll run by calculating first');
    }

    return this.prisma.payrollAdjustment.create({
      data: {
        organizationId,
        payrollRunId: run.id,
        employeeId: data.employeeId,
        label: data.label,
        amount: data.amount,
        componentType: data.componentType,
        componentId: data.componentId,
        reason: data.reason,
        createdByUserId: user.userId,
      },
    });
  }

  async getDashboard(organizationId: string) {
    const periods = await this.prisma.payrollPeriod.findMany({
      where: { organizationId },
      orderBy: { startDate: 'desc' },
      take: 12,
      include: {
        runs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { items: true },
        },
      },
    });

    let totalPayroll = 0;
    let totalDeductions = 0;
    let totalOvertimeCost = 0;
    let pendingPayroll = 0;

    const trend: Array<{ period: string; netTotal: number }> = [];

    for (const period of periods) {
      const run = period.runs[0];
      if (!run) continue;
      const netTotal = run.items.reduce((s, i) => s + i.netAmount, 0);
      const deductions = run.items.reduce((s, i) => s + i.totalDeductions, 0);
      trend.push({ period: period.name, netTotal: Math.round(netTotal * 100) / 100 });

      if (
        period.status === PayrollPeriodStatus.REVIEW ||
        period.status === PayrollPeriodStatus.DRAFT ||
        period.status === PayrollPeriodStatus.PROCESSING
      ) {
        pendingPayroll += netTotal;
      }

      if (
        period.status === PayrollPeriodStatus.APPROVED ||
        period.status === PayrollPeriodStatus.PAID ||
        period.status === PayrollPeriodStatus.LOCKED
      ) {
        totalPayroll += netTotal;
        totalDeductions += deductions;
      }

      for (const item of run.items) {
        const breakdown = item.breakdown as Array<{ category: string; amount: number }>;
        totalOvertimeCost += breakdown
          .filter((l) => l.category === 'OVERTIME')
          .reduce((s, l) => s + l.amount, 0);
      }
    }

    const departmentPayroll = await this.departmentPayrollTotals(organizationId);

    return {
      totalPayroll: Math.round(totalPayroll * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      totalOvertimeCost: Math.round(totalOvertimeCost * 100) / 100,
      pendingPayroll: Math.round(pendingPayroll * 100) / 100,
      trend,
      departmentPayroll,
    };
  }

  private async departmentPayrollTotals(organizationId: string) {
    const latestLocked = await this.prisma.payrollPeriod.findFirst({
      where: {
        organizationId,
        status: {
          in: [
            PayrollPeriodStatus.APPROVED,
            PayrollPeriodStatus.PAID,
            PayrollPeriodStatus.LOCKED,
          ],
        },
      },
      orderBy: { startDate: 'desc' },
      include: {
        runs: {
          take: 1,
          include: {
            items: {
              include: {
                employee: { select: { departmentId: true, department: true } },
              },
            },
          },
        },
      },
    });

    if (!latestLocked?.runs[0]) return [];

    const byDept = new Map<
      string,
      { departmentId: string | null; name: string; totalNet: number }
    >();

    for (const item of latestLocked.runs[0].items) {
      const deptId = item.employee.departmentId ?? 'none';
      const name = item.employee.department?.name ?? 'Unassigned';
      const row = byDept.get(deptId) ?? {
        departmentId: item.employee.departmentId,
        name,
        totalNet: 0,
      };
      row.totalNet += item.netAmount;
      byDept.set(deptId, row);
    }

    return [...byDept.values()].map((r) => ({
      ...r,
      totalNet: Math.round(r.totalNet * 100) / 100,
    }));
  }

  async listMyPayslips(user: AuthenticatedUser) {
    const employee = await this.scope.getEmployeeForUser(
      user.organizationId!,
      user.userId,
    );
    if (!employee) {
      throw new BadRequestException('No employee profile linked');
    }
    return this.payslips.listPayslips(user.organizationId!, employee.id);
  }
}
