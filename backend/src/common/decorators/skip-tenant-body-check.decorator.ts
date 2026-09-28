import { SetMetadata } from '@nestjs/common';

export const SKIP_TENANT_BODY_CHECK_KEY = 'skipTenantBodyCheck';
export const SkipTenantBodyCheck = () =>
  SetMetadata(SKIP_TENANT_BODY_CHECK_KEY, true);
