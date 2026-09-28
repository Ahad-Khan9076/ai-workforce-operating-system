import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageShell } from '@/components/page-shell';
import { PageHeader } from '@/components/page-header';
import { LoadingState } from '@/components/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  approveRecommendationAction,
  dismissRecommendationAction,
  fetchActionCenter,
  scanRecommendations,
} from '@/features/intelligence/action-center-api';
import { getErrorMessage } from '@/lib/errors';

type ActionRow = {
  id: string;
  title: string;
  description: string;
  source: string;
  priority: string;
  recommendedAction: string;
  recommendation: {
    id: string;
    whatHappened: string;
    evidence: Record<string, unknown>;
    whyItMatters: string;
    confidenceScore?: number | null;
    confidenceNote?: string | null;
  };
};

function ActionCard({
  action,
  onApprove,
  onDismiss,
  busy,
}: {
  action: ActionRow;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
  busy: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <CardTitle className="text-base">{action.title}</CardTitle>
        <Badge variant="outline">{action.priority}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>{action.description}</p>
        <p>
          <span className="font-medium">What happened: </span>
          {action.recommendation.whatHappened}
        </p>
        <p>
          <span className="font-medium">Why it matters: </span>
          {action.recommendation.whyItMatters}
        </p>
        <p>
          <span className="font-medium">Recommended: </span>
          {action.recommendedAction}
        </p>
        {action.recommendation.confidenceScore != null ? (
          <p className="text-muted-foreground text-xs">
            Confidence: {Math.round(action.recommendation.confidenceScore * 100)}%
            {action.recommendation.confidenceNote
              ? ` — ${action.recommendation.confidenceNote}`
              : ''}
          </p>
        ) : null}
        <details className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
          <summary className="cursor-pointer font-medium text-muted-foreground">
            View evidence
          </summary>
          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap">
            {JSON.stringify(action.recommendation.evidence, null, 2)}
          </pre>
        </details>
        <p className="text-xs text-muted-foreground">Source: {action.source}</p>
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} onClick={() => onApprove(action.id)}>
            Approve
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onDismiss(action.id)}>
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ActionCenterPage() {
  const queryClient = useQueryClient();
  const centerQuery = useQuery({
    queryKey: ['intelligence', 'action-center'],
    queryFn: fetchActionCenter,
  });

  const scan = useMutation({
    mutationFn: scanRecommendations,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'action-center'] }),
  });

  const approve = useMutation({
    mutationFn: approveRecommendationAction,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'action-center'] }),
  });

  const dismiss = useMutation({
    mutationFn: dismissRecommendationAction,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'action-center'] }),
  });

  const data = centerQuery.data as {
    needsAttention?: ActionRow[];
    recommended?: ActionRow[];
    recentlyCompleted?: ActionRow[];
  };

  const busy = approve.isPending || dismiss.isPending;

  return (
    <PageShell>
      <PageHeader
        title="Action center"
        description="Proactive recommendations: detect → understand → recommend → confirm → execute."
        actions={
          <Button disabled={scan.isPending} onClick={() => scan.mutate()}>
            Run recommendation scan
          </Button>
        }
      />

      {centerQuery.isLoading ? <LoadingState label="Loading action center…" /> : null}
      {scan.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(scan.error)}</AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Needs attention</h2>
        <div className="grid gap-4">
          {(data?.needsAttention ?? []).map((a) => (
            <ActionCard
              key={a.id}
              action={a}
              busy={busy}
              onApprove={(id) => approve.mutate(id)}
              onDismiss={(id) => dismiss.mutate(id)}
            />
          ))}
          {(data?.needsAttention ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No urgent items.</p>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Recommended</h2>
        <div className="grid gap-4">
          {(data?.recommended ?? []).map((a) => (
            <ActionCard
              key={a.id}
              action={a}
              busy={busy}
              onApprove={(id) => approve.mutate(id)}
              onDismiss={(id) => dismiss.mutate(id)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Recently completed</h2>
        <div className="grid gap-4">
          {(data?.recentlyCompleted ?? []).map((a) => (
            <Card key={a.id}>
              <CardHeader>
                <CardTitle className="text-base">{a.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {a.description}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
