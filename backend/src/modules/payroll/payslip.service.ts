import { Injectable } from '@nestjs/common';
import {
  Prisma,
  SalaryComponentCategory,
  SalaryComponentType,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { StubPayslipPdfRenderer } from './payslip/stub-payslip-pdf.renderer.js';
import type { PayrollBreakdownLine } from './engine/payroll.types.js';
import { notFoundInTenant } from '../../common/utils/tenant.util.js';

@Injectable()
export class PayslipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfRenderer: StubPayslipPdfRenderer,
  ) {}

  async generateForRun(organizationId: string, payrollRunId: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id: payrollRunId, organizationId },
      include: {
        payrollPeriod: true,
        items: {
          include: {
            employee: { include: { department: true } },
          },
        },
      },
    });
    if (!run) notFoundInTenant('Payroll run');

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    const results = [];
    for (const item of run.items) {
      const breakdown = item.breakdown as unknown as PayrollBreakdownLine[];
      const earnings = breakdown.filter(
        (l) => l.componentType === SalaryComponentType.EARNING,
      );
      const deductions = breakdown.filter(
        (l) => l.componentType === SalaryComponentType.DEDUCTION,
      );
      const basic =
        earnings.find((l) => l.category === SalaryComponentCategory.BASIC)
          ?.amount ?? 0;
      const overtimeTotal = earnings
        .filter((l) => l.category === SalaryComponentCategory.OVERTIME)
        .reduce((s, l) => s + l.amount, 0);
      const taxTotal = deductions
        .filter((l) => l.category === SalaryComponentCategory.TAX)
        .reduce((s, l) => s + l.amount, 0);

      const slipNumber = `${run.payrollPeriod.name.replace(/\s+/g, '-').toUpperCase()}-${item.employee.employeeNumber}`;

      const snapshot = {
        employee: {
          name: `${item.employee.firstName} ${item.employee.lastName}`,
          employeeNumber: item.employee.employeeNumber,
          department: item.employee.department?.name,
        },
        period: {
          name: run.payrollPeriod.name,
          startDate: run.payrollPeriod.startDate.toISOString().slice(0, 10),
          endDate: run.payrollPeriod.endDate.toISOString().slice(0, 10),
        },
        currency: item.currency,
        basicSalary: basic,
        grossAmount: item.grossAmount,
        netAmount: item.netAmount,
        earnings,
        deductions,
        overtimeTotal,
        taxTotal,
        breakdown,
      };

      const pdf = await this.pdfRenderer.render({
        slipNumber,
        organizationName: org?.name ?? 'Organization',
        employee: snapshot.employee,
        period: snapshot.period,
        currency: item.currency,
        basicSalary: basic,
        earnings: earnings.map((e) => ({ name: e.name, amount: e.amount })),
        deductions: deductions.map((d) => ({ name: d.name, amount: d.amount })),
        overtimeTotal,
        taxTotal,
        grossAmount: item.grossAmount,
        netAmount: item.netAmount,
      });

      const snapshotJson = snapshot as unknown as Prisma.InputJsonValue;

      const payslip = await this.prisma.payslip.upsert({
        where: { payrollItemId: item.id },
        update: {
          snapshot: snapshotJson,
          pdfStorageKey: pdf.storageKey,
          generatedAt: new Date(),
        },
        create: {
          organizationId,
          payrollPeriodId: run.payrollPeriodId,
          payrollItemId: item.id,
          employeeId: item.employeeId,
          slipNumber,
          snapshot: snapshotJson,
          pdfStorageKey: pdf.storageKey,
        },
      });
      results.push(payslip);
    }

    return results;
  }

  listPayslips(organizationId: string, employeeId?: string) {
    return this.prisma.payslip.findMany({
      where: {
        organizationId,
        ...(employeeId ? { employeeId } : {}),
      },
      orderBy: { generatedAt: 'desc' },
    });
  }

  async getPayslip(organizationId: string, id: string) {
    const slip = await this.prisma.payslip.findFirst({
      where: { id, organizationId },
    });
    if (!slip) notFoundInTenant('Payslip');
    return slip;
  }
}
