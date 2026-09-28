import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { SelectOrganizationDto } from './dto/select-organization.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { SkipTenantBodyCheck } from '../../common/decorators/skip-tenant-body-check.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import {
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from './auth-cookie.util.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private attachRefreshCookie(res: Response, refreshToken?: string) {
    if (refreshToken) {
      setRefreshTokenCookie(res, this.configService, refreshToken);
    }
  }

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    this.attachRefreshCookie(res, result.refreshToken);
    const { refreshToken: _, ...body } = result;
    return body;
  }

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.attachRefreshCookie(res, result.refreshToken);
    const { refreshToken: _, ...body } = result;
    return body;
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieName =
      this.configService.get<string>('auth.refreshCookieName') ?? 'refresh_token';
    const token = getRefreshTokenFromRequest(req, cookieName);
    if (!token) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const result = await this.authService.refresh(token);
    this.attachRefreshCookie(res, result.refreshToken);
    const { refreshToken: _, ...body } = result;
    return body;
  }

  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const cookieName =
      this.configService.get<string>('auth.refreshCookieName') ?? 'refresh_token';
    const token = getRefreshTokenFromRequest(req, cookieName);
    await this.authService.logout(token, user.userId);
    clearRefreshTokenCookie(res, this.configService);
    return { message: 'Logged out' };
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Public()
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  resendVerification(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.resendVerification(user.userId);
  }

  @Post('select-organization')
  @SkipTenantBodyCheck()
  async selectOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SelectOrganizationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.selectOrganization(
      user.userId,
      dto.organizationId,
    );
    this.attachRefreshCookie(res, result.refreshToken);
    const { refreshToken: _, ...body } = result;
    return body;
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user);
  }
}
