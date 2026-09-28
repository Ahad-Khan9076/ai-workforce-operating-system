import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { notFoundInTenant } from '../../common/utils/tenant.util.js';

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  listTemplates(organizationId: string) {
    return this.prisma.shiftTemplate.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  createTemplate(
    organizationId: string,
    data: {
      name: string;
      startTime: string;
      endTime: string;
      breakDurationMinutes: number;
      workingDays: number[];
      gracePeriodMinutes: number;
      overtimeThresholdMinutes: number;
    },
  ) {
    return this.prisma.shiftTemplate.create({
      data: {
        organizationId,
        ...data,
        workingDays: data.workingDays,
      },
    });
  }

  assignShift(
    organizationId: string,
    data: {
      employeeId: string;
      shiftTemplateId: string;
      effectiveFrom: Date;
      effectiveTo?: Date;
    },
  ) {
    return this.prisma.employeeShiftAssignment.create({
      data: { organizationId, ...data },
      include: { shiftTemplate: true, employee: true },
    });
  }

  listAssignments(organizationId: string, employeeId?: string) {
    return this.prisma.employeeShiftAssignment.findMany({
      where: {
        organizationId,
        ...(employeeId ? { employeeId } : {}),
      },
      include: { shiftTemplate: true, employee: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async getActiveShift(organizationId: string, employeeId: string, at: Date) {
    const assignment = await this.prisma.employeeShiftAssignment.findFirst({
      where: {
        organizationId,
        employeeId,
        effectiveFrom: { lte: at },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: at } }],
      },
      include: { shiftTemplate: true },
      orderBy: { effectiveFrom: 'desc' },
    });
    return assignment?.shiftTemplate ?? null;
  }

  async getTemplate(organizationId: string, id: string) {
    const template = await this.prisma.shiftTemplate.findFirst({
      where: { id, organizationId },
    });
    if (!template) notFoundInTenant('Shift template');
    return template;
  }
}
