import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { notFoundInTenant } from '../../common/utils/tenant.util.js';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  listDepartments(organizationId: string) {
    return this.prisma.department.findMany({
      where: { organizationId },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { employees: true, teams: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getDepartment(organizationId: string, departmentId: string) {
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, organizationId },
      include: {
        manager: true,
        teams: {
          include: {
            lead: { select: { id: true, firstName: true, lastName: true } },
            _count: { select: { employees: true } },
          },
        },
        employees: {
          take: 50,
          include: {
            jobTitle: true,
            manager: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        _count: { select: { employees: true } },
      },
    });
    if (!department) notFoundInTenant('Department');
    return department;
  }

  createDepartment(
    organizationId: string,
    data: {
      name: string;
      code?: string;
      description?: string;
      managerEmployeeId?: string;
    },
  ) {
    return this.prisma.department.create({
      data: { organizationId, ...data },
    });
  }

  async updateDepartment(
    organizationId: string,
    departmentId: string,
    data: {
      name?: string;
      code?: string;
      description?: string;
      managerEmployeeId?: string | null;
    },
  ) {
    await this.getDepartment(organizationId, departmentId);
    if (data.managerEmployeeId) {
      await this.assertEmployee(organizationId, data.managerEmployeeId);
    }
    return this.prisma.department.update({
      where: { id: departmentId },
      data,
    });
  }

  listTeams(organizationId: string, departmentId?: string) {
    return this.prisma.team.findMany({
      where: { organizationId, ...(departmentId ? { departmentId } : {}) },
      include: {
        department: true,
        lead: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createTeam(
    organizationId: string,
    data: {
      departmentId: string;
      name: string;
      description?: string;
      leadEmployeeId?: string;
    },
  ) {
    const department = await this.prisma.department.findFirst({
      where: { id: data.departmentId, organizationId },
    });
    if (!department) notFoundInTenant('Department');
    if (data.leadEmployeeId) {
      await this.assertEmployee(organizationId, data.leadEmployeeId);
    }
    return this.prisma.team.create({ data: { organizationId, ...data } });
  }

  listJobTitles(organizationId: string) {
    return this.prisma.jobTitle.findMany({
      where: { organizationId },
      orderBy: { title: 'asc' },
    });
  }

  createJobTitle(
    organizationId: string,
    data: { title: string; level?: string; description?: string },
  ) {
    return this.prisma.jobTitle.create({ data: { organizationId, ...data } });
  }

  listPositions(organizationId: string) {
    return this.prisma.position.findMany({
      where: { organizationId },
      include: {
        jobTitle: true,
        department: true,
        team: true,
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async createPosition(
    organizationId: string,
    data: {
      jobTitleId: string;
      departmentId: string;
      teamId?: string;
      code?: string;
      isOpen?: boolean;
      employeeId?: string;
    },
  ) {
    await this.assertJobTitle(organizationId, data.jobTitleId);
    const department = await this.prisma.department.findFirst({
      where: { id: data.departmentId, organizationId },
    });
    if (!department) notFoundInTenant('Department');
    if (data.teamId) {
      const team = await this.prisma.team.findFirst({
        where: { id: data.teamId, organizationId, departmentId: data.departmentId },
      });
      if (!team) {
        throw new BadRequestException('Team must belong to the selected department');
      }
    }
    if (data.employeeId) {
      await this.assertEmployee(organizationId, data.employeeId);
    }
    return this.prisma.position.create({ data: { organizationId, ...data } });
  }

  listSkills(organizationId: string) {
    return this.prisma.skill.findMany({
      where: { organizationId },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }

  createSkillCategory(organizationId: string, name: string, description?: string) {
    return this.prisma.skillCategory.create({
      data: { organizationId, name, description },
    });
  }

  createSkill(
    organizationId: string,
    data: { name: string; description?: string; categoryId?: string },
  ) {
    return this.prisma.skill.create({ data: { organizationId, ...data } });
  }

  async getOrganizationStructure(organizationId: string) {
    const [departments, jobTitles, positions, employeeCount] = await Promise.all([
      this.listDepartments(organizationId),
      this.listJobTitles(organizationId),
      this.listPositions(organizationId),
      this.prisma.employee.count({ where: { organizationId } }),
    ]);
    return { departments, jobTitles, positions, employeeCount };
  }

  private async assertEmployee(organizationId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
    });
    if (!employee) notFoundInTenant('Employee');
  }

  private async assertJobTitle(organizationId: string, jobTitleId: string) {
    const jobTitle = await this.prisma.jobTitle.findFirst({
      where: { id: jobTitleId, organizationId },
    });
    if (!jobTitle) notFoundInTenant('Job title');
  }
}
