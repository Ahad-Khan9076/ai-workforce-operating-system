import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingState } from '@/components/loading-state';
import { createInvitationRequest, fetchAssignableRolesRequest } from '@/features/members/api';
import { getErrorMessage } from '@/lib/errors';

const schema = z.object({
  email: z.string().email(),
  roleId: z.string().min(1),
});

export function InviteOnboardingPage() {
  const rolesQuery = useQuery({
    queryKey: ['roles', 'assignable'],
    queryFn: fetchAssignableRolesRequest,
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', roleId: '' },
  });

  const mutation = useMutation({
    mutationFn: createInvitationRequest,
    onSuccess: () => form.reset({ email: '', roleId: form.getValues('roleId') }),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <PageHeader
        title="Invite your team"
        description="Optional first step after creating your organization."
        actions={
          <Button variant="outline" asChild>
            <Link to="/">Skip to dashboard</Link>
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Send invitation</CardTitle>
        </CardHeader>
        <CardContent>
          {rolesQuery.isLoading ? <LoadingState label="Loading roles…" /> : null}
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register('email')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleId">Role</Label>
              <select
                id="roleId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register('roleId')}
              >
                <option value="">Select role</option>
                {(rolesQuery.data ?? []).map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
              </select>
            </div>
            {mutation.isError ? (
              <Alert variant="destructive">
                <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
              </Alert>
            ) : null}
            {mutation.isSuccess ? (
              <Alert>
                <AlertDescription>Invitation sent successfully.</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={mutation.isPending}>
              Send invitation
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
