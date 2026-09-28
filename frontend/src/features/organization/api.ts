import { apiRequest } from '@/lib/api-client';
import type { AuthSession } from '@/types';

export interface CreateOrganizationPayload {
  name: string;
  legalName?: string;
  logoUrl?: string;
  website?: string;
  industry?: string;
  companySize?: string;
  country?: string;
  timezone?: string;
  currency?: string;
  primaryContact?: string;
}

export async function createOrganizationRequest(payload: CreateOrganizationPayload) {
  return apiRequest<AuthSession>('/organizations', {
    method: 'POST',
    body: payload,
  });
}

export async function updateOrganizationRequest(payload: Partial<CreateOrganizationPayload>) {
  return apiRequest('/organizations/current', {
    method: 'PATCH',
    body: payload,
  });
}

export async function fetchCurrentOrganization() {
  return apiRequest('/organizations/current', { method: 'GET' });
}
