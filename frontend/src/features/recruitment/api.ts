import { apiRequest } from '@/lib/api-client';

export function fetchRecruitmentDashboard() {
  return apiRequest('/recruitment/dashboard');
}

export function fetchRecruitmentJobs(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest(`/recruitment/jobs${qs}`);
}

export function createRecruitmentJob(body: Record<string, unknown>) {
  return apiRequest('/recruitment/jobs', { method: 'POST', body });
}

export function fetchKanban(jobId?: string) {
  const qs = jobId ? `?jobId=${encodeURIComponent(jobId)}` : '';
  return apiRequest(`/recruitment/kanban${qs}`);
}

export function moveApplicationStage(applicationId: string, stage: string, stageOrder?: number) {
  return apiRequest(`/recruitment/applications/${applicationId}/stage`, {
    method: 'PATCH',
    body: { stage, stageOrder },
  });
}

export function createCandidate(body: Record<string, unknown>) {
  return apiRequest('/recruitment/candidates', { method: 'POST', body });
}

export function applyToJob(jobId: string, candidateId: string) {
  return apiRequest('/recruitment/applications', {
    method: 'POST',
    body: { jobId, candidateId },
  });
}

export function uploadCandidateCv(candidateId: string, body: Record<string, unknown>) {
  return apiRequest(`/recruitment/candidates/${candidateId}/cv`, {
    method: 'POST',
    body,
  });
}

export function screenApplication(applicationId: string) {
  return apiRequest(`/recruitment/applications/${applicationId}/screen`, { method: 'POST' });
}

export function hireApplication(applicationId: string, body?: Record<string, unknown>) {
  return apiRequest(`/recruitment/applications/${applicationId}/hire`, {
    method: 'POST',
    body: body ?? {},
  });
}

export function updateJobStatus(jobId: string, status: string) {
  return apiRequest(`/recruitment/jobs/${jobId}/status`, {
    method: 'PATCH',
    body: { status },
  });
}
