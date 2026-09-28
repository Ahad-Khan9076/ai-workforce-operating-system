import { BadRequestException, Injectable } from '@nestjs/common';
import { EmployeeLoanStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { toWorkDateStorage } from '../workforce/workforce-date.util.js';
import { notFoundInTenant } from '../../common/utils/tenant.util.js';

@Injectable()
export class EmployeeLoanService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, employeeId?: string) {
    return this.prisma.employeeLoan.findMany({
      where: {
        organizationId,
        ...(employeeId ? { employeeId } : {}),
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(
    organizationId: string,
    data: {
      employeeId: string;
      principalAmount: number;
      installmentAmount: number;
      startDate: string;
      endDate: string;
    },
  ) {
    if (data.installmentAmount <= 0 || data.principalAmount <= 0) {
      throw new BadRequestException('Invalid loan amounts');
    }
    const start = toWorkDateStorage(data.startDate);
    const end = toWorkDateStorage(data.endDate);
    if (end < start) {
      throw new BadRequestException('End date must be after start date');
    }

    return this.prisma.employeeLoan.create({
      data: {
        organizationId,
        employeeId: data.employeeId,
        principalAmount: data.principalAmount,
        installmentAmount: data.installmentAmount,
        startDate: start,
        endDate: end,
        remainingBalance: data.principalAmount,
        status: EmployeeLoanStatus.ACTIVE,
      },
    });
  }

  async getInstallmentForPeriod(
    organizationId: string,
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    const loan = await this.prisma.employeeLoan.findFirst({
      where: {
        organizationId,
        employeeId,
        status: EmployeeLoanStatus.ACTIVE,
        startDate: { lte: periodEnd },
        endDate: { gte: periodStart },
        remainingBalance: { gt: 0 },
      },
      orderBy: { startDate: 'asc' },
    });
    if (!loan) return 0;
    return Math.min(loan.installmentAmount, loan.remainingBalance);
  }

  async applyInstallmentPayment(organizationId: string, employeeId: string, amount: number) {
    const loan = await this.prisma.employeeLoan.findFirst({
      where: {
        organizationId,
        employeeId,
        status: EmployeeLoanStatus.ACTIVE,
        remainingBalance: { gt: 0 },
      },
      orderBy: { startDate: 'asc' },
    });
    if (!loan || amount <= 0) return;

    const newBalance = Math.max(0, loan.remainingBalance - amount);
    await this.prisma.employeeLoan.update({
      where: { id: loan.id },
      data: {
        remainingBalance: newBalance,
        status:
          newBalance <= 0
            ? EmployeeLoanStatus.COMPLETED
            : EmployeeLoanStatus.ACTIVE,
      },
    });
  }

  async getLoan(organizationId: string, id: string) {
    const loan = await this.prisma.employeeLoan.findFirst({
      where: { id, organizationId },
    });
    if (!loan) notFoundInTenant('Loan');
    return loan;
  }
}
