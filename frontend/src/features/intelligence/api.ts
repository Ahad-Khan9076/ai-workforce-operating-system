import { apiRequest } from '@/lib/api-client';

export function fetchIntelligenceDashboard(variant?: string) {
  const q = variant ? `?variant=${encodeURIComponent(variant)}` : '';
  return apiRequest(`/intelligence/dashboard${q}`);
}

export function fetchWorkforceInsights() {
  return apiRequest('/intelligence/insights');
}

export function refreshWorkforceInsights() {
  return apiRequest('/intelligence/insights/refresh', { method: 'POST' });
}

export function fetchWorkforceRisks() {
  return apiRequest('/intelligence/risks');
}

export function scanWorkforceRisks() {
  return apiRequest('/intelligence/risks/scan', { method: 'POST' });
}

export function fetchRiskRules() {
  return apiRequest('/intelligence/risks/rules');
}

export function fetchSkillProfiles() {
  return apiRequest('/intelligence/skills/profiles');
}

export function fetchProfileRequirements(profileName: string) {
  return apiRequest(
    `/intelligence/skills/profiles/${encodeURIComponent(profileName)}/requirements`,
  );
}

export function upsertRoleRequirement(payload: {
  profileName: string;
  skillId: string;
  requiredProficiency: string;
  jobTitleId?: string;
}) {
  return apiRequest('/intelligence/skills/requirements', {
    method: 'POST',
    body: payload,
  });
}

export function talentSearch(profileName: string) {
  return apiRequest('/intelligence/talent/search', {
    method: 'POST',
    body: { profileName },
  });
}
