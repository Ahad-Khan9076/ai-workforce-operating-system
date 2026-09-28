import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/page-shell';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveTable } from '@/components/responsive-table';
import { getErrorMessage } from '@/lib/errors';
import {
  fetchBillingInvoices,
  fetchBillingPlans,
  fetchBillingSubscription,
  fetchBillingUsage,
} from '@/features/billing/api';
import { useAuthStore } from '@/stores/auth-store';

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'USD',
  }).format(cents / 100);
}

function metricLabel(code: string) {
  return code.replace(/_/g, ' ').toLowerCase();
}

export function BillingPage() {
  const canManage = useAuthStore((s) =>
    (s.session?.permissions ?? []).includes('billing.manage'),
  );

  const plansQuery = useQuery({ queryKey: ['billing', 'plans'], queryFn: fetchBillingPlans });
  const subQuery = useQuery({ queryKey: ['billing', 'subscription'], queryFn: fetchBillingSubscription });
  const usageQuery = useQuery({ queryKey: ['billing', 'usage'], queryFn: fetchBillingUsage });
  const invoicesQuery = useQuery({ queryKey: ['billing', 'invoices'], queryFn: fetchBillingInvoices });

  if (plansQuery.isLoading || subQuery.isLoading) {
    return <LoadingState label="Loading billing…" />;
  }

  if (subQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{getErrorMessage(subQuery.error)}</AlertDescription>
      </Alert>
    );
  }

  const subscription = subQuery.data;
  const plans = plansQuery.data ?? [];

  return (
    <PageShell>
      <PageHeader
        title="Billing"
        description="Subscription, usage, and invoices for your organization."
      />

      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <span className="text-lg font-semibold">{subscription?.plan?.name}</span>
          <Badge variant="secondary">{subscription?.status}</Badge>
          <span className="text-muted-foreground text-sm">{subscription?.plan?.description}</span>
        </CardContent>
      </Card>

      {usageQuery.data ? (
        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Limit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageQuery.data.metrics.map((m) => (
                  <TableRow key={m.metric}>
                    <TableCell className="capitalize">{metricLabel(m.metric)}</TableCell>
                    <TableCell>{m.quantity}</TableCell>
                    <TableCell>{m.limit ?? 'Unlimited'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </ResponsiveTable>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Available plans</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-lg border p-4 space-y-2">
              <p className="font-semibold">{plan.name}</p>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
              <p className="text-lg font-medium">
                {plan.priceCents === 0 && plan.code === 'ENTERPRISE'
                  ? 'Contact sales'
                  : formatMoney(plan.priceCents, plan.currency)}
              </p>
              {canManage && plan.code !== subscription?.plan?.code ? (
                <p className="text-xs text-muted-foreground">
                  Upgrade via checkout (configure Stripe in production).
                </p>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      {invoicesQuery.data && invoicesQuery.data.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoicesQuery.data.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{inv.status}</TableCell>
                    <TableCell>{formatMoney(inv.amountCents, inv.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </ResponsiveTable>
          </CardContent>
        </Card>
      ) : null}
    </PageShell>
  );
}
