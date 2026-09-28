import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { createOrganizationRequest } from '@/features/organization/api';
import { useAuthStore } from '@/stores/auth-store';
import { getErrorMessage } from '@/lib/errors';

const schema = z.object({
  name: z.string().min(2),
  legalName: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  website: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  primaryContact: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function OrganizationOnboardingPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      timezone: 'UTC',
      currency: 'USD',
    },
  });

  const mutation = useMutation({
    mutationFn: createOrganizationRequest,
    onSuccess: (session) => {
      setSession(session);
      navigate('/onboarding/invite');
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <PageHeader
        title="Set up your organization"
        description="Create your tenant workspace. You will be assigned as the organization owner."
      />
      <Card>
        <CardHeader>
          <CardTitle>Organization profile</CardTitle>
          <CardDescription>Tenant data is isolated and scoped to this organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit((values) =>
              mutation.mutate({
                ...values,
                logoUrl: values.logoUrl || undefined,
              }),
            )}
          >
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Organization name *</Label>
              <Input id="name" {...form.register('name')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalName">Legal name</Label>
              <Input id="legalName" {...form.register('legalName')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryContact">Primary contact</Label>
              <Input id="primaryContact" {...form.register('primaryContact')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" {...form.register('website')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input id="logoUrl" {...form.register('logoUrl')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" {...form.register('industry')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companySize">Company size</Label>
              <Input id="companySize" placeholder="e.g. 51-200" {...form.register('companySize')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...form.register('country')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" {...form.register('timezone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" {...form.register('currency')} />
            </div>

            {mutation.isError ? (
              <div className="md:col-span-2">
                <Alert variant="destructive">
                  <AlertTitle>Could not create organization</AlertTitle>
                  <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
                </Alert>
              </div>
            ) : null}

            <div className="md:col-span-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Creating…' : 'Create organization'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
