import { ForbiddenException, NotFoundException } from '@nestjs/common';

export function assertSameOrganization(
  resourceOrganizationId: string,
  contextOrganizationId: string,
  resourceLabel = 'Resource',
) {
  if (resourceOrganizationId !== contextOrganizationId) {
    throw new ForbiddenException(`${resourceLabel} does not belong to your organization`);
  }
}

export function notFoundInTenant(resourceLabel = 'Resource'): never {
  throw new NotFoundException(`${resourceLabel} not found`);
}
