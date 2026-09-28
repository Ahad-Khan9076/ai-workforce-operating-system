import type { PermissionCode } from '../constants/permissions.js';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  organizationId?: string;
  membershipId?: string;
  roleId?: string;
  roleCode?: string;
  permissions: PermissionCode[];
}

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId?: string;
  membershipId?: string;
  roleId?: string;
  roleCode?: string;
  permissions: PermissionCode[];
}
