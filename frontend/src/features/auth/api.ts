import { apiRequest } from '@/lib/api-client';
import type { AuthSession } from '@/types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export async function loginRequest(payload: LoginPayload) {
  return apiRequest<AuthSession>('/auth/login', {
    method: 'POST',
    body: payload,
    skipAuthRefresh: true,
  });
}

export async function registerRequest(payload: RegisterPayload) {
  return apiRequest<AuthSession>('/auth/register', {
    method: 'POST',
    body: payload,
    skipAuthRefresh: true,
  });
}

export async function logoutRequest() {
  return apiRequest('/auth/logout', { method: 'POST' });
}

export async function forgotPasswordRequest(email: string) {
  return apiRequest<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
    skipAuthRefresh: true,
  });
}

export async function resetPasswordRequest(token: string, password: string) {
  return apiRequest<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: { token, password },
    skipAuthRefresh: true,
  });
}

export async function verifyEmailRequest(token: string) {
  return apiRequest<{ message: string }>('/auth/verify-email', {
    method: 'POST',
    body: { token },
    skipAuthRefresh: true,
  });
}

export async function selectOrganizationRequest(organizationId: string) {
  return apiRequest<AuthSession>('/auth/select-organization', {
    method: 'POST',
    body: { organizationId },
  });
}

export async function fetchCurrentUser() {
  return apiRequest('/auth/me', { method: 'GET' });
}
