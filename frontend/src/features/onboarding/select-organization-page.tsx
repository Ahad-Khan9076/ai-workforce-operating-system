import { useMutation } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { selectOrganizationRequest } from '@/features/auth/api';
import { useAuthStore } from '@/stores/auth-store';
import { LoadingState } from '@/components/loading-state';
import { getErrorMessage } from '@/lib/errors';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function SelectOrganizationPage() {
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);

  const mutation = useMutation({
    mutationFn: selectOrganizationRequest,
    onSuccess: (data) => setSession(data),
  });

  const organizations = session?.organizations ?? [];

  if (!session) {
    return <LoadingState />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <PageHeader
        title="Choose organization"
        description="Select which tenant workspace you want to access."
      />
      {mutation.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4">
        {organizations.map((org) => (
          <Card key={org.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{org.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{org.roleCode}</p>
                </div>
              </div>
              <Button
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(org.id)}
              >
                Enter
              </Button>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">{org.slug}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
