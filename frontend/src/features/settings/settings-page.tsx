import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageShell } from '@/components/page-shell';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchCurrentOrganization, updateOrganizationRequest } from '@/features/organization/api';
import { getErrorMessage } from '@/lib/errors';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchOrganizationSettings, patchOrganizationSettings } from '@/features/settings/settings-api';

const settingsLinks = [
  { href: '/settings/members', label: 'Members & invitations' },
  { href: '/settings/roles', label: 'Roles & permissions' },
  { href: '/admin/billing', label: 'Billing & usage' },
  { href: '/admin/audit-logs', label: 'Audit logs' },
];

export function SettingsPage() {
  const queryClient = useQueryClient();
  const orgQuery = useQuery({
    queryKey: ['organization', 'current'],
    queryFn: fetchCurrentOrganization,
  });

  const orgSettingsQuery = useQuery({
    queryKey: ['settings', 'organization'],
    queryFn: fetchOrganizationSettings,
  });

  const mutation = useMutation({
    mutationFn: updateOrganizationRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organization', 'current'] }),
  });

  const prefsMutation = useMutation({
    mutationFn: patchOrganizationSettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'organization'] }),
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
    <PageShell>
      <PageHeader
        title="Settings"
        description="Organization profile, security, billing, AI, and integrations."
      />
      <div className="flex flex-wrap gap-2">
        {settingsLinks.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            {item.label}
          </Link>
        ))}
      </div>
      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="preferences">Notifications & AI</TabsTrigger>
        </TabsList>
        <TabsContent value="organization">
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
        </TabsContent>
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Tenant preferences</CardTitle>
            </CardHeader>
            <CardContent>
              {orgSettingsQuery.isLoading ? (
                <LoadingState label="Loading preferences…" />
              ) : (
                <form
                  className="space-y-4 max-w-xl"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    prefsMutation.mutate({
                      ai: { copilotEnabled: formData.get('copilotEnabled') === 'on' },
                      notifications: {
                        emailDigest: formData.get('emailDigest') === 'on',
                      },
                    });
                  }}
                >
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="copilotEnabled"
                      defaultChecked={
                        (orgSettingsQuery.data?.ai as { copilotEnabled?: boolean } | undefined)
                          ?.copilotEnabled !== false
                      }
                    />
                    Enable AI copilot for this organization
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="emailDigest"
                      defaultChecked={
                        (
                          orgSettingsQuery.data?.notifications as
                            | { emailDigest?: boolean }
                            | undefined
                        )?.emailDigest === true
                      }
                    />
                    Weekly email digest for admins
                  </label>
                  {prefsMutation.isError ? (
                    <Alert variant="destructive">
                      <AlertDescription>{getErrorMessage(prefsMutation.error)}</AlertDescription>
                    </Alert>
                  ) : null}
                  <Button type="submit" disabled={prefsMutation.isPending}>
                    Save preferences
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
