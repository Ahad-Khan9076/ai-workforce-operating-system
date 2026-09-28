import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/page-shell';
import { PageHeader } from '@/components/page-header';
import { LoadingState } from '@/components/loading-state';
import { apiRequest } from '@/lib/api-client';

export function PerformancePage() {
  const dashboardQuery = useQuery({
    queryKey: ['performance-dashboard'],
    queryFn: () => apiRequest('/performance/dashboard'),
  });
  const cyclesQuery = useQuery({
    queryKey: ['performance-cycles'],
    queryFn: () => apiRequest('/performance/cycles'),
  });

  const dashboard = dashboardQuery.data as
    | {
        goalCompletionPercent: number;
        pendingReviews: number;
        departmentPerformance: Array<{ name: string; avgProgress: number }>;
      }
    | undefined;

  const cycles = cyclesQuery.data as Array<{ id: string; name: string; status: string }> | undefined;

  if (dashboardQuery.isLoading) return <LoadingState label="Loading performance…" />;

  return (
    <PageShell>
      <PageHeader title="Performance" description="Cycles, goals, reviews, and development insights." />
      {dashboard && (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Goal completion</p><p className="text-2xl font-semibold">{dashboard.goalCompletionPercent}%</p></div>
          <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Pending reviews</p><p className="text-2xl font-semibold">{dashboard.pendingReviews}</p></div>
          <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Departments tracked</p><p className="text-2xl font-semibold">{dashboard.departmentPerformance.length}</p></div>
        </section>
      )}
      <section className="space-y-2">
        <h2 className="font-medium">Cycles</h2>
        <ul className="text-sm space-y-1">
          {(cycles ?? []).map((c) => (
            <li key={c.id} className="flex justify-between border rounded px-3 py-2">
              <span>{c.name}</span>
              <span className="text-muted-foreground">{c.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
