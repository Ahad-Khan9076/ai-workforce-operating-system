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
import { forgotPasswordRequest } from '@/features/auth/api';
import { getErrorMessage } from '@/lib/errors';

const schema = z.object({ email: z.string().email('Enter a valid email') });

export function ForgotPasswordPage() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const mutation = useMutation({ mutationFn: (email: string) => forgotPasswordRequest(email) });

  return (
    <AuthLayout
      title="Forgot password"
      description="We will email you a secure reset link if the account exists."
      footer={
        <Link className="text-primary hover:underline" to="/login">
          Back to sign in
        </Link>
      }
    >
      {mutation.isSuccess ? (
        <Alert>
          <AlertTitle>Check your inbox</AlertTitle>
          <AlertDescription>{mutation.data.message}</AlertDescription>
        </Alert>
      ) : (
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((v) => mutation.mutate(v.email))}
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
            <FormFieldError message={form.formState.errors.email?.message} />
          </div>
          {mutation.isError ? (
            <Alert variant="destructive">
              <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
            </Alert>
          ) : null}
          <Button className="w-full" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
