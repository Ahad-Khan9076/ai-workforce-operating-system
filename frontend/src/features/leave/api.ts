import { apiRequest } from '@/lib/api-client';

export function fetchLeaveTypes() {
  return apiRequest('/leave/types');
}

export function fetchLeaveBalances(employeeId?: string) {
  const qs = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : '';
  return apiRequest(`/leave/balances${qs}`);
}

export function fetchLeaveRequests(params?: { status?: string }) {
  const qs = params?.status ? `?status=${encodeURIComponent(params.status)}` : '';
  return apiRequest(`/leave/requests${qs}`);
}

export function createLeaveRequest(body: {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}) {
  return apiRequest('/leave/requests', { method: 'POST', body });
}

export function approveLeaveRequest(requestId: string, note?: string) {
  return apiRequest(`/leave/requests/${requestId}/approve`, {
    method: 'POST',
    body: { note },
  });
}

export function rejectLeaveRequest(requestId: string, note?: string) {
  return apiRequest(`/leave/requests/${requestId}/reject`, {
    method: 'POST',
    body: { note },
  });
}

export function cancelLeaveRequest(requestId: string) {
  return apiRequest(`/leave/requests/${requestId}/cancel`, { method: 'POST' });
}
