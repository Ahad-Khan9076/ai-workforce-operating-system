import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchDepartment } from '@/features/departments/api';
import { getErrorMessage } from '@/lib/errors';
import { Link } from 'react-router-dom';

export function DepartmentDetailPage() {
  const { departmentId = '' } = useParams();
  const query = useQuery({
    queryKey: ['department', departmentId],
    queryFn: () => fetchDepartment(departmentId),
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{getErrorMessage(query.error)}</AlertDescription>
      </Alert>
    );
  }

  const department = query.data as {
    name: string;
    description?: string | null;
    manager?: { firstName: string; lastName: string } | null;
    teams: Array<{ id: string; name: string; _count: { employees: number } }>;
    employees: Array<{ id: string; firstName: string; lastName: string; jobTitle?: { title: string } | null }>;
    _count: { employees: number };
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={department.name}
        description={department.description ?? 'Department overview'}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Teams</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {department.teams.map((team) => (
              <div key={team.id} className="rounded-md border px-3 py-2">
                {team.name} · {team._count.employees} employees
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>People ({department._count.employees})</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {department.employees.map((employee) => (
              <div key={employee.id} className="rounded-md border px-3 py-2">
                <Link className="font-medium hover:underline" to={`/employees/${employee.id}`}>
                  {employee.firstName} {employee.lastName}
                </Link>
                <div className="text-xs text-muted-foreground">{employee.jobTitle?.title ?? '—'}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
