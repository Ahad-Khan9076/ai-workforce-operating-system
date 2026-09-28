import { Injectable } from '@nestjs/common';
import { EmploymentStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkforceDashboard(organizationId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalEmployees,
      activeEmployees,
      onLeaveEmployees,
      newHires,
      departmentCount,
    ] = await Promise.all([
      this.prisma.employee.count({ where: { organizationId } }),
      this.prisma.employee.count({
        where: { organizationId, employmentStatus: EmploymentStatus.ACTIVE },
      }),
      this.prisma.employee.count({
        where: { organizationId, employmentStatus: EmploymentStatus.ON_LEAVE },
      }),
      this.prisma.employee.count({
        where: {
          organizationId,
          joinDate: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.department.count({ where: { organizationId } }),
    ]);

    return {
      totalEmployees,
      activeEmployees,
      employeesOnLeave: onLeaveEmployees,
      newHires,
      departments: departmentCount,
    };
  }
}
