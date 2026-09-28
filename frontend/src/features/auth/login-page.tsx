import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AuthLayout } from '@/components/auth-layout';
import { FormFieldError } from '@/components/form-field-error';
import { loginRequest } from '@/features/auth/api';
import { useAuthStore } from '@/stores/auth-store';
import { getErrorMessage } from '@/lib/errors';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
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
    <AuthLayout
      title="Sign in"
      description="Secure access to your workforce workspace"
      footer={
        <>
          <p>
            <Link className="text-primary hover:underline" to="/forgot-password">
              Forgot password?
            </Link>
          </p>
          <p className="mt-2">
            New here?{' '}
            <Link className="text-primary hover:underline" to="/register">
              Create account
            </Link>
          </p>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(form.formState.errors.email)}
            {...form.register('email')}
          />
          <FormFieldError message={form.formState.errors.email?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(form.formState.errors.password)}
            {...form.register('password')}
          />
          <FormFieldError message={form.formState.errors.password?.message} />
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
    </AuthLayout>
  );
}
