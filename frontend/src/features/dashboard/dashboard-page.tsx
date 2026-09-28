import { useQuery } from '@tanstack/react-query';
import { Building2, UserMinus, UserPlus, Users } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchWorkforceDashboard } from '@/features/employees/api';
import { fetchIntelligenceDashboard } from '@/features/intelligence/api';
import { getErrorMessage } from '@/lib/errors';

export function DashboardPage() {
  const statsQuery = useQuery({
    queryKey: ['dashboard', 'workforce'],
    queryFn: fetchWorkforceDashboard,
  });

  const intelQuery = useQuery({
    queryKey: ['intelligence', 'dashboard'],
    queryFn: () => fetchIntelligenceDashboard(),
  });

  const intel = intelQuery.data as {
    variant?: string;
    cards?: {
      overtime?: { hours30d: number };
      skillGaps?: { count: number };
      risks?: Record<string, number>;
      performance?: { avgRating30d: number | null };
      training?: { incompleteEnrollments: number };
      hiring?: { openJobs: number; newHires30d: number };
    };
    trends?: { headcount?: Array<{ month: string; count: number }> };
  } | undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Executive, HR, and manager intelligence tailored to your role."
      />

      {statsQuery.isLoading ? <LoadingState label="Loading workforce metrics…" /> : null}
      {statsQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(statsQuery.error)}</AlertDescription>
        </Alert>
      ) : null}

      {statsQuery.data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Total employees" value={String(statsQuery.data.totalEmployees)} icon={Users} />
          <StatCard title="Active employees" value={String(statsQuery.data.activeEmployees)} icon={Users} />
          <StatCard title="New hires (30d)" value={String(statsQuery.data.newHires)} icon={UserPlus} />
          <StatCard title="Departments" value={String(statsQuery.data.departments)} icon={Building2} />
          <StatCard
            title="On leave"
            value={String(statsQuery.data.employeesOnLeave)}
            icon={UserMinus}
          />
        </div>
      ) : null}

      {intelQuery.isLoading ? <LoadingState label="Loading intelligence…" /> : null}
      {intelQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(intelQuery.error)}</AlertDescription>
        </Alert>
      ) : null}

      {intel?.cards ? (
        <>
          <p className="text-sm text-muted-foreground capitalize">
            View: {intel.variant ?? 'manager'} dashboard
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Overtime (30d)"
              value={`${intel.cards.overtime?.hours30d ?? 0}h`}
              icon={Users}
            />
            <StatCard
              title="Skill gaps"
              value={String(intel.cards.skillGaps?.count ?? 0)}
              icon={Users}
            />
            <StatCard
              title="Open roles"
              value={String(intel.cards.hiring?.openJobs ?? 0)}
              icon={UserPlus}
            />
            <StatCard
              title="Training in progress"
              value={String(intel.cards.training?.incompleteEnrollments ?? 0)}
              icon={Users}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Risk severity (open)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4 text-sm">
              {Object.entries(intel.cards.risks ?? {}).map(([sev, count]) => (
                <span key={sev}>
                  {sev}: {count}
                </span>
              ))}
            </CardContent>
          </Card>
          {intel.trends?.headcount?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Headcount trend</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {intel.trends.headcount.map((p) => (
                  <div key={p.month} className="flex justify-between max-w-xs">
                    <span>{p.month}</span>
                    <span>{p.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
