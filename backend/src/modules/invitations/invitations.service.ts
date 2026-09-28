import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvitationStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service.js';
import { ConfigService } from '@nestjs/config';
import { generateSecureToken, hashToken } from '../../common/utils/crypto.util.js';
import { MailService } from '../notifications/mail.service.js';
import { AuditService } from '../audit/audit.service.js';
import { ROLE_CODES } from '../../common/constants/permissions.js';
import { AuthService } from '../auth/auth.service.js';
import { CreateInvitationDto } from './dto/create-invitation.dto.js';
import { AcceptInvitationDto } from './dto/accept-invitation.dto.js';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
  ) {}

  list(organizationId: string) {
    return this.prisma.organizationInvitation.findMany({
      where: { organizationId },
      include: { role: true, invitedBy: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    organizationId: string,
    invitedByUserId: string,
    dto: CreateInvitationDto,
  ) {
    const email = dto.email.toLowerCase();

    const existingMember = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        user: { email },
      },
    });
    if (existingMember) {
      throw new ConflictException('User is already a member of this organization');
    }

    const pending = await this.prisma.organizationInvitation.findFirst({
      where: {
        organizationId,
        email,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });
    if (pending) {
      throw new ConflictException('An active invitation already exists for this email');
    }

    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role || role.code === ROLE_CODES.OWNER) {
      throw new BadRequestException('Invalid role for invitation');
    }

    const token = generateSecureToken(48);
    const tokenHash = hashToken(token);
    const days = this.configService.get<number>('auth.invitationTtlDays') ?? 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.organizationInvitation.create({
      data: {
        organizationId,
        email,
        roleId: dto.roleId,
        invitedByUserId,
        tokenHash,
        expiresAt,
      },
      include: { role: true, organization: true },
    });

    const appUrl = this.configService.get<string>('appUrl');
    await this.mailService.send({
      to: email,
      subject: `Invitation to join ${invitation.organization.name}`,
      html: `<p>You were invited to ${invitation.organization.name}. <a href="${appUrl}/accept-invitation?token=${token}">Accept invitation</a></p>`,
      text: `Accept invitation: ${appUrl}/accept-invitation?token=${token}`,
    });

    await this.auditService.log({
      organizationId,
      actorUserId: invitedByUserId,
      action: 'invitation.created',
      resourceType: 'organization_invitation',
      resourceId: invitation.id,
      metadata: { email, roleCode: role.code },
    });

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
    };
  }

  async resend(organizationId: string, invitationId: string, actorUserId: string) {
    const invitation = await this.prisma.organizationInvitation.findFirst({
      where: { id: invitationId, organizationId },
      include: { organization: true, role: true },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Only pending invitations can be resent');
    }

    const token = generateSecureToken(48);
    const tokenHash = hashToken(token);
    const days = this.configService.get<number>('auth.invitationTtlDays') ?? 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.organizationInvitation.update({
      where: { id: invitationId },
      data: { tokenHash, expiresAt, updatedAt: new Date() },
    });

    const appUrl = this.configService.get<string>('appUrl');
    await this.mailService.send({
      to: invitation.email,
      subject: `Reminder: join ${invitation.organization.name}`,
      html: `<p><a href="${appUrl}/accept-invitation?token=${token}">Accept invitation</a></p>`,
    });

    await this.auditService.log({
      organizationId,
      actorUserId,
      action: 'invitation.resent',
      resourceType: 'organization_invitation',
      resourceId: invitationId,
    });

    return { message: 'Invitation resent' };
  }

  async accept(dto: AcceptInvitationDto) {
    const tokenHash = hashToken(dto.token);
    const invitation = await this.prisma.organizationInvitation.findUnique({
      where: { tokenHash },
      include: { organization: true, role: true },
    });

    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invalid invitation');
    }
    if (invitation.expiresAt < new Date()) {
      await this.prisma.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException('Invitation has expired');
    }

    let user = await this.prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (!user) {
      if (!dto.firstName || !dto.lastName || !dto.password) {
        throw new BadRequestException(
          'Account details are required for new users',
        );
      }
      const passwordHash = await bcrypt.hash(dto.password, 12);
      user = await this.prisma.user.create({
        data: {
          email: invitation.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          passwordHash,
          emailVerifiedAt: new Date(),
        },
      });
    }

    const existingMembership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: user.id,
        },
      },
    });
    if (existingMembership) {
      throw new ConflictException('User is already a member');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId: user!.id,
          roleId: invitation.roleId,
        },
      });

      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
          acceptedUserId: user!.id,
        },
      });
    });

    await this.auditService.log({
      organizationId: invitation.organizationId,
      actorUserId: user.id,
      action: 'invitation.accepted',
      resourceType: 'organization_invitation',
      resourceId: invitation.id,
    });

    return this.authService.selectOrganization(user.id, invitation.organizationId);
  }
}
