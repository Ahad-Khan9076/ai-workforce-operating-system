import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/page-shell';
import { PageHeader } from '@/components/page-header';
import { LoadingState } from '@/components/loading-state';
import { apiRequest } from '@/lib/api-client';

export function TrainingPage() {
  const dashboardQuery = useQuery({
    queryKey: ['training-dashboard'],
    queryFn: () => apiRequest('/training/dashboard'),
  });
  const coursesQuery = useQuery({
    queryKey: ['training-courses'],
    queryFn: () => apiRequest('/training/courses'),
  });

  const dashboard = dashboardQuery.data as
    | {
        publishedCourses: number;
        enrollments: number;
        completedEnrollments: number;
        certificates: number;
      }
    | undefined;

  const courses = coursesQuery.data as Array<{ id: string; title: string; isPublished: boolean }> | undefined;

  if (dashboardQuery.isLoading) return <LoadingState label="Loading training…" />;

  return (
    <PageShell>
      <PageHeader title="Training" description="Courses, learning paths, assessments, and certificates." />
      {dashboard && (
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Published courses</p><p className="text-2xl font-semibold">{dashboard.publishedCourses}</p></div>
          <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Enrollments</p><p className="text-2xl font-semibold">{dashboard.enrollments}</p></div>
          <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-semibold">{dashboard.completedEnrollments}</p></div>
          <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Certificates</p><p className="text-2xl font-semibold">{dashboard.certificates}</p></div>
        </section>
      )}
      <section className="space-y-2">
        <h2 className="font-medium">Courses</h2>
        <ul className="text-sm space-y-1">
          {(courses ?? []).map((c) => (
            <li key={c.id} className="flex justify-between border rounded px-3 py-2">
              <span>{c.title}</span>
              <span className="text-muted-foreground">{c.isPublished ? 'Published' : 'Draft'}</span>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
