import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/page-shell';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchRolesRequest } from '@/features/members/api';
import { getErrorMessage } from '@/lib/errors';

export function RolesSettingsPage() {
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: fetchRolesRequest });

  return (
    <PageShell>
      <PageHeader
        title="Roles & permissions"
        description="System roles and granular permissions enforced on every tenant API request."
      />
      {rolesQuery.isLoading ? <LoadingState label="Loading roles…" /> : null}
      {rolesQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(rolesQuery.error)}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4">
        {(rolesQuery.data ?? []).map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {role.name}
                <Badge variant="secondary">{role.code}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {role.permissions.map((permission) => (
                <Badge key={permission} variant="outline">
                  {permission}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
