import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  EmploymentStatus,
  Prisma,
  TimelineEventType,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { notFoundInTenant } from '../../common/utils/tenant.util.js';
import { FileStorageService } from '../documents/storage/storage.interface.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { QueryEmployeesDto } from './dto/query-employees.dto.js';
import { CreateEmployeeDocumentDto } from './dto/create-document.dto.js';
import { AssignEmployeeSkillDto } from './dto/assign-skill.dto.js';
import {
  employeeDetailInclude,
  employeeListInclude,
} from './employees.constants.js';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: FileStorageService,
    private readonly auditService: AuditService,
  ) {}

  async list(organizationId: string, query: QueryEmployeesDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.EmployeeWhereInput = { organizationId };

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { preferredName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { employeeNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.status) where.employmentStatus = query.status;
    if (query.jobTitleId) where.jobTitleId = query.jobTitleId;
    if (query.managerId) where.managerId = query.managerId;

    const sortBy = query.sortBy ?? 'lastName';
    const sortOrder = query.sortOrder ?? 'asc';

    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        include: employeeListInclude,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getById(organizationId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      include: employeeDetailInclude,
    });
    if (!employee) notFoundInTenant('Employee');
    return employee;
  }

  async create(
    organizationId: string,
    actorUserId: string,
    dto: CreateEmployeeDto,
  ) {
    await this.validateStructure(organizationId, dto);
    await this.validateManager(organizationId, dto.managerId);
    const employeeNumber =
      dto.employeeNumber ??
      (await this.generateEmployeeNumber(organizationId));

    try {
      const employee = await this.prisma.$transaction(async (tx) => {
        const created = await tx.employee.create({
          data: {
            organizationId,
            employeeNumber,
            firstName: dto.firstName,
            lastName: dto.lastName,
            preferredName: dto.preferredName,
            email: dto.email.toLowerCase(),
            phone: dto.phone,
            profilePhotoUrl: dto.profilePhotoUrl,
            dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
            jobTitleId: dto.jobTitleId,
            departmentId: dto.departmentId,
            teamId: dto.teamId,
            managerId: dto.managerId,
            membershipId: dto.membershipId,
            employmentType: dto.employmentType,
            employmentStatus: dto.employmentStatus ?? EmploymentStatus.ACTIVE,
            joinDate: dto.joinDate ? new Date(dto.joinDate) : new Date(),
            probationEndDate: dto.probationEndDate
              ? new Date(dto.probationEndDate)
              : undefined,
            workLocation: dto.workLocation,
            address: dto.address as Prisma.InputJsonValue,
            emergencyContact: dto.emergencyContact as Prisma.InputJsonValue,
            bio: dto.bio,
            certifications: dto.certifications as Prisma.InputJsonValue,
          },
          include: employeeDetailInclude,
        });

        await tx.employeeTimelineEvent.create({
          data: {
            organizationId,
            employeeId: created.id,
            eventType: TimelineEventType.HIRED,
            title: 'Employee hired',
            description: `${created.firstName} ${created.lastName} joined the organization`,
            occurredAt: created.joinDate ?? new Date(),
            createdByUserId: actorUserId,
          },
        });

        return created;
      });

      await this.auditService.log({
        organizationId,
        actorUserId,
        action: 'employee.created',
        resourceType: 'employee',
        resourceId: employee.id,
      });

      return employee;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Employee number or email already exists');
      }
      throw error;
    }
  }

  async update(
    organizationId: string,
    employeeId: string,
    actorUserId: string,
    dto: UpdateEmployeeDto,
  ) {
    const existing = await this.getById(organizationId, employeeId);
    await this.validateStructure(organizationId, dto);
    await this.validateManager(organizationId, dto.managerId, employeeId);

    const updated = await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        employeeNumber: dto.employeeNumber,
        firstName: dto.firstName,
        lastName: dto.lastName,
        preferredName: dto.preferredName,
        email: dto.email?.toLowerCase(),
        phone: dto.phone,
        profilePhotoUrl: dto.profilePhotoUrl,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        jobTitleId: dto.jobTitleId,
        departmentId: dto.departmentId,
        teamId: dto.teamId,
        managerId: dto.managerId,
        membershipId: dto.membershipId,
        employmentType: dto.employmentType,
        employmentStatus: dto.employmentStatus,
        joinDate: dto.joinDate ? new Date(dto.joinDate) : undefined,
        probationEndDate: dto.probationEndDate
          ? new Date(dto.probationEndDate)
          : undefined,
        workLocation: dto.workLocation,
        address: dto.address as Prisma.InputJsonValue,
        emergencyContact: dto.emergencyContact as Prisma.InputJsonValue,
        bio: dto.bio,
        certifications: dto.certifications as Prisma.InputJsonValue,
      },
      include: employeeDetailInclude,
    });

    await this.recordChangeEvents(
      organizationId,
      employeeId,
      actorUserId,
      existing,
      updated,
      dto,
    );

    await this.auditService.log({
      organizationId,
      actorUserId,
      action: 'employee.updated',
      resourceType: 'employee',
      resourceId: employeeId,
    });

    return updated;
  }

  async remove(organizationId: string, employeeId: string, actorUserId: string) {
    await this.getById(organizationId, employeeId);
    await this.prisma.employee.delete({ where: { id: employeeId } });
    await this.auditService.log({
      organizationId,
      actorUserId,
      action: 'employee.deleted',
      resourceType: 'employee',
      resourceId: employeeId,
    });
    return { message: 'Employee deleted' };
  }

  async listTimeline(organizationId: string, employeeId: string) {
    await this.getById(organizationId, employeeId);
    return this.prisma.employeeTimelineEvent.findMany({
      where: { organizationId, employeeId },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async addDocument(
    organizationId: string,
    employeeId: string,
    actorUserId: string,
    dto: CreateEmployeeDocumentDto,
  ) {
    await this.getById(organizationId, employeeId);
    const stored = await this.storage.resolveFileUrl({
      fileUrl: dto.fileUrl,
      storageKey: dto.storageKey,
    });

    const document = await this.prisma.$transaction(async (tx) => {
      const created = await tx.employeeDocument.create({
        data: {
          organizationId,
          employeeId,
          name: dto.name,
          type: dto.type,
          fileUrl: stored.fileUrl,
          storageKey: stored.storageKey,
          uploadedByUserId: actorUserId,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
          visibility: dto.visibility,
        },
      });

      await tx.employeeTimelineEvent.create({
        data: {
          organizationId,
          employeeId,
          eventType: TimelineEventType.DOCUMENT,
          title: `Document added: ${dto.name}`,
          createdByUserId: actorUserId,
          metadata: { documentId: created.id, type: dto.type },
        },
      });

      return created;
    });

    return document;
  }

  async listDocuments(organizationId: string, employeeId: string) {
    await this.getById(organizationId, employeeId);
    return this.prisma.employeeDocument.findMany({
      where: { organizationId, employeeId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async assignSkill(
    organizationId: string,
    employeeId: string,
    dto: AssignEmployeeSkillDto,
  ) {
    await this.getById(organizationId, employeeId);
    const skill = await this.prisma.skill.findFirst({
      where: { id: dto.skillId, organizationId },
    });
    if (!skill) notFoundInTenant('Skill');

    return this.prisma.employeeSkill.upsert({
      where: {
        employeeId_skillId: { employeeId, skillId: dto.skillId },
      },
      update: {
        proficiency: dto.proficiency,
        yearsExperience: dto.yearsExperience,
        verified: dto.verified ?? false,
        source: dto.source,
      },
      create: {
        employeeId,
        skillId: dto.skillId,
        proficiency: dto.proficiency,
        yearsExperience: dto.yearsExperience,
        verified: dto.verified ?? false,
        source: dto.source,
      },
      include: { skill: { include: { category: true } } },
    });
  }

  async listSkills(organizationId: string, employeeId: string) {
    await this.getById(organizationId, employeeId);
    return this.prisma.employeeSkill.findMany({
      where: { employeeId },
      include: { skill: { include: { category: true } } },
    });
  }

  private async validateStructure(
    organizationId: string,
    dto: Partial<CreateEmployeeDto>,
  ) {
    if (dto.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, organizationId },
      });
      if (!department) notFoundInTenant('Department');
    }
    if (dto.teamId) {
      const team = await this.prisma.team.findFirst({
        where: { id: dto.teamId, organizationId },
      });
      if (!team) notFoundInTenant('Team');
      if (dto.departmentId && team.departmentId !== dto.departmentId) {
        throw new BadRequestException('Team does not belong to the selected department');
      }
    }
    if (dto.jobTitleId) {
      const jobTitle = await this.prisma.jobTitle.findFirst({
        where: { id: dto.jobTitleId, organizationId },
      });
      if (!jobTitle) notFoundInTenant('Job title');
    }
    if (dto.membershipId) {
      const membership = await this.prisma.organizationMember.findFirst({
        where: { id: dto.membershipId, organizationId },
      });
      if (!membership) notFoundInTenant('Organization membership');
    }
  }

  private async validateManager(
    organizationId: string,
    managerId?: string,
    employeeId?: string,
  ) {
    if (!managerId) return;
    if (employeeId && managerId === employeeId) {
      throw new BadRequestException('Employee cannot be their own manager');
    }
    const manager = await this.prisma.employee.findFirst({
      where: { id: managerId, organizationId },
    });
    if (!manager) notFoundInTenant('Manager');
  }

  private async generateEmployeeNumber(organizationId: string) {
    const count = await this.prisma.employee.count({ where: { organizationId } });
    return `EMP-${String(count + 1).padStart(5, '0')}`;
  }

  private async recordChangeEvents(
    organizationId: string,
    employeeId: string,
    actorUserId: string,
    before: { employmentStatus: EmploymentStatus; departmentId: string | null; managerId: string | null },
    after: { employmentStatus: EmploymentStatus; departmentId: string | null; managerId: string | null },
    dto: UpdateEmployeeDto,
  ) {
    const events: Prisma.EmployeeTimelineEventCreateManyInput[] = [];

    if (dto.employmentStatus && before.employmentStatus !== after.employmentStatus) {
      events.push({
        organizationId,
        employeeId,
        eventType: TimelineEventType.OTHER,
        title: 'Employment status changed',
        description: `${before.employmentStatus} → ${after.employmentStatus}`,
        createdByUserId: actorUserId,
      });
    }
    if (dto.departmentId && before.departmentId !== after.departmentId) {
      events.push({
        organizationId,
        employeeId,
        eventType: TimelineEventType.DEPARTMENT_CHANGE,
        title: 'Department changed',
        createdByUserId: actorUserId,
        metadata: {
          fromDepartmentId: before.departmentId,
          toDepartmentId: after.departmentId,
        },
      });
    }
    if (dto.managerId !== undefined && before.managerId !== after.managerId) {
      events.push({
        organizationId,
        employeeId,
        eventType: TimelineEventType.MANAGER_CHANGE,
        title: 'Manager changed',
        createdByUserId: actorUserId,
        metadata: {
          fromManagerId: before.managerId,
          toManagerId: after.managerId,
        },
      });
    }

    if (events.length > 0) {
      await this.prisma.employeeTimelineEvent.createMany({ data: events });
    }
  }
}
