import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/loading-state';
import { verifyEmailRequest } from '@/features/auth/api';
import { getErrorMessage } from '@/lib/errors';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const started = useRef(false);
  const mutation = useMutation({
    mutationFn: () => verifyEmailRequest(token),
  });

  useEffect(() => {
    if (token && !started.current) {
      started.current = true;
      mutation.mutate();
    }
  }, [token, mutation]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email verification</CardTitle>
        </CardHeader>
        <CardContent>
          {!token ? (
            <Alert variant="destructive">
              <AlertTitle>Invalid link</AlertTitle>
              <AlertDescription>Verification token is missing.</AlertDescription>
            </Alert>
          ) : mutation.isPending ? (
            <LoadingState label="Verifying your email…" />
          ) : mutation.isSuccess ? (
            <Alert>
              <AlertTitle>Email verified</AlertTitle>
              <AlertDescription>
                <Link to="/login" className="text-primary hover:underline">
                  Continue to sign in
                </Link>
              </AlertDescription>
            </Alert>
          ) : mutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Verification failed</AlertTitle>
              <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
