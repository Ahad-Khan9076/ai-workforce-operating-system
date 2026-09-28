import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { PageShell } from '@/components/page-shell';
import { FilterBar } from '@/components/filter-bar';
import { ResponsiveTable } from '@/components/responsive-table';
import { NativeSelect } from '@/components/native-select';
import { Button } from '@/components/ui/button';
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
    <PageShell>
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

      <FilterBar
        searchValue={search}
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search name, email, employee ID…"
      >
        <NativeSelect
          className="sm:w-40"
          aria-label="Filter by department"
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
        </NativeSelect>
        <NativeSelect
          className="sm:w-36"
          aria-label="Filter by status"
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
        </NativeSelect>
        <NativeSelect
          className="sm:w-40"
          aria-label="Filter by job title"
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
        </NativeSelect>
        <NativeSelect
          className="sm:w-40"
          aria-label="Filter by manager"
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
        </NativeSelect>
      </FilterBar>

      {employeesQuery.isLoading ? <LoadingState label="Loading employees…" /> : null}
      {employeesQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(employeesQuery.error)}</AlertDescription>
        </Alert>
      ) : null}

      {data && data.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No employees found"
          description="Adjust filters or add your first employee to get started."
          actionLabel="Add employee"
          onAction={() => {
            window.location.assign('/employees/new');
          }}
        />
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <ResponsiveTable>
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
          </ResponsiveTable>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
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
    </PageShell>
  );
}
