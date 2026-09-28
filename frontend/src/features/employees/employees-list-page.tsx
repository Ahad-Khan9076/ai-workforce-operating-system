import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/loading-state';
import { EmptyState } from '@/components/empty-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchEmployees } from '@/features/employees/api';
import { fetchDepartments, fetchJobTitles } from '@/features/departments/api';
import { getErrorMessage } from '@/lib/errors';

const STATUSES = ['ACTIVE', 'ON_LEAVE', 'PROBATION', 'SUSPENDED', 'TERMINATED', 'RESIGNED'];

export function EmployeesListPage() {
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('');
  const [jobTitleId, setJobTitleId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [page, setPage] = useState(1);

  const managersQuery = useQuery({
    queryKey: ['employees', 'manager-filter'],
    queryFn: () => fetchEmployees({ pageSize: 100 }),
  });

  const queryKey = useMemo(
    () => ['employees', { search, departmentId, status, jobTitleId, managerId, page }],
    [search, departmentId, status, jobTitleId, managerId, page],
  );

  const employeesQuery = useQuery({
    queryKey,
    queryFn: () =>
      fetchEmployees({
        search: search || undefined,
        departmentId: departmentId || undefined,
        status: status || undefined,
        jobTitleId: jobTitleId || undefined,
        managerId: managerId || undefined,
        page,
        pageSize: 20,
        sortBy: 'lastName',
        sortOrder: 'asc',
      }),
  });

  const departmentsQuery = useQuery({ queryKey: ['departments'], queryFn: fetchDepartments });
  const jobTitlesQuery = useQuery({ queryKey: ['job-titles'], queryFn: fetchJobTitles });

  const data = employeesQuery.data as
    | {
        items: Array<{
          id: string;
          employeeNumber: string;
          firstName: string;
          lastName: string;
          email: string;
          employmentStatus: string;
          department?: { name: string } | null;
          jobTitle?: { title: string } | null;
          manager?: { firstName: string; lastName: string } | null;
        }>;
        total: number;
        totalPages: number;
      }
    | undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Employees"
        description="Search, filter, and manage your workforce directory."
        actions={
          <Button asChild>
            <Link to="/employees/new">
              <Plus className="mr-2 h-4 w-4" />
              Add employee
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-6">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, email, employee ID…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={departmentId}
          onChange={(e) => {
            setPage(1);
            setDepartmentId(e.target.value);
          }}
        >
          <option value="">All departments</option>
          {((departmentsQuery.data as Array<{ id: string; name: string }>) ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={jobTitleId}
          onChange={(e) => {
            setPage(1);
            setJobTitleId(e.target.value);
          }}
        >
          <option value="">All job titles</option>
          {((jobTitlesQuery.data as Array<{ id: string; title: string }>) ?? []).map((jt) => (
            <option key={jt.id} value={jt.id}>
              {jt.title}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={managerId}
          onChange={(e) => {
            setPage(1);
            setManagerId(e.target.value);
          }}
        >
          <option value="">All managers</option>
          {(
            (managersQuery.data as { items: Array<{ id: string; firstName: string; lastName: string }> })
              ?.items ?? []
          ).map((m) => (
            <option key={m.id} value={m.id}>
              {m.firstName} {m.lastName}
            </option>
          ))}
        </select>
      </div>

      {employeesQuery.isLoading ? <LoadingState label="Loading employees…" /> : null}
      {employeesQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(employeesQuery.error)}</AlertDescription>
        </Alert>
      ) : null}

      {data && data.items.length === 0 ? (
        <EmptyState
          title="No employees found"
          description="Adjust filters or add your first employee to get started."
          actionLabel="Add employee"
          onAction={() => {
            window.location.href = '/employees/new';
          }}
        />
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Job title</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <Link className="font-medium hover:underline" to={`/employees/${employee.id}`}>
                      {employee.firstName} {employee.lastName}
                    </Link>
                    <div className="text-xs text-muted-foreground">{employee.email}</div>
                  </TableCell>
                  <TableCell>{employee.employeeNumber}</TableCell>
                  <TableCell>{employee.department?.name ?? '—'}</TableCell>
                  <TableCell>{employee.jobTitle?.title ?? '—'}</TableCell>
                  <TableCell>
                    {employee.manager
                      ? `${employee.manager.firstName} ${employee.manager.lastName}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{employee.employmentStatus}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {data.totalPages} · {data.total} employees
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
