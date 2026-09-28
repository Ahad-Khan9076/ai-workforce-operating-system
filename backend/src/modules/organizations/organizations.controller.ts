import { Body, Controller, Get, Patch, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { OrganizationsService } from './organizations.service.js';
import { setRefreshTokenCookie } from '../auth/auth-cookie.util.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireOrganization } from '../../common/decorators/require-organization.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { CreateOrganizationDto } from './dto/create-organization.dto.js';
import { UpdateOrganizationDto } from './dto/update-organization.dto.js';

@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrganizationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.organizationsService.create(user.userId, dto);
    if (result.refreshToken) {
      setRefreshTokenCookie(res, this.configService, result.refreshToken);
    }
    const { refreshToken: _, ...body } = result;
    return body;
  }

  @Get('current')
  @RequireOrganization()
  @RequirePermissions(PERMISSIONS.ORGANIZATION_READ)
  getCurrent(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.getById(user.organizationId!);
  }

  @Patch('current')
  @RequireOrganization()
  @RequirePermissions(PERMISSIONS.ORGANIZATION_UPDATE)
  updateCurrent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(
      user.organizationId!,
      user.userId,
      dto,
    );
  }
}
