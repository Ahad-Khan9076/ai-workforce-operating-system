import { apiRequest } from '@/lib/api-client';

export function fetchTodayAttendance() {
  return apiRequest('/attendance/me/today');
}

export function clockIn() {
  return apiRequest('/attendance/me/clock-in', { method: 'POST' });
}

export function clockOut() {
  return apiRequest('/attendance/me/clock-out', { method: 'POST' });
}

export function fetchAttendanceRecords(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return apiRequest(`/attendance/records${qs ? `?${qs}` : ''}`);
}

export function fetchAttendanceCalendar(params: Record<string, string | undefined>) {
  const search = new URLSearchParams(params as Record<string, string>);
  return apiRequest(`/attendance/calendar?${search.toString()}`);
}

export function fetchManagerOverview() {
  return apiRequest('/attendance/manager/overview');
}

export function fetchAttendanceReport(
  type: string,
  from: string,
  to: string,
) {
  return apiRequest(
    `/attendance/reports/${type}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
}
