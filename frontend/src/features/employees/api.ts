import { apiRequest } from '@/lib/api-client';

export interface EmployeeListQuery {
  search?: string;
  departmentId?: string;
  status?: string;
  jobTitleId?: string;
  managerId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EmployeePayload {
  employeeNumber?: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  email: string;
  phone?: string;
  profilePhotoUrl?: string;
  dateOfBirth?: string;
  jobTitleId?: string;
  departmentId?: string;
  teamId?: string;
  managerId?: string;
  employmentType?: string;
  employmentStatus?: string;
  joinDate?: string;
  probationEndDate?: string;
  workLocation?: string;
  bio?: string;
}

export function fetchEmployees(query: EmployeeListQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return apiRequest(`/employees${qs ? `?${qs}` : ''}`);
}

export function fetchEmployee(employeeId: string) {
  return apiRequest(`/employees/${employeeId}`);
}

export function createEmployee(payload: EmployeePayload) {
  return apiRequest('/employees', { method: 'POST', body: payload });
}

export function updateEmployee(employeeId: string, payload: Partial<EmployeePayload>) {
  return apiRequest(`/employees/${employeeId}`, { method: 'PATCH', body: payload });
}

export function deleteEmployee(employeeId: string) {
  return apiRequest(`/employees/${employeeId}`, { method: 'DELETE' });
}

export function fetchEmployeeTimeline(employeeId: string) {
  return apiRequest(`/employees/${employeeId}/timeline`);
}

export function fetchEmployeeDocuments(employeeId: string) {
  return apiRequest(`/employees/${employeeId}/documents`);
}

export function addEmployeeDocument(
  employeeId: string,
  payload: {
    name: string;
    type: string;
    fileUrl: string;
    expiresAt?: string;
    visibility?: string;
  },
) {
  return apiRequest(`/employees/${employeeId}/documents`, {
    method: 'POST',
    body: payload,
  });
}

export function fetchEmployeeSkills(employeeId: string) {
  return apiRequest(`/employees/${employeeId}/skills`);
}

export function assignEmployeeSkill(
  employeeId: string,
  payload: {
    skillId: string;
    proficiency: string;
    yearsExperience?: number;
    verified?: boolean;
  },
) {
  return apiRequest(`/employees/${employeeId}/skills`, {
    method: 'POST',
    body: payload,
  });
}

export function fetchWorkforceDashboard() {
  return apiRequest<{
    totalEmployees: number;
    activeEmployees: number;
    employeesOnLeave: number;
    newHires: number;
    departments: number;
  }>('/analytics/workforce-dashboard');
}
