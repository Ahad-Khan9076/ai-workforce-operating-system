import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  applyToJob,
  createCandidate,
  fetchRecruitmentJobs,
  hireApplication,
  screenApplication,
  uploadCandidateCv,
} from '@/features/recruitment/api';
import { apiRequest } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/errors';

export function RecruitmentCandidatesPage() {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [jobId, setJobId] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [cvText, setCvText] = useState('');
  const [applicationId, setApplicationId] = useState('');

  const jobsQuery = useQuery({
    queryKey: ['recruitment-jobs'],
    queryFn: () => fetchRecruitmentJobs('OPEN'),
  });

  const applicationsQuery = useQuery({
    queryKey: ['recruitment-applications'],
    queryFn: () => apiRequest('/recruitment/applications'),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['recruitment-applications'] });
    void queryClient.invalidateQueries({ queryKey: ['recruitment-kanban'] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createCandidate({ firstName, lastName, email }) as Promise<{ id: string }>,
    onSuccess: (data) => {
      setCandidateId(data.id);
      refresh();
    },
  });

  const applyMutation = useMutation({
    mutationFn: () => applyToJob(jobId, candidateId) as Promise<{ id: string }>,
    onSuccess: (data) => {
      setApplicationId(data.id);
      refresh();
    },
  });

  const cvMutation = useMutation({
    mutationFn: () => {
      const payload = `---CV-TEXT-START---\n${cvText}\n---CV-TEXT-END---`;
      const contentBase64 = btoa(unescape(encodeURIComponent(payload)));
      return uploadCandidateCv(candidateId, {
        fileName: 'resume.pdf',
        mimeType: 'application/pdf',
        contentBase64,
      });
    },
    onSuccess: refresh,
  });

  const screenMutation = useMutation({
    mutationFn: () => screenApplication(applicationId),
    onSuccess: refresh,
  });

  const hireMutation = useMutation({
    mutationFn: () => hireApplication(applicationId),
    onSuccess: refresh,
  });

  const jobs = jobsQuery.data as Array<{ id: string; title: string }> | undefined;

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        title="Candidates"
        description="Add candidates, upload CVs, run AI screening, and hire into employees."
      />

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="font-medium">1. Create candidate</h2>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
          Create
        </Button>
        {candidateId && <p className="text-xs text-muted-foreground">Candidate ID: {candidateId}</p>}
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="font-medium">2. Apply to job</h2>
        <select
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
        >
          <option value="">Select open job</option>
          {(jobs ?? []).map((j) => (
            <option key={j.id} value={j.id}>{j.title}</option>
          ))}
        </select>
        <Button
          disabled={!candidateId || !jobId}
          onClick={() => applyMutation.mutate()}
        >
          Create application
        </Button>
        {applicationId && <p className="text-xs text-muted-foreground">Application ID: {applicationId}</p>}
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="font-medium">3. Upload CV (text extraction pipeline)</h2>
        <textarea
          className="w-full min-h-28 rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Paste CV text — stored as extracted content for AI screening"
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
        />
        <Button disabled={!candidateId || !cvText} onClick={() => cvMutation.mutate()}>
          Process CV
        </Button>
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="font-medium">4. AI screening (mock provider in dev)</h2>
        <Button disabled={!applicationId} onClick={() => screenMutation.mutate()}>
          Run screening
        </Button>
        <p className="text-xs text-muted-foreground">
          AI scores are advisory only and stored separately with audit metadata.
        </p>
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="font-medium">5. Hire → employee + onboarding</h2>
        <Button disabled={!applicationId} onClick={() => hireMutation.mutate()}>
          Convert to employee
        </Button>
      </section>

      {(createMutation.isError ||
        applyMutation.isError ||
        cvMutation.isError ||
        screenMutation.isError ||
        hireMutation.isError) && (
        <Alert variant="destructive">
          <AlertDescription>
            {getErrorMessage(
              createMutation.error ??
                applyMutation.error ??
                cvMutation.error ??
                screenMutation.error ??
                hireMutation.error,
            )}
          </AlertDescription>
        </Alert>
      )}

      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
        {JSON.stringify(applicationsQuery.data, null, 2)}
      </pre>
    </div>
  );
}
