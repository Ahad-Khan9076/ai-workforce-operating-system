import { apiRequest } from '@/lib/api-client';

export function fetchPayrollDashboard() {
  return apiRequest('/payroll/dashboard');
}

export function fetchPayrollPeriods() {
  return apiRequest('/payroll/periods');
}

export function fetchPayrollPeriod(periodId: string) {
  return apiRequest(`/payroll/periods/${periodId}`);
}

export function createPayrollPeriod(body: {
  name: string;
  startDate: string;
  endDate: string;
}) {
  return apiRequest('/payroll/periods', { method: 'POST', body });
}

export function calculatePayrollPeriod(periodId: string) {
  return apiRequest(`/payroll/periods/${periodId}/calculate`, { method: 'POST' });
}

export function approvePayrollPeriod(periodId: string) {
  return apiRequest(`/payroll/periods/${periodId}/approve`, { method: 'POST' });
}

export function lockPayrollPeriod(periodId: string) {
  return apiRequest(`/payroll/periods/${periodId}/lock`, { method: 'POST' });
}

export function fetchPayrollLoans() {
  return apiRequest('/payroll/loans');
}
