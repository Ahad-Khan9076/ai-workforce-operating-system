import { apiRequest } from '@/lib/api-client';

export function fetchDepartments() {
  return apiRequest('/departments');
}

export function fetchDepartment(departmentId: string) {
  return apiRequest(`/departments/${departmentId}`);
}

export function createDepartment(payload: {
  name: string;
  code?: string;
  description?: string;
  managerEmployeeId?: string;
}) {
  return apiRequest('/departments', { method: 'POST', body: payload });
}

export function fetchTeams(departmentId?: string) {
  const qs = departmentId ? `?departmentId=${departmentId}` : '';
  return apiRequest(`/teams${qs}`);
}

export function fetchJobTitles() {
  return apiRequest('/job-titles');
}

export function createJobTitle(payload: { title: string; level?: string; description?: string }) {
  return apiRequest('/job-titles', { method: 'POST', body: payload });
}

export function fetchOrganizationStructure() {
  return apiRequest('/organization/structure');
}

export function fetchSkillsCatalog() {
  return apiRequest('/skills/catalog');
}

export function createSkill(payload: { name: string; description?: string; categoryId?: string }) {
  return apiRequest('/skills/catalog', { method: 'POST', body: payload });
}
