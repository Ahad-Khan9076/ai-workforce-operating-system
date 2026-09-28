import { Injectable } from '@nestjs/common';
import {
  SalaryCalculationMethod,
  SalaryComponentCategory,
  SalaryComponentType,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { notFoundInTenant } from '../../common/utils/tenant.util.js';

@Injectable()
export class SalaryStructureService {
  constructor(private readonly prisma: PrismaService) {}

  listStructures(organizationId: string) {
    return this.prisma.salaryStructure.findMany({
      where: { organizationId, isActive: true },
      include: { components: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  async ensureDefaultStructure(organizationId: string, currency = 'USD') {
    let structure = await this.prisma.salaryStructure.findFirst({
      where: { organizationId, isDefault: true },
    });
    if (structure) return structure;

    structure = await this.prisma.salaryStructure.create({
      data: {
        organizationId,
        name: 'Standard',
        currency,
        isDefault: true,
      },
    });

    const effectiveFrom = new Date('2020-01-01T00:00:00.000Z');
    const defaults = [
      {
        code: 'BASIC',
        name: 'Basic salary',
        componentType: SalaryComponentType.EARNING,
        category: SalaryComponentCategory.BASIC,
        calculationMethod: SalaryCalculationMethod.FIXED,
        sortOrder: 10,
      },
      {
        code: 'ALLOWANCE',
        name: 'Allowance',
        componentType: SalaryComponentType.EARNING,
        category: SalaryComponentCategory.ALLOWANCE,
        calculationMethod: SalaryCalculationMethod.FIXED,
        fixedAmount: 0,
        sortOrder: 20,
      },
      {
        code: 'OT',
        name: 'Overtime',
        componentType: SalaryComponentType.EARNING,
        category: SalaryComponentCategory.OVERTIME,
        calculationMethod: SalaryCalculationMethod.ATTENDANCE_DERIVED,
        sortOrder: 30,
      },
      {
        code: 'TAX',
        name: 'Tax',
        componentType: SalaryComponentType.DEDUCTION,
        category: SalaryComponentCategory.TAX,
        calculationMethod: SalaryCalculationMethod.FIXED,
        percentage: 10,
        isTaxable: false,
        sortOrder: 100,
      },
      {
        code: 'UNPAID_LEAVE',
        name: 'Unpaid leave',
        componentType: SalaryComponentType.DEDUCTION,
        category: SalaryComponentCategory.UNPAID_LEAVE,
        calculationMethod: SalaryCalculationMethod.ATTENDANCE_DERIVED,
        sortOrder: 110,
      },
      {
        code: 'LOAN',
        name: 'Loan installment',
        componentType: SalaryComponentType.DEDUCTION,
        category: SalaryComponentCategory.LOAN,
        calculationMethod: SalaryCalculationMethod.ATTENDANCE_DERIVED,
        sortOrder: 120,
      },
    ];

    for (const def of defaults) {
      await this.prisma.salaryComponent.create({
        data: {
          organizationId,
          salaryStructureId: structure.id,
          effectiveFrom,
          isRecurring: true,
          fixedAmount: 0,
          percentage: def.code === 'TAX' ? 10 : 0,
          isTaxable: def.code === 'ALLOWANCE',
          ...def,
        },
      });
    }

    return structure;
  }

  createStructure(
    organizationId: string,
    data: { name: string; currency?: string; isDefault?: boolean },
  ) {
    return this.prisma.salaryStructure.create({
      data: {
        organizationId,
        name: data.name,
        currency: data.currency ?? 'USD',
        isDefault: data.isDefault ?? false,
      },
    });
  }

  createComponent(
    organizationId: string,
    data: {
      salaryStructureId: string;
      code: string;
      name: string;
      componentType: SalaryComponentType;
      category: SalaryComponentCategory;
      calculationMethod: SalaryCalculationMethod;
      fixedAmount?: number;
      percentage?: number;
      isTaxable?: boolean;
      isRecurring?: boolean;
      effectiveFrom: Date;
      effectiveTo?: Date;
      sortOrder?: number;
    },
  ) {
    return this.prisma.salaryComponent.create({
      data: {
        organizationId,
        fixedAmount: data.fixedAmount ?? 0,
        percentage: data.percentage ?? 0,
        isTaxable: data.isTaxable ?? false,
        isRecurring: data.isRecurring ?? true,
        sortOrder: data.sortOrder ?? 0,
        ...data,
      },
    });
  }

  async getStructure(organizationId: string, id: string) {
    const row = await this.prisma.salaryStructure.findFirst({
      where: { id, organizationId },
      include: { components: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
    });
    if (!row) notFoundInTenant('Salary structure');
    return row;
  }

  assignEmployeeSalary(
    organizationId: string,
    data: {
      employeeId: string;
      salaryStructureId: string;
      baseAmount: number;
      currency?: string;
      effectiveFrom: Date;
      effectiveTo?: Date;
    },
  ) {
    return this.prisma.employeeSalary.create({
      data: {
        organizationId,
        currency: data.currency ?? 'USD',
        ...data,
      },
      include: { salaryStructure: true, employee: true },
    });
  }

  listEmployeeSalaries(organizationId: string, employeeId?: string) {
    return this.prisma.employeeSalary.findMany({
      where: {
        organizationId,
        ...(employeeId ? { employeeId } : {}),
      },
      include: { salaryStructure: true, employee: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }
}
