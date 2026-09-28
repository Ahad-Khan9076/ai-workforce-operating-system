import { apiRequest } from '@/lib/api-client';

export type OrganizationSettingsJson = {
  notifications?: Record<string, unknown>;
  ai?: Record<string, unknown>;
  integrations?: Record<string, unknown>;
  security?: Record<string, unknown>;
};

export function fetchOrganizationSettings() {
  return apiRequest<OrganizationSettingsJson>('/settings/organization');
}

export function patchOrganizationSettings(patch: OrganizationSettingsJson) {
  return apiRequest<OrganizationSettingsJson>('/settings/organization', {
    method: 'PATCH',
    body: patch,
  });
}
