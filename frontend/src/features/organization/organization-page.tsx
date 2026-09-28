import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/page-shell';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchOrganizationStructure } from '@/features/departments/api';
import { getErrorMessage } from '@/lib/errors';
import { Link } from 'react-router-dom';

export function OrganizationPage() {
  const query = useQuery({
    queryKey: ['organization', 'structure'],
    queryFn: fetchOrganizationStructure,
  });

  if (query.isLoading) return <LoadingState label="Loading organization structure…" />;
  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{getErrorMessage(query.error)}</AlertDescription>
      </Alert>
    );
  }

  const data = query.data as {
    employeeCount: number;
    departments: Array<{ id: string; name: string; _count: { employees: number; teams: number } }>;
    jobTitles: Array<{ id: string; title: string }>;
    positions: Array<{ id: string; code?: string | null; isOpen: boolean; jobTitle: { title: string } }>;
  };

  return (
    <PageShell>
      <PageHeader
        title="Organization"
        description="Tenant hierarchy: departments, teams, titles, and positions."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Employees</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{data.employeeCount}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Departments</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{data.departments.length}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Job titles</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{data.jobTitles.length}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Department hierarchy</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.departments.map((department) => (
            <div key={department.id} className="rounded-md border px-3 py-2 text-sm">
              <Link className="font-medium hover:underline" to={`/departments/${department.id}`}>
                {department.name}
              </Link>
              <span className="text-muted-foreground">
                {' '}
                · {department._count.employees} employees · {department._count.teams} teams
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Positions</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.positions.map((position) => (
            <div key={position.id} className="rounded-md border px-3 py-2">
              {position.jobTitle.title} {position.code ? `(${position.code})` : ''} ·{' '}
              {position.isOpen ? 'Open' : 'Filled'}
            </div>
          ))}
        </CardContent>
      </Card>
    </PageShell>
  );
}
