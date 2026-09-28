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
import { registerRequest } from '@/features/auth/api';
import { useAuthStore } from '@/stores/auth-store';
import { getErrorMessage } from '@/lib/errors';

const registerSchema = z.object({
  firstName: z.string().min(2, 'At least 2 characters'),
  lastName: z.string().min(2, 'At least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Include upper, lower, and a number'),
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
    <AuthLayout
      wide
      title="Create your account"
      description="Register first, then create your organization in onboarding."
      footer={
        <p>
          Already have an account?{' '}
          <Link className="text-primary hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      }
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" autoComplete="given-name" {...form.register('firstName')} />
          <FormFieldError message={form.formState.errors.firstName?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" autoComplete="family-name" {...form.register('lastName')} />
          <FormFieldError message={form.formState.errors.lastName?.message} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
          <FormFieldError message={form.formState.errors.email?.message} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" {...form.register('password')} />
          <FormFieldError message={form.formState.errors.password?.message} />
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
    </AuthLayout>
  );
}
