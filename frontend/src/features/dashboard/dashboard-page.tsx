import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Briefcase,
  CalendarClock,
  ClipboardList,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { PageShell } from '@/components/page-shell';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchWorkforceDashboard } from '@/features/employees/api';
import { fetchIntelligenceDashboard, fetchWorkforceRisks } from '@/features/intelligence/api';
import { fetchActionCenter } from '@/features/intelligence/action-center-api';
import { HeadcountTrendChart } from '@/features/dashboard/headcount-trend-chart';
import { getErrorMessage } from '@/lib/errors';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

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

function priorityAccent(priority: string) {
  if (priority === 'URGENT') return 'border-l-red-500';
  if (priority === 'HIGH') return 'border-l-orange-500';
  if (priority === 'MEDIUM') return 'border-l-amber-500';
  return 'border-l-muted-foreground/40';
}

function severityBadgeClass(severity: string) {
  if (severity === 'CRITICAL') return 'bg-red-600 hover:bg-red-600';
  if (severity === 'HIGH') return 'bg-orange-600 hover:bg-orange-600';
  return '';
}

const quickLinks = [
  { label: 'Employees', href: '/employees', icon: Users },
  { label: 'Leave', href: '/workforce/leave', icon: CalendarClock },
  { label: 'Action center', href: '/intelligence/action-center', icon: Sparkles },
  { label: 'Recruitment', href: '/recruitment/jobs', icon: Briefcase },
] as const;

