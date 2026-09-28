import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { PageShell } from '@/components/page-shell';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { fetchWorkforceDashboard } from '@/features/employees/api';
import { fetchIntelligenceDashboard } from '@/features/intelligence/api';
import { fetchWorkforceRisks } from '@/features/intelligence/api';
import { fetchActionCenter } from '@/features/intelligence/action-center-api';
import { getErrorMessage } from '@/lib/errors';

type ActionItem = {
  id: string;
  title: string;
  description: string;
  priority: string;
  recommendedAction: string;
  recommendation?: { whatHappened: string; whyItMatters: string };
};

function priorityVariant(priority: string): 'default' | 'secondary' | 'outline' {
  if (priority === 'URGENT' || priority === 'HIGH') return 'default';
  if (priority === 'MEDIUM') return 'secondary';
  return 'outline';
}

export function DashboardPage() {
  const actionQuery = useQuery({
    queryKey: ['dashboard', 'action-center'],
    queryFn: fetchActionCenter,
  });

  const risksQuery = useQuery({
    queryKey: ['dashboard', 'risks'],
    queryFn: fetchWorkforceRisks,
  });

  const statsQuery = useQuery({
    queryKey: ['dashboard', 'workforce'],
    queryFn: fetchWorkforceDashboard,
  });

  const intelQuery = useQuery({
    queryKey: ['intelligence', 'dashboard'],
    queryFn: () => fetchIntelligenceDashboard(),
  });

  const actionData = actionQuery.data as
    | {
        needsAttention?: ActionItem[];
        recommended?: ActionItem[];
      }
    | undefined;

  const risks = (risksQuery.data as Array<{ severity: string; title: string; id: string }> | undefined) ?? [];
  const criticalRisks = risks.filter((r) => r.severity === 'CRITICAL' || r.severity === 'HIGH').slice(0, 5);

  const intel = intelQuery.data as {
    trends?: { headcount?: Array<{ month: string; count: number }> };
    cards?: { hiring?: { openJobs: number; newHires30d: number } };
  } | undefined;

  const pendingUrgent = actionData?.needsAttention ?? [];
  const pendingRecommended = (actionData?.recommended ?? []).slice(0, 4);

  const loading =
    actionQuery.isLoading || risksQuery.isLoading || statsQuery.isLoading;

  return (
    <PageShell>
      <PageHeader
        title="Today"
        description="What needs your attention — risks, actions, and workforce health."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/intelligence/copilot">
              <Bot className="mr-2 h-4 w-4" />
              Ask copilot
            </Link>
          </Button>
        }
      />

      {loading ? <LoadingState label="Loading your workspace…" /> : null}

      {(actionQuery.isError || risksQuery.isError || statsQuery.isError) && (
        <Alert variant="destructive">
          <AlertDescription>
            {getErrorMessage(actionQuery.error ?? risksQuery.error ?? statsQuery.error)}
          </AlertDescription>
        </Alert>
      )}

      {!loading ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-4 lg:col-span-2" aria-labelledby="attention-heading">
            <div className="flex items-center justify-between gap-2">
              <h2 id="attention-heading" className="text-lg font-semibold tracking-tight">
                Needs attention
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/intelligence/action-center">
                  Action center
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {criticalRisks.length > 0 ? (
              <Card className="border-destructive/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Critical workforce risks
                  </CardTitle>
                  <CardDescription>Open high-severity items from Risk Center</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {criticalRisks.map((risk) => (
                    <div
                      key={risk.id}
                      className="flex items-start justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <span>{risk.title}</span>
                      <Badge variant="default">{risk.severity}</Badge>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="mt-2" asChild>
                    <Link to="/intelligence/risk">Review all risks</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {pendingUrgent.length > 0 ? (
              <div className="space-y-3">
                {pendingUrgent.slice(0, 4).map((action) => (
                  <Card key={action.id}>
                    <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-base font-medium">{action.title}</CardTitle>
                      <Badge variant={priorityVariant(action.priority)}>{action.priority}</Badge>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <p className="text-foreground">{action.description}</p>
                      <p>
                        <span className="font-medium text-foreground">Suggested: </span>
                        {action.recommendedAction}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : null}

            {pendingUrgent.length === 0 && criticalRisks.length === 0 ? (
              <div className="space-y-4">
                <EmptyState
                  icon={Sparkles}
                  title="You're caught up"
                  description="No urgent risks or high-priority actions right now. Scan for new recommendations in Action Center."
                />
                <Button variant="outline" className="w-full sm:w-auto" asChild>
                  <Link to="/intelligence/action-center">Open Action Center</Link>
                </Button>
              </div>
            ) : null}

            {pendingRecommended.length > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">AI recommendations</CardTitle>
                  <CardDescription>Review when you have capacity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingRecommended.map((action) => (
                    <div key={action.id} className="rounded-md border px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{action.title}</span>
                        <Badge variant="outline">{action.priority}</Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground line-clamp-2">{action.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </section>

          <aside className="space-y-4" aria-labelledby="metrics-heading">
            <h2 id="metrics-heading" className="text-lg font-semibold tracking-tight">
              Workforce snapshot
            </h2>
            {statsQuery.data ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <StatCard
                  title="Active employees"
                  value={String(statsQuery.data.activeEmployees)}
                  hint={`${statsQuery.data.totalEmployees} total`}
                  icon={Users}
                />
                <StatCard
                  title="On leave today"
                  value={String(statsQuery.data.employeesOnLeave)}
                  icon={Users}
                />
                <StatCard
                  title="New hires (30d)"
                  value={String(statsQuery.data.newHires)}
                  icon={TrendingUp}
                />
                <StatCard
                  title="Open roles"
                  value={String(intel?.cards?.hiring?.openJobs ?? '—')}
                  hint={
                    intel?.cards?.hiring?.newHires30d != null
                      ? `${intel.cards.hiring.newHires30d} hired (30d)`
                      : undefined
                  }
                  icon={TrendingUp}
                />
              </div>
            ) : null}

            {intel?.trends?.headcount && intel.trends.headcount.length > 1 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Headcount trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {intel.trends.headcount.slice(-6).map((p) => (
                      <li key={p.month} className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{p.month}</span>
                        <span className="font-medium tabular-nums">{p.count}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </aside>
        </div>
      ) : null}
    </PageShell>
  );
}
