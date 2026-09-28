import { apiRequest } from '@/lib/api-client';

export interface AuditLogRow {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  actorUserId: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export function fetchAuditLogs(limit = 50) {
  return apiRequest<AuditLogRow[]>(`/audit-logs?limit=${limit}`);
}
