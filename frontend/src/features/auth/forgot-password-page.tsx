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
import { forgotPasswordRequest } from '@/features/auth/api';
import { getErrorMessage } from '@/lib/errors';

const schema = z.object({ email: z.string().email() });

export function ForgotPasswordPage() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const mutation = useMutation({ mutationFn: (email: string) => forgotPasswordRequest(email) });

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
          <CardDescription>We will email you a secure reset link if the account exists.</CardDescription>
        </CardHeader>
        <CardContent>
          {mutation.isSuccess ? (
            <Alert>
              <AlertTitle>Check your inbox</AlertTitle>
              <AlertDescription>{mutation.data.message}</AlertDescription>
            </Alert>
          ) : (
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((v) => mutation.mutate(v.email))}
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register('email')} />
              </div>
              {mutation.isError ? (
                <Alert variant="destructive">
                  <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
                </Alert>
              ) : null}
              <Button className="w-full" type="submit" disabled={mutation.isPending}>
                Send reset link
              </Button>
            </form>
          )}
          <p className="mt-6 text-center text-sm">
            <Link to="/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
