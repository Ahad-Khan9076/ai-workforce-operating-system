import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_TENANT_BODY_CHECK_KEY } from '../decorators/skip-tenant-body-check.decorator.js';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_TENANT_BODY_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      body?: Record<string, unknown>;
      query?: Record<string, unknown>;
    }>();

    if (!request.user?.organizationId) {
      return true;
    }

    const forbiddenKeys = ['organizationId', 'organization_id'];
    for (const key of forbiddenKeys) {
      if (request.body && key in request.body) {
        throw new BadRequestException(
          'organizationId must not be supplied by the client',
        );
      }
      if (request.query && key in request.query) {
        throw new BadRequestException(
          'organizationId must not be supplied by the client',
        );
      }
    }

    return true;
  }
}
