import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { PageShell } from '@/components/page-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getErrorMessage } from '@/lib/errors';
import { useAuthStore } from '@/stores/auth-store';
import {
  clockIn,
  clockOut,
  fetchAttendanceCalendar,
  fetchAttendanceRecords,
  fetchManagerOverview,
  fetchTodayAttendance,
} from '@/features/attendance/api';

type AttendanceRecord = {
  id: string;
  workDate: string;
  status: string;
  clockInAt?: string | null;
  clockOutAt?: string | null;
  workedMinutes: number;
  lateMinutes: number;
  overtimeMinutes: number;
  employee?: { firstName: string; lastName: string; employeeNumber: string };
};

function formatMinutes(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}h ${min}m`;
}

export function AttendancePage() {
  const queryClient = useQueryClient();
  const permissions = useAuthStore((s) => s.session?.permissions ?? []);
  const canManage = permissions.includes('attendance.manage');
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const anchor = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const todayQuery = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: fetchTodayAttendance,
  });

  const historyQuery = useQuery({
    queryKey: ['attendance', 'records'],
    queryFn: () => fetchAttendanceRecords({ pageSize: 14 }),
  });

  const calendarQuery = useQuery({
    queryKey: ['attendance', 'calendar', view, anchor],
    queryFn: () => fetchAttendanceCalendar({ view, anchor }),
  });

  const overviewQuery = useQuery({
    queryKey: ['attendance', 'manager-overview'],
    queryFn: fetchManagerOverview,
    enabled: canManage || permissions.includes('leave.approve'),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['attendance'] });
  };

  const clockInMutation = useMutation({
    mutationFn: clockIn,
    onSuccess: refresh,
  });
  const clockOutMutation = useMutation({
    mutationFn: clockOut,
    onSuccess: refresh,
  });

  const today = todayQuery.data as AttendanceRecord | undefined;
  const history = historyQuery.data as { items: AttendanceRecord[] } | undefined;
  const calendar = calendarQuery.data as { items: AttendanceRecord[] } | undefined;
  const overview = overviewQuery.data as
    | {
        workDate: string;
        lateEmployees: AttendanceRecord[];
        absentEmployees: AttendanceRecord[];
        pendingCorrections: number;
        pendingLeave: number;
      }
    | undefined;

  const clockedIn = Boolean(today?.clockInAt && !today?.clockOutAt);
  const actionError =
    clockInMutation.error || clockOutMutation.error
      ? getErrorMessage(clockInMutation.error ?? clockOutMutation.error)
      : null;

  if (todayQuery.isLoading) {
    return <LoadingState label="Loading attendance…" />;
  }

  return (
    <PageShell>
      <PageHeader
        title="Attendance"
        description="Clock in/out, team visibility, and calendar views."
      />

      {todayQuery.isError && (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(todayQuery.error)}</AlertDescription>
        </Alert>
      )}

      <section className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="text-2xl font-semibold">
              {today?.status ?? '—'}{' '}
              {today?.workDate ? `· ${today.workDate}` : null}
            </p>
            {today?.clockInAt && (
              <p className="text-sm text-muted-foreground">
                In {new Date(today.clockInAt).toLocaleTimeString()}
                {today.clockOutAt
                  ? ` · Out ${new Date(today.clockOutAt).toLocaleTimeString()}`
                  : ''}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              disabled={clockedIn || clockInMutation.isPending}
              onClick={() => clockInMutation.mutate()}
            >
              Clock in
            </Button>
            <Button
              variant="secondary"
              disabled={!clockedIn || clockOutMutation.isPending}
              onClick={() => clockOutMutation.mutate()}
            >
              Clock out
            </Button>
          </div>
        </div>
        {today && (
          <div className="flex flex-wrap gap-3 text-sm">
            <Badge variant="outline">Worked {formatMinutes(today.workedMinutes)}</Badge>
            {today.lateMinutes > 0 && (
              <Badge variant="outline" className="border-destructive text-destructive">
                Late {formatMinutes(today.lateMinutes)}
              </Badge>
            )}
            {today.overtimeMinutes > 0 && (
              <Badge variant="secondary">
                OT {formatMinutes(today.overtimeMinutes)}
              </Badge>
            )}
          </div>
        )}
        {actionError && (
          <Alert variant="destructive">
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}
      </section>

      {(canManage || permissions.includes('leave.approve')) && overview && (
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Late today</p>
            <p className="text-2xl font-semibold">{overview.lateEmployees.length}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Absent today</p>
            <p className="text-2xl font-semibold">{overview.absentEmployees.length}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Pending corrections</p>
            <p className="text-2xl font-semibold">{overview.pendingCorrections}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Pending leave</p>
            <p className="text-2xl font-semibold">{overview.pendingLeave}</p>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Calendar</span>
          {(['month', 'week', 'day'] as const).map((v) => (
            <Button
              key={v}
              size="sm"
              variant={view === v ? 'default' : 'outline'}
              onClick={() => setView(v)}
            >
              {v}
            </Button>
          ))}
        </div>
        {calendarQuery.isLoading ? (
          <LoadingState label="Loading calendar…" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Worked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(calendar?.items ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.workDate}</TableCell>
                  <TableCell>
                    {row.employee
                      ? `${row.employee.firstName} ${row.employee.lastName}`
                      : '—'}
                  </TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>{formatMinutes(row.workedMinutes)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Recent history</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Late</TableHead>
              <TableHead>Overtime</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(history?.items ?? []).map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.workDate}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>{formatMinutes(row.lateMinutes)}</TableCell>
                <TableCell>{formatMinutes(row.overtimeMinutes)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </PageShell>
  );
}
