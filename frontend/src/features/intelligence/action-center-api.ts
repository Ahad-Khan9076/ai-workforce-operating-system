import { apiRequest } from '@/lib/api-client';

export function fetchActionCenter() {
  return apiRequest('/intelligence/action-center');
}

export function scanRecommendations() {
  return apiRequest('/intelligence/recommendations/scan', { method: 'POST' });
}

export function approveRecommendationAction(actionId: string) {
  return apiRequest(`/intelligence/recommendations/actions/${actionId}/approve`, {
    method: 'POST',
  });
}

export function dismissRecommendationAction(actionId: string) {
  return apiRequest(`/intelligence/recommendations/actions/${actionId}/dismiss`, {
    method: 'POST',
  });
}

export function fetchAutomations() {
  return apiRequest('/intelligence/automations');
}

export function setAutomationEnabled(id: string, enabled: boolean) {
  return apiRequest(`/intelligence/automations/${id}`, {
    method: 'PATCH',
    body: { enabled },
  });
}
