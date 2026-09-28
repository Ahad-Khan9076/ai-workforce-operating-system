import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { registerRequest } from '@/features/auth/api';
import { useAuthStore } from '@/stores/auth-store';
import { getErrorMessage } from '@/lib/errors';

const registerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const setSession = useAuthStore((state) => state.setSession);
  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: (session) => setSession(session),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            Register first, then create your organization in onboarding.
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
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" {...form.register('email')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...form.register('password')} />
            </div>

            {mutation.isError ? (
              <div className="sm:col-span-2">
                <Alert variant="destructive">
                  <AlertTitle>Registration failed</AlertTitle>
                  <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
                </Alert>
              </div>
            ) : null}

            <div className="sm:col-span-2">
              <Button className="w-full" type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Creating…' : 'Create account'}
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link className="text-primary hover:underline" to="/login">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
