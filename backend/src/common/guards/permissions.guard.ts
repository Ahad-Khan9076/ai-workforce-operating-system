import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import type { PermissionCode } from '../constants/permissions.js';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    const user = request.user;

    const hasAll = required.every((permission) =>
      user.permissions.includes(permission),
    );

    if (!hasAll) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
