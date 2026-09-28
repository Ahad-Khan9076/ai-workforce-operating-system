import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { InvitationsService } from './invitations.service.js';
import { setRefreshTokenCookie } from '../auth/auth-cookie.util.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireOrganization } from '../../common/decorators/require-organization.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { CreateInvitationDto } from './dto/create-invitation.dto.js';
import { AcceptInvitationDto } from './dto/accept-invitation.dto.js';

@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @RequireOrganization()
  @RequirePermissions(PERMISSIONS.MEMBER_READ)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.invitationsService.list(user.organizationId!);
  }

  @Post()
  @RequireOrganization()
  @RequirePermissions(PERMISSIONS.MEMBER_INVITE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.create(
      user.organizationId!,
      user.userId,
      dto,
    );
  }

  @Public()
  @Post('accept')
  async accept(
    @Body() dto: AcceptInvitationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.invitationsService.accept(dto);
    if (result.refreshToken) {
      setRefreshTokenCookie(res, this.configService, result.refreshToken);
    }
    const { refreshToken: _, ...body } = result;
    return body;
  }

  @Post(':invitationId/resend')
  @RequireOrganization()
  @RequirePermissions(PERMISSIONS.MEMBER_INVITE)
  resend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('invitationId') invitationId: string,
  ) {
    return this.invitationsService.resend(
      user.organizationId!,
      invitationId,
      user.userId,
    );
  }
}
