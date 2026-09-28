import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ORGANIZATION_KEY = 'requireOrganization';
export const RequireOrganization = () =>
  SetMetadata(REQUIRE_ORGANIZATION_KEY, true);
