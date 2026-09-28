import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageShell } from '@/components/page-shell';
import { PageHeader } from '@/components/page-header';
import { LoadingState } from '@/components/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchWorkforceInsights,
  refreshWorkforceInsights,
} from '@/features/intelligence/api';
import { getErrorMessage } from '@/lib/errors';
import { useAuthStore } from '@/stores/auth-store';

export function WorkforceInsightsPage() {
  const queryClient = useQueryClient();
  const permissions = useAuthStore((s) => s.session?.permissions ?? []);
  const canRefresh = permissions.includes('employee.read');

  const insightsQuery = useQuery({
    queryKey: ['intelligence', 'insights'],
    queryFn: fetchWorkforceInsights,
  });

  const refresh = useMutation({
    mutationFn: refreshWorkforceInsights,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'insights'] }),
  });

  return (
    <PageShell>
      <PageHeader
        title="Workforce insights"
        description="Actionable narratives: what happened, why it matters, and recommended next steps."
        actions={
          canRefresh ? (
            <Button
              variant="outline"
              disabled={refresh.isPending}
              onClick={() => refresh.mutate()}
            >
              Refresh insights
            </Button>
          ) : null
        }
      />

      {insightsQuery.isLoading ? <LoadingState label="Loading insights…" /> : null}
      {insightsQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(insightsQuery.error)}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4">
        {(
          (insightsQuery.data as Array<{
            id: string;
            title: string;
            whatHappened: string;
            whyItMatters: string;
            recommendedAction: string;
            department?: { name: string } | null;
          }>) ?? []
        ).map((insight) => (
          <Card key={insight.id}>
            <CardHeader>
              <CardTitle className="text-base">{insight.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="font-medium">What happened: </span>
                {insight.whatHappened}
              </p>
              <p>
                <span className="font-medium">Why it matters: </span>
                {insight.whyItMatters}
              </p>
              <p>
                <span className="font-medium">Recommended: </span>
                {insight.recommendedAction}
              </p>
              {insight.department ? (
                <p className="text-muted-foreground">Department: {insight.department.name}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
