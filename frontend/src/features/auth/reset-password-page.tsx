import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { resetPasswordRequest } from '@/features/auth/api';
import { getErrorMessage } from '@/lib/errors';

const schema = z.object({ password: z.string().min(8) });

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: '' },
  });

  const mutation = useMutation({
    mutationFn: (password: string) => resetPasswordRequest(token, password),
  });

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Invalid link</AlertTitle>
          <AlertDescription>Reset token is missing.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>Choose a strong password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {mutation.isSuccess ? (
            <Alert>
              <AlertTitle>Password updated</AlertTitle>
              <AlertDescription>
                <Link to="/login" className="text-primary hover:underline">
                  Sign in with your new password
                </Link>
              </AlertDescription>
            </Alert>
          ) : (
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((v) => mutation.mutate(v.password))}
            >
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input id="password" type="password" {...form.register('password')} />
              </div>
              {mutation.isError ? (
                <Alert variant="destructive">
                  <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
                </Alert>
              ) : null}
              <Button className="w-full" type="submit" disabled={mutation.isPending}>
                Update password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
