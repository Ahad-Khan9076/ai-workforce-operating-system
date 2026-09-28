import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/loading-state';
import { Badge } from '@/components/ui/badge';
import {
  fetchKanban,
  fetchRecruitmentDashboard,
  fetchRecruitmentJobs,
  moveApplicationStage,
  createRecruitmentJob,
  updateJobStatus,
} from '@/features/recruitment/api';
import { getErrorMessage } from '@/lib/errors';
import { Alert, AlertDescription } from '@/components/ui/alert';

const STAGES = [
  'APPLIED',
  'SCREENING',
  'SHORTLISTED',
  'INTERVIEW',
  'OFFER',
  'HIRED',
  'REJECTED',
] as const;

type KanbanCard = {
  id: string;
  stage: string;
  candidate: { firstName: string; lastName: string; email: string };
  job: { title: string };
  aiEvaluations?: Array<{ matchScore: number; recommendation: string }>;
};

export function RecruitmentPage() {
  const queryClient = useQueryClient();
  const [jobFilter, setJobFilter] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const dashboardQuery = useQuery({
    queryKey: ['recruitment-dashboard'],
    queryFn: fetchRecruitmentDashboard,
  });
  const jobsQuery = useQuery({
    queryKey: ['recruitment-jobs'],
    queryFn: () => fetchRecruitmentJobs(),
  });
  const kanbanQuery = useQuery({
    queryKey: ['recruitment-kanban', jobFilter],
    queryFn: () => fetchKanban(jobFilter || undefined),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['recruitment'] });
    void queryClient.invalidateQueries({ queryKey: ['recruitment-dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['recruitment-jobs'] });
    void queryClient.invalidateQueries({ queryKey: ['recruitment-kanban'] });
  };

  const createJobMutation = useMutation({
    mutationFn: () => createRecruitmentJob({ title, description, skills: [] }),
    onSuccess: refresh,
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      moveApplicationStage(id, stage),
    onSuccess: refresh,
  });

  const openJobMutation = useMutation({
    mutationFn: (jobId: string) => updateJobStatus(jobId, 'OPEN'),
    onSuccess: refresh,
  });

  const dashboard = dashboardQuery.data as
    | {
        openJobs: number;
        candidates: number;
        timeToHireDays: number | null;
        interviewPipeline: number;
      }
    | undefined;

  const jobs = jobsQuery.data as Array<{ id: string; title: string; status: string }> | undefined;

  const board = kanbanQuery.data as
    | { board: Record<string, KanbanCard[]> }
    | undefined;

  const onDragStart = (e: React.DragEvent, applicationId: string) => {
    e.dataTransfer.setData('applicationId', applicationId);
  };

  const onDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    const applicationId = e.dataTransfer.getData('applicationId');
    if (applicationId) moveMutation.mutate({ id: applicationId, stage });
  };

  const allowDrop = (e: React.DragEvent) => e.preventDefault();

  const filteredJobs = useMemo(() => jobs ?? [], [jobs]);

  if (dashboardQuery.isLoading) {
    return <LoadingState label="Loading recruitment…" />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Recruitment"
        description="Jobs, candidate pipeline, CV parsing, and AI-assisted screening."
      />

      {dashboard && (
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Open jobs</p>
            <p className="text-2xl font-semibold">{dashboard.openJobs}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Candidates</p>
            <p className="text-2xl font-semibold">{dashboard.candidates}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Time to hire (avg days)</p>
            <p className="text-2xl font-semibold">{dashboard.timeToHireDays ?? '—'}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Interviews scheduled</p>
            <p className="text-2xl font-semibold">{dashboard.interviewPipeline}</p>
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="font-medium">Jobs</h2>
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
          >
            <option value="">All jobs (kanban filter)</option>
            {filteredJobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} ({j.status})
              </option>
            ))}
          </select>
          <ul className="space-y-2 text-sm">
            {filteredJobs.map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-2">
                <span>{j.title}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{j.status}</Badge>
                  {j.status === 'DRAFT' && (
                    <Button size="sm" variant="secondary" onClick={() => openJobMutation.mutate(j.id)}>
                      Publish
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="font-medium">Create job</h2>
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            className="w-full min-h-24 rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button
            disabled={!title || description.length < 10 || createJobMutation.isPending}
            onClick={() => createJobMutation.mutate()}
          >
            Create draft job
          </Button>
          {createJobMutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>{getErrorMessage(createJobMutation.error)}</AlertDescription>
            </Alert>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Candidate pipeline</h2>
          <Link to="/recruitment/candidates" className="text-sm text-primary underline">
            Manage candidates
          </Link>
        </div>
        {kanbanQuery.isLoading ? (
          <LoadingState label="Loading kanban…" />
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {STAGES.map((stage) => (
              <div
                key={stage}
                className="min-w-[220px] flex-shrink-0 rounded-lg border bg-muted/30 p-2"
                onDragOver={allowDrop}
                onDrop={(e) => onDrop(e, stage)}
              >
                <p className="mb-2 text-xs font-semibold text-muted-foreground">{stage}</p>
                <div className="space-y-2">
                  {(board?.board?.[stage] ?? []).map((card) => (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, card.id)}
                      className="cursor-grab rounded-md border bg-card p-2 text-sm shadow-sm active:cursor-grabbing"
                    >
                      <p className="font-medium">
                        {card.candidate.firstName} {card.candidate.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{card.job.title}</p>
                      {card.aiEvaluations?.[0] && (
                        <p className="mt-1 text-xs">
                          AI {card.aiEvaluations[0].matchScore}% ·{' '}
                          {card.aiEvaluations[0].recommendation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {moveMutation.isError && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(moveMutation.error)}</AlertDescription>
          </Alert>
        )}
      </section>
    </div>
  );
}
