import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { PERMISSIONS, ROLE_CODES } from '../../common/constants/permissions.js';

@Injectable()
export class EmployeeScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async getEmployeeForUser(organizationId: string, userId: string) {
    return this.prisma.employee.findFirst({
      where: {
        organizationId,
        membership: { userId },
      },
    });
  }

  hasOrgWideWorkforceAccess(user: AuthenticatedUser) {
    const code = user.roleCode;
    return (
      code === ROLE_CODES.OWNER ||
      code === ROLE_CODES.HR_ADMIN ||
      code === ROLE_CODES.HR_MANAGER ||
      code === ROLE_CODES.PAYROLL_ADMIN
    );
  }

  async assertCanAccessEmployee(
    user: AuthenticatedUser,
    employeeId: string,
  ) {
    if (this.hasOrgWideWorkforceAccess(user)) {
      const employee = await this.prisma.employee.findFirst({
        where: { id: employeeId, organizationId: user.organizationId },
      });
      if (!employee) {
        throw new ForbiddenException('Employee not found in organization');
      }
      return employee;
    }

    const self = await this.getEmployeeForUser(
      user.organizationId!,
      user.userId,
    );
    if (self?.id === employeeId) {
      return self;
    }

    if (user.permissions.includes(PERMISSIONS.ATTENDANCE_READ)) {
      const report = await this.prisma.employee.findFirst({
        where: {
          id: employeeId,
          organizationId: user.organizationId,
          managerId: self?.id,
        },
      });
      if (report) {
        return report;
      }
    }

    throw new ForbiddenException('You cannot access this employee record');
  }

  async getAccessibleEmployeeFilter(user: AuthenticatedUser) {
    if (this.hasOrgWideWorkforceAccess(user)) {
      return { organizationId: user.organizationId! };
    }

    const self = await this.getEmployeeForUser(
      user.organizationId!,
      user.userId,
    );
    if (!self) {
      return { organizationId: user.organizationId!, id: '__none__' };
    }

    if (
      user.permissions.includes(PERMISSIONS.ATTENDANCE_READ) ||
      user.permissions.includes(PERMISSIONS.LEAVE_APPROVE)
    ) {
      return {
        organizationId: user.organizationId!,
        OR: [{ id: self.id }, { managerId: self.id }],
      };
    }

    return { organizationId: user.organizationId!, id: self.id };
  }
}
