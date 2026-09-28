import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageShell } from '@/components/page-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
  approvePayrollPeriod,
  calculatePayrollPeriod,
  createPayrollPeriod,
  fetchPayrollDashboard,
  fetchPayrollPeriods,
  lockPayrollPeriod,
} from '@/features/payroll/api';

type Dashboard = {
  totalPayroll: number;
  totalDeductions: number;
  totalOvertimeCost: number;
  pendingPayroll: number;
  trend: Array<{ period: string; netTotal: number }>;
  departmentPayroll: Array<{ name: string; totalNet: number }>;
};

type Period = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
};

export function PayrollPage() {
  const queryClient = useQueryClient();
  const permissions = useAuthStore((s) => s.session?.permissions ?? []);
  const canManage = permissions.includes('payroll.manage');
  const canApprove = permissions.includes('payroll.approve');

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const dashboardQuery = useQuery({
    queryKey: ['payroll-dashboard'],
    queryFn: fetchPayrollDashboard,
  });
  const periodsQuery = useQuery({
    queryKey: ['payroll-periods'],
    queryFn: fetchPayrollPeriods,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['payroll-dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
  };

  const createMutation = useMutation({
    mutationFn: () => createPayrollPeriod({ name, startDate, endDate }),
    onSuccess: () => {
      setName('');
      refresh();
    },
  });

  const calculateMutation = useMutation({
    mutationFn: (id: string) => calculatePayrollPeriod(id),
    onSuccess: refresh,
  });
  const approveMutation = useMutation({
    mutationFn: (id: string) => approvePayrollPeriod(id),
    onSuccess: refresh,
  });
  const lockMutation = useMutation({
    mutationFn: (id: string) => lockPayrollPeriod(id),
    onSuccess: refresh,
  });

  const dashboard = dashboardQuery.data as Dashboard | undefined;
  const periods = periodsQuery.data as Period[] | undefined;

  if (dashboardQuery.isLoading) {
    return <LoadingState label="Loading payroll…" />;
  }

  return (
    <PageShell>
      <PageHeader
        title="Payroll"
        description="Modular calculation engine, approvals, and payslips."
      />

      {dashboard && (
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total payroll (approved+)</p>
            <p className="text-2xl font-semibold">{dashboard.totalPayroll.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total deductions</p>
            <p className="text-2xl font-semibold">{dashboard.totalDeductions.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Overtime cost</p>
            <p className="text-2xl font-semibold">{dashboard.totalOvertimeCost.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Pending payroll</p>
            <p className="text-2xl font-semibold">{dashboard.pendingPayroll.toLocaleString()}</p>
          </div>
        </section>
      )}

      {dashboard?.departmentPayroll && dashboard.departmentPayroll.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-medium">Department payroll (latest run)</h2>
          <div className="flex flex-wrap gap-2">
            {dashboard.departmentPayroll.map((d) => (
              <Badge key={d.name} variant="outline">
                {d.name}: {d.totalNet.toLocaleString()}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {canManage && (
        <section className="rounded-lg border p-6 space-y-3 max-w-lg">
          <h2 className="font-medium">New payroll period</h2>
          <Input placeholder="Name (e.g. September 2025)" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <Button
            disabled={!name || !startDate || !endDate || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Create period
          </Button>
          {createMutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>{getErrorMessage(createMutation.error)}</AlertDescription>
            </Alert>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Periods</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Range</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(periods ?? []).map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.name}</TableCell>
                <TableCell>
                  {String(p.startDate).slice(0, 10)} – {String(p.endDate).slice(0, 10)}
                </TableCell>
                <TableCell>{p.status}</TableCell>
                <TableCell className="space-x-2">
                  {canManage && (p.status === 'DRAFT' || p.status === 'REVIEW') && (
                    <Button size="sm" onClick={() => calculateMutation.mutate(p.id)}>
                      Calculate
                    </Button>
                  )}
                  {canApprove && p.status === 'REVIEW' && (
                    <Button size="sm" onClick={() => approveMutation.mutate(p.id)}>
                      Approve
                    </Button>
                  )}
                  {canApprove && (p.status === 'APPROVED' || p.status === 'PAID') && (
                    <Button size="sm" variant="outline" onClick={() => lockMutation.mutate(p.id)}>
                      Lock
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