export function DashboardPage() {
  const session = useAuthStore((s) => s.session);
  const firstName = session?.user.firstName ?? 'there';

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
  const headcountTrend = intel?.trends?.headcount?.slice(-6) ?? [];

  const loading =
    actionQuery.isLoading || risksQuery.isLoading || statsQuery.isLoading;

  const attentionCount = pendingUrgent.length + criticalRisks.length;
  const todayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <PageShell width="wide">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-6 py-8 text-white shadow-sm md:px-8"
        aria-label="Dashboard overview"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-blue-200/90">{todayLabel}</p>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Good day, {firstName}
            </h1>
            <p className="max-w-xl text-sm text-slate-300">
              {attentionCount > 0
                ? `${attentionCount} item${attentionCount === 1 ? '' : 's'} need your attention today.`
                : 'Your workforce is in good shape — review recommendations when you have time.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="bg-white text-slate-900 hover:bg-slate-100" asChild>
              <Link to="/intelligence/action-center">
                <ClipboardList className="mr-2 h-4 w-4" />
                Action center
              </Link>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              asChild
            >
              <Link to="/intelligence/copilot">
                <Bot className="mr-2 h-4 w-4" />
                Ask copilot
              </Link>
            </Button>
          </div>
        </div>

        {!loading && statsQuery.data ? (
          <dl className="relative mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: 'Active',
                value: statsQuery.data.activeEmployees,
                sub: `${statsQuery.data.totalEmployees} total`,
              },
              {
                label: 'On leave',
                value: statsQuery.data.employeesOnLeave,
                sub: 'today',
              },
              {
                label: 'Urgent actions',
                value: pendingUrgent.length,
                sub: 'pending',
              },
              {
                label: 'High risks',
                value: criticalRisks.length,
                sub: 'open',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
              >
                <dt className="text-xs text-slate-300">{item.label}</dt>
                <dd className="text-2xl font-semibold tabular-nums">{item.value}</dd>
                <dd className="text-xs text-slate-400">{item.sub}</dd>
              </div>
            ))}
          </dl>
        ) : loading ? (
          <div className="relative mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl bg-white/10" />
            ))}
          </div>
        ) : null}
      </section>

      {/* Quick links */}
      <nav aria-label="Quick links" className="flex flex-wrap gap-2">
        {quickLinks.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            to={href}
            className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon className="h-4 w-4 text-primary" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>

      {(actionQuery.isError || risksQuery.isError || statsQuery.isError) && (
        <Alert variant="destructive">
          <AlertDescription>
            {getErrorMessage(actionQuery.error ?? risksQuery.error ?? statsQuery.error)}
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <LoadingState label="Loading recommendations and metrics…" />
      ) : (
        <div className="grid gap-6 xl:grid-cols-12">
          <section className="space-y-5 xl:col-span-8" aria-labelledby="attention-heading">
            <div className="flex items-center justify-between gap-2">
              <h2 id="attention-heading" className="text-lg font-semibold tracking-tight">
                Needs attention
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/intelligence/action-center">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {criticalRisks.length > 0 ? (
              <Card className="overflow-hidden border-red-200/60 dark:border-red-900/50">
                <CardHeader className="border-b bg-red-50/80 pb-4 dark:bg-red-950/20">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/40">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </span>
                    Workforce risks
                  </CardTitle>
                  <CardDescription>High and critical items from Risk Center</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 pt-4">
                  {criticalRisks.map((risk) => (
                    <div
                      key={risk.id}
                      className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5 text-sm shadow-sm"
                    >
                      <span className="font-medium">{risk.title}</span>
                      <Badge className={cn('text-white', severityBadgeClass(risk.severity))}>
                        {risk.severity}
                      </Badge>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="mt-1" asChild>
                    <Link to="/intelligence/risk">Open Risk Center</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {pendingUrgent.length > 0 ? (
              <div className="space-y-3">
                {pendingUrgent.slice(0, 4).map((action) => (
                  <Card
                    key={action.id}
                    className={cn('border-l-4 shadow-sm', priorityAccent(action.priority))}
                  >
                    <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-base font-medium leading-snug">{action.title}</CardTitle>
                      <Badge variant={priorityVariant(action.priority)}>{action.priority}</Badge>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p className="text-muted-foreground">{action.description}</p>
                      <div className="rounded-md bg-muted/50 px-3 py-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Suggested next step
                        </p>
                        <p className="mt-1 text-foreground">{action.recommendedAction}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : null}

            {pendingUrgent.length === 0 && criticalRisks.length === 0 ? (
              <Card className="border-dashed bg-muted/20">
                <CardContent className="pt-6">
                  <EmptyState
                    icon={Sparkles}
                    title="You're caught up"
                    description="No urgent risks or high-priority actions. Run a scan in Action Center for new insights."
                  />
                  <div className="mt-4 flex justify-center">
                    <Button variant="outline" asChild>
                      <Link to="/intelligence/action-center">Open Action Center</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {pendingRecommended.length > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI recommendations
                  </CardTitle>
                  <CardDescription>Lower priority — review when you have capacity</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {pendingRecommended.map((action) => (
                    <div
                      key={action.id}
                      className="rounded-lg border bg-card p-3 text-sm shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium leading-snug">{action.title}</span>
                        <Badge variant="outline" className="shrink-0">
                          {action.priority}
                        </Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-muted-foreground">{action.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </section>

          <aside className="space-y-5 xl:col-span-4" aria-labelledby="metrics-heading">
            <h2 id="metrics-heading" className="text-lg font-semibold tracking-tight">
              Workforce snapshot
            </h2>
            {statsQuery.data ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <StatCard
                  title="Active employees"
                  value={String(statsQuery.data.activeEmployees)}
                  hint={`${statsQuery.data.totalEmployees} total headcount`}
                  icon={Users}
                  className="shadow-sm"
                />
                <StatCard
                  title="On leave"
                  value={String(statsQuery.data.employeesOnLeave)}
                  hint="Currently away"
                  icon={CalendarClock}
                  className="shadow-sm"
                />
                <StatCard
                  title="New hires"
                  value={String(statsQuery.data.newHires)}
                  hint="Last 30 days"
                  icon={UserPlus}
                  className="shadow-sm"
                />
                <StatCard
                  title="Open roles"
                  value={String(intel?.cards?.hiring?.openJobs ?? '—')}
                  hint={
                    intel?.cards?.hiring?.newHires30d != null
                      ? `${intel.cards.hiring.newHires30d} filled (30d)`
                      : 'Recruitment pipeline'
                  }
                  icon={TrendingUp}
                  className="shadow-sm"
                />
              </div>
            ) : null}

            {headcountTrend.length > 1 ? (
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Headcount trend</CardTitle>
                  <CardDescription>Last {headcountTrend.length} months</CardDescription>
                </CardHeader>
                <CardContent>
                  <HeadcountTrendChart points={headcountTrend} />
                </CardContent>
              </Card>
            ) : null}

            <Card className="border-primary/20 bg-primary/5 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Need a second opinion?</CardTitle>
                <CardDescription>
                  Copilot uses your tenant data through approved tools — not raw database access.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" asChild>
                  <Link to="/intelligence/copilot">
                    <Bot className="mr-2 h-4 w-4" />
                    Open AI Copilot
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </PageShell>
  );
}
