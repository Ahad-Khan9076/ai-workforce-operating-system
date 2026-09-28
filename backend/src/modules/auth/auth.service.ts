import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthTokenType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service.js';
import type {
  AuthenticatedUser,
  JwtPayload,
} from '../../common/interfaces/authenticated-user.interface.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenService } from './refresh-token.service.js';
import { AuthTokenService } from './auth-token.service.js';
import { RbacService } from '../rbac/rbac.service.js';
import { MailService } from '../notifications/mail.service.js';
import { AuditService } from '../audit/audit.service.js';

export interface AuthAuditContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthTokensResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    emailVerified: boolean;
  };
  organizationId?: string;
  roleCode?: string;
  permissions: string[];
  organizations?: Array<{ id: string; name: string; slug: string; roleCode: string }>;
  requiresOrganizationSelection?: boolean;
  requiresOrganizationSetup?: boolean;
  refreshToken?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly authTokenService: AuthTokenService,
    private readonly rbacService: RbacService,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokensResponse> {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    const verification = await this.authTokenService.create(
      user.id,
      AuthTokenType.EMAIL_VERIFICATION,
      48,
    );
    const appUrl = this.configService.get<string>('appUrl');
    await this.mailService.send({
      to: user.email,
      subject: 'Verify your email',
      html: `<p>Verify your email: <a href="${appUrl}/verify-email?token=${verification.token}">Verify</a></p>`,
      text: `Verify your email: ${appUrl}/verify-email?token=${verification.token}`,
    });

    const refresh = await this.refreshTokenService.issue(user.id);
    return {
      ...(await this.buildSessionForUser(user.id)),
      refreshToken: refresh.token,
    };
  }

  async login(
    dto: LoginDto,
    auditContext?: AuthAuditContext,
  ): Promise<AuthTokensResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const refresh = await this.refreshTokenService.issue(user.id);
    const session = await this.buildSessionForUser(user.id);

    await this.auditService.log({
      actorUserId: user.id,
      organizationId: session.organizationId,
      action: 'auth.login',
      resourceType: 'user',
      resourceId: user.id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    });

    return {
      ...session,
      refreshToken: refresh.token,
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokensResponse> {
    const rotated = await this.refreshTokenService.rotate(refreshToken);
    return {
      ...(await this.buildSessionForUser(rotated.userId)),
      refreshToken: rotated.token,
    };
  }

  async logout(
    refreshToken?: string,
    userId?: string,
    auditContext?: AuthAuditContext,
  ) {
    if (refreshToken) {
      await this.refreshTokenService.revoke(refreshToken);
    }
    if (userId) {
      await this.refreshTokenService.revokeAllForUser(userId);
      await this.auditService.log({
        actorUserId: userId,
        action: 'auth.logout',
        resourceType: 'user',
        resourceId: userId,
        ipAddress: auditContext?.ipAddress,
        userAgent: auditContext?.userAgent,
      });
    }
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) {
      return { message: 'If the email exists, a reset link was sent.' };
    }

    const reset = await this.authTokenService.create(
      user.id,
      AuthTokenType.PASSWORD_RESET,
      2,
    );
    const appUrl = this.configService.get<string>('appUrl');
    await this.mailService.send({
      to: user.email,
      subject: 'Reset your password',
      html: `<p>Reset password: <a href="${appUrl}/reset-password?token=${reset.token}">Reset</a></p>`,
      text: `Reset password: ${appUrl}/reset-password?token=${reset.token}`,
    });

    return { message: 'If the email exists, a reset link was sent.' };
  }

  async resetPassword(token: string, password: string) {
    const record = await this.authTokenService.consume(
      token,
      AuthTokenType.PASSWORD_RESET,
    );
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    await this.refreshTokenService.revokeAllForUser(record.userId);
    return { message: 'Password updated successfully' };
  }

  async verifyEmail(token: string) {
    const record = await this.authTokenService.consume(
      token,
      AuthTokenType.EMAIL_VERIFICATION,
    );
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    });
    return { message: 'Email verified successfully' };
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.emailVerifiedAt) {
      return { message: 'Email is already verified' };
    }
    const verification = await this.authTokenService.create(
      user.id,
      AuthTokenType.EMAIL_VERIFICATION,
      48,
    );
    const appUrl = this.configService.get<string>('appUrl');
    await this.mailService.send({
      to: user.email,
      subject: 'Verify your email',
      html: `<p>Verify: <a href="${appUrl}/verify-email?token=${verification.token}">Verify</a></p>`,
    });
    return { message: 'Verification email sent' };
  }

  async selectOrganization(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
      include: { role: true, user: true },
    });

    if (!membership) {
      throw new UnauthorizedException('Organization membership not found');
    }

    const permissions = await this.rbacService.getPermissionsForRole(
      membership.roleId,
    );
    const refresh = await this.refreshTokenService.issue(userId);

    return {
      ...(await this.buildAuthResponse(
        membership.user,
        membership,
        permissions,
      )),
      refreshToken: refresh.token,
    };
  }

  async getProfile(user: AuthenticatedUser) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        memberships: {
          include: { organization: true, role: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!dbUser) {
      throw new UnauthorizedException();
    }

    const organizations = dbUser.memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      roleCode: m.role.code,
    }));

    if (!user.organizationId) {
      return {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          emailVerified: Boolean(dbUser.emailVerifiedAt),
        },
        organizations,
        requiresOrganizationSetup: organizations.length === 0,
        requiresOrganizationSelection: organizations.length > 1,
      };
    }

    const membership = dbUser.memberships.find(
      (m) => m.organizationId === user.organizationId,
    );
    if (!membership) {
      throw new UnauthorizedException('Organization membership not found');
    }

    const permissions = await this.rbacService.getPermissionsForRole(
      membership.roleId,
    );

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        emailVerified: Boolean(dbUser.emailVerifiedAt),
      },
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        legalName: membership.organization.legalName,
        logoUrl: membership.organization.logoUrl,
        website: membership.organization.website,
        industry: membership.organization.industry,
        companySize: membership.organization.companySize,
        country: membership.organization.country,
        timezone: membership.organization.timezone,
        currency: membership.organization.currency,
        primaryContact: membership.organization.primaryContact,
      },
      role: membership.role.code,
      permissions,
      organizations,
    };
  }

  async buildSessionForUser(userId: string): Promise<AuthTokensResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { organization: true, role: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const organizations = user.memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      roleCode: m.role.code,
    }));

    if (user.memberships.length === 0) {
      return this.buildAuthResponse(user, null, []);
    }

    if (user.memberships.length > 1) {
      return {
        ...(await this.buildAuthResponse(user, null, [])),
        organizations,
        requiresOrganizationSelection: true,
      };
    }

    const membership = user.memberships[0]!;
    const permissions = await this.rbacService.getPermissionsForRole(
      membership.roleId,
    );
    return this.buildAuthResponse(user, membership, permissions);
  }

  private async buildAuthResponse(
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      emailVerifiedAt: Date | null;
    },
    membership: {
      id: string;
      organizationId: string;
      roleId: string;
      role: { code: string };
    } | null,
    permissions: string[],
  ): Promise<AuthTokensResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: membership?.organizationId,
      membershipId: membership?.id,
      roleId: membership?.roleId,
      roleCode: membership?.role.code,
      permissions: permissions as JwtPayload['permissions'],
    };

    const ttl = this.configService.get<number>('auth.accessTtlSeconds') ?? 900;
    const accessToken = this.jwtService.sign(payload, { expiresIn: ttl });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: Boolean(user.emailVerifiedAt),
      },
      organizationId: membership?.organizationId,
      roleCode: membership?.role.code,
      permissions,
      requiresOrganizationSetup: !membership,
    };
  }
}
