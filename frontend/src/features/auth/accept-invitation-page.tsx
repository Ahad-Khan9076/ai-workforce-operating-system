import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { acceptInvitationRequest } from '@/features/members/api';
import { useAuthStore } from '@/stores/auth-store';
import { getErrorMessage } from '@/lib/errors';

const schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  password: z.string().min(8),
});

export function AcceptInvitationPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const setSession = useAuthStore((state) => state.setSession);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      acceptInvitationRequest({ token, ...values }),
    onSuccess: (session) => setSession(session),
  });

  if (!token) {
    return (
      <Alert variant="destructive" className="mx-auto mt-20 max-w-md">
        <AlertDescription>Invitation token is missing.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Accept invitation</CardTitle>
          <CardDescription>
            Create your account or link an existing one to join the organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" {...form.register('firstName')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" {...form.register('lastName')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...form.register('password')} />
            </div>
            {mutation.isError ? (
              <div className="sm:col-span-2">
                <Alert variant="destructive">
                  <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
                </Alert>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <Button className="w-full" type="submit" disabled={mutation.isPending}>
                Join organization
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
