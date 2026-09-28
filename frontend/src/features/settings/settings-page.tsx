import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchCurrentOrganization, updateOrganizationRequest } from '@/features/organization/api';
import { getErrorMessage } from '@/lib/errors';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const orgQuery = useQuery({
    queryKey: ['organization', 'current'],
    queryFn: fetchCurrentOrganization,
  });

  const mutation = useMutation({
    mutationFn: updateOrganizationRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organization', 'current'] }),
  });

  if (orgQuery.isLoading) {
    return <LoadingState label="Loading organization settings…" />;
  }

  if (orgQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{getErrorMessage(orgQuery.error)}</AlertDescription>
      </Alert>
    );
  }

  const org = orgQuery.data as Record<string, string | null>;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your organization profile and tenant preferences."
      />
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              mutation.mutate(Object.fromEntries(formData.entries()) as never);
            }}
          >
            {[
              ['name', 'Name'],
              ['legalName', 'Legal name'],
              ['website', 'Website'],
              ['industry', 'Industry'],
              ['companySize', 'Company size'],
              ['country', 'Country'],
              ['timezone', 'Timezone'],
              ['currency', 'Currency'],
              ['primaryContact', 'Primary contact'],
            ].map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  name={key}
                  defaultValue={org[key] ?? ''}
                />
              </div>
            ))}
            {mutation.isError ? (
              <div className="md:col-span-2">
                <Alert variant="destructive">
                  <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
                </Alert>
              </div>
            ) : null}
            <div className="md:col-span-2">
              <Button type="submit" disabled={mutation.isPending}>
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
