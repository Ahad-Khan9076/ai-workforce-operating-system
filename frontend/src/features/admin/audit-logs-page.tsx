import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/page-shell';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveTable } from '@/components/responsive-table';
import { getErrorMessage } from '@/lib/errors';
import { fetchAuditLogs } from '@/features/admin/audit-api';

export function AuditLogsPage() {
  const query = useQuery({ queryKey: ['audit-logs'], queryFn: () => fetchAuditLogs(100) });

  if (query.isLoading) {
    return <LoadingState label="Loading audit logs…" />;
  }

  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{getErrorMessage(query.error)}</AlertDescription>
      </Alert>
    );
  }

  const rows = query.data ?? [];

  return (
    <PageShell>
      <PageHeader
        title="Audit logs"
        description="Tenant-scoped security and compliance events."
      />
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events yet.</p>
          ) : (
            <ResponsiveTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(row.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.action}</TableCell>
                    <TableCell className="text-sm">
                      {row.resourceType}
                      {row.resourceId ? ` · ${row.resourceId.slice(0, 8)}…` : ''}
                    </TableCell>
                    <TableCell className="text-sm">{row.actorUserId?.slice(0, 8) ?? '—'}</TableCell>
                    <TableCell className="text-sm">{row.ipAddress ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
