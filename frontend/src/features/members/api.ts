import { apiRequest } from '@/lib/api-client';
import type { AuthSession } from '@/types';

export interface RoleDto {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  permissions: string[];
}

export async function fetchRolesRequest() {
  return apiRequest<RoleDto[]>('/roles', { method: 'GET' });
}

export async function fetchAssignableRolesRequest() {
  return apiRequest<Array<{ id: string; code: string; name: string }>>(
    '/roles/assignable',
    { method: 'GET' },
  );
}

export async function fetchMembersRequest() {
  return apiRequest('/members', { method: 'GET' });
}

export async function createInvitationRequest(payload: { email: string; roleId: string }) {
  return apiRequest('/invitations', { method: 'POST', body: payload });
}

export async function fetchInvitationsRequest() {
  return apiRequest('/invitations', { method: 'GET' });
}

export async function resendInvitationRequest(invitationId: string) {
  return apiRequest(`/invitations/${invitationId}/resend`, { method: 'POST' });
}

export async function acceptInvitationRequest(payload: {
  token: string;
  firstName?: string;
  lastName?: string;
  password?: string;
}) {
  return apiRequest<AuthSession>('/invitations/accept', {
    method: 'POST',
    body: payload,
    skipAuthRefresh: true,
  });
}
