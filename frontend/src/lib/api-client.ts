import { ApiError } from '@/lib/errors';
import { getAccessToken, useAuthStore } from '@/stores/auth-store';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '/api/v1';

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  token?: string | null;
  skipAuthRefresh?: boolean;
}

async function refreshAccessToken(): Promise<string | null> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    useAuthStore.getState().clearSession();
    return null;
  }

  const data = (await response.json()) as {
    accessToken: string;
    user: AuthSessionUser;
    organizationId?: string;
    roleCode?: string;
    permissions: string[];
    organizations?: OrganizationSummary[];
    requiresOrganizationSelection?: boolean;
    requiresOrganizationSetup?: boolean;
  };

  useAuthStore.getState().setSession({
    accessToken: data.accessToken,
    user: data.user,
    organizationId: data.organizationId,
    roleCode: data.roleCode,
    permissions: data.permissions,
    organizations: data.organizations,
    requiresOrganizationSelection: data.requiresOrganizationSelection,
    requiresOrganizationSetup: data.requiresOrganizationSetup,
  });

  return data.accessToken;
}

interface AuthSessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
}

interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  roleCode: string;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, token, headers, skipAuthRefresh, ...rest } = options;
  const accessToken = token ?? getAccessToken();

  const execute = (bearer: string | null) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let response = await execute(accessToken);

  if (response.status === 401 && !skipAuthRefresh && accessToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await execute(refreshed);
    }
  }

  const contentType = response.headers.get('content-type');
  const payload =
    contentType?.includes('application/json')
      ? await response.json()
      : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message: string | string[] }).message)
        : response.statusText;

    throw new ApiError(message, response.status);
  }

  return payload as T;
}
