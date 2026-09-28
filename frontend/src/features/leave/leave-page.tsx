import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageShell } from '@/components/page-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  approveLeaveRequest,
  cancelLeaveRequest,
  createLeaveRequest,
  fetchLeaveBalances,
  fetchLeaveRequests,
  fetchLeaveTypes,
  rejectLeaveRequest,
} from '@/features/leave/api';

type LeaveBalance = {
  id: string;
  allocated: number;
  used: number;
  pending: number;
  leaveType: { name: string; code: string };
};

type LeaveRequest = {
  id: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  reason?: string | null;
  leaveType: { name: string };
  employee?: { firstName: string; lastName: string };
};

export function LeavePage() {
  const queryClient = useQueryClient();
  const permissions = useAuthStore((s) => s.session?.permissions ?? []);
  const canApprove = permissions.includes('leave.approve');

  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const typesQuery = useQuery({ queryKey: ['leave-types'], queryFn: fetchLeaveTypes });
  const balancesQuery = useQuery({ queryKey: ['leave-balances'], queryFn: () => fetchLeaveBalances() });
  const requestsQuery = useQuery({ queryKey: ['leave-requests'], queryFn: () => fetchLeaveRequests() });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['leave-types'] });
    void queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
    void queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createLeaveRequest({ leaveTypeId, startDate, endDate, reason: reason || undefined }),
    onSuccess: () => {
      setReason('');
      refresh();
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveLeaveRequest(id),
    onSuccess: refresh,
  });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectLeaveRequest(id),
    onSuccess: refresh,
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelLeaveRequest(id),
    onSuccess: refresh,
  });

  const types = typesQuery.data as Array<{ id: string; name: string }> | undefined;
  const balances = balancesQuery.data as LeaveBalance[] | undefined;
  const requests = requestsQuery.data as LeaveRequest[] | undefined;

  if (typesQuery.isLoading || balancesQuery.isLoading) {
    return <LoadingState label="Loading leave…" />;
  }

  return (
    <PageShell>
      <PageHeader
        title="Leave"
        description="Balances, requests, and approvals."
      />

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(balances ?? []).map((b) => (
          <div key={b.id} className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{b.leaveType.name}</p>
            <p className="text-xl font-semibold">
              {(b.allocated - b.used - b.pending).toFixed(1)} days left
            </p>
            <p className="text-xs text-muted-foreground">
              {b.used} used · {b.pending} pending
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border p-6 space-y-4 max-w-xl">
        <h2 className="font-medium">Request leave</h2>
        <select
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={leaveTypeId}
          onChange={(e) => setLeaveTypeId(e.target.value)}
        >
          <option value="">Select type</option>
          {(types ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <Input
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Button
          disabled={!leaveTypeId || !startDate || !endDate || createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          Submit request
        </Button>
        {createMutation.isError && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(createMutation.error)}</AlertDescription>
          </Alert>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Requests</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(requests ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  {r.employee
                    ? `${r.employee.firstName} ${r.employee.lastName}`
                    : 'You'}
                </TableCell>
                <TableCell>{r.leaveType.name}</TableCell>
                <TableCell>
                  {r.startDate.slice(0, 10)} – {r.endDate.slice(0, 10)}
                </TableCell>
                <TableCell>{r.totalDays}</TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell className="space-x-2">
                  {canApprove && r.status === 'PENDING' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(r.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectMutation.mutate(r.id)}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {r.status === 'PENDING' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => cancelMutation.mutate(r.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </PageShell>
  );
}
