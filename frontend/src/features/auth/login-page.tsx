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
import { loginRequest } from '@/features/auth/api';
import { useAuthStore } from '@/stores/auth-store';
import { getErrorMessage } from '@/lib/errors';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const setSession = useAuthStore((state) => state.setSession);
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (session) => setSession(session),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Secure access to your workforce workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" {...form.register('password')} />
            </div>

            {mutation.isError ? (
              <Alert variant="destructive">
                <AlertTitle>Sign in failed</AlertTitle>
                <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
              </Alert>
            ) : null}

            <Button className="w-full" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
            <p>
              <Link className="text-primary hover:underline" to="/forgot-password">
                Forgot password?
              </Link>
            </p>
            <p>
              New here?{' '}
              <Link className="text-primary hover:underline" to="/register">
                Create account
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
