import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { PageShell } from '@/components/page-shell';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createDepartment, fetchDepartments } from '@/features/departments/api';
import { getErrorMessage } from '@/lib/errors';

export function DepartmentsListPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  });

  const createMutation = useMutation({
    mutationFn: () => createDepartment({ name, code: code || undefined }),
    onSuccess: () => {
      setName('');
      setCode('');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="Departments"
        description="Organize your workforce into departments and reporting lines."
      />

      <Card>
        <CardHeader><CardTitle>Create department</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button disabled={!name || createMutation.isPending} onClick={() => createMutation.mutate()}>
              Create
            </Button>
          </div>
          {createMutation.isError ? (
            <Alert variant="destructive" className="md:col-span-3">
              <AlertDescription>{getErrorMessage(createMutation.error)}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {departmentsQuery.isLoading ? <LoadingState /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(
          (departmentsQuery.data as Array<{
            id: string;
            name: string;
            code?: string | null;
            _count: { employees: number; teams: number };
          }>) ?? []
        ).map((department) => (
          <Card key={department.id}>
            <CardHeader>
              <CardTitle className="text-base">
                <Link className="hover:underline" to={`/departments/${department.id}`}>
                  {department.name}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {department.code ? `Code: ${department.code} · ` : ''}
              {department._count.employees} employees · {department._count.teams} teams
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
