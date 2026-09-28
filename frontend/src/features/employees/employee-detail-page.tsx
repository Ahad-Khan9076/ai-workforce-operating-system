import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { PageShell } from '@/components/page-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  addEmployeeDocument,
  assignEmployeeSkill,
  fetchEmployee,
  fetchEmployeeDocuments,
  fetchEmployeeSkills,
  fetchEmployeeTimeline,
} from '@/features/employees/api';
import { fetchSkillsCatalog } from '@/features/departments/api';
import { getErrorMessage } from '@/lib/errors';
import { useState } from 'react';

export function EmployeeDetailPage() {
  const { employeeId = '' } = useParams();
  const queryClient = useQueryClient();
  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [skillId, setSkillId] = useState('');
  const [proficiency, setProficiency] = useState('INTERMEDIATE');

  const employeeQuery = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => fetchEmployee(employeeId),
  });

  const timelineQuery = useQuery({
    queryKey: ['employee', employeeId, 'timeline'],
    queryFn: () => fetchEmployeeTimeline(employeeId),
  });

  const documentsQuery = useQuery({
    queryKey: ['employee', employeeId, 'documents'],
    queryFn: () => fetchEmployeeDocuments(employeeId),
  });

  const skillsQuery = useQuery({
    queryKey: ['employee', employeeId, 'skills'],
    queryFn: () => fetchEmployeeSkills(employeeId),
  });

  const catalogQuery = useQuery({
    queryKey: ['skills', 'catalog'],
    queryFn: fetchSkillsCatalog,
  });

  const addDocMutation = useMutation({
    mutationFn: () =>
      addEmployeeDocument(employeeId, {
        name: docName,
        type: 'general',
        fileUrl: docUrl,
      }),
    onSuccess: () => {
      setDocName('');
      setDocUrl('');
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId, 'documents'] });
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId, 'timeline'] });
    },
  });

  const assignSkillMutation = useMutation({
    mutationFn: () =>
      assignEmployeeSkill(employeeId, { skillId, proficiency }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId, 'skills'] });
    },
  });

  if (employeeQuery.isLoading) return <LoadingState label="Loading profile…" />;
  if (employeeQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{getErrorMessage(employeeQuery.error)}</AlertDescription>
      </Alert>
    );
  }

  const employee = employeeQuery.data as {
    id: string;
    firstName: string;
    lastName: string;
    preferredName?: string | null;
    email: string;
    phone?: string | null;
    employeeNumber: string;
    employmentStatus: string;
    employmentType: string;
    workLocation?: string | null;
    bio?: string | null;
    joinDate?: string | null;
    department?: { name: string } | null;
    team?: { name: string } | null;
    jobTitle?: { title: string } | null;
    manager?: { firstName: string; lastName: string } | null;
  };

  return (
    <PageShell>
      <PageHeader
        title={`${employee.firstName} ${employee.lastName}`}
        description={`${employee.jobTitle?.title ?? 'Employee'} · ${employee.employeeNumber}`}
        actions={
          <Button variant="outline" asChild>
            <Link to={`/employees/${employeeId}/edit`}>Edit</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge>{employee.employmentStatus}</Badge>
        <Badge variant="secondary">{employee.employmentType}</Badge>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm md:grid-cols-2">
              <div>Email: {employee.email}</div>
              <div>Phone: {employee.phone ?? '—'}</div>
              <div>Preferred name: {employee.preferredName ?? '—'}</div>
              <div>Bio: {employee.bio ?? '—'}</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employment">
          <Card>
            <CardContent className="grid gap-2 pt-6 text-sm md:grid-cols-2">
              <div>Department: {employee.department?.name ?? '—'}</div>
              <div>Team: {employee.team?.name ?? '—'}</div>
              <div>Manager: {employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : '—'}</div>
              <div>Work location: {employee.workLocation ?? '—'}</div>
              <div>Join date: {employee.joinDate ? new Date(employee.joinDate).toLocaleDateString() : '—'}</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Assign skill</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <select className="h-10 rounded-md border px-3 text-sm" value={skillId} onChange={(e) => setSkillId(e.target.value)}>
                <option value="">Select skill</option>
                {((catalogQuery.data as Array<{ id: string; name: string }>) ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select className="h-10 rounded-md border px-3 text-sm" value={proficiency} onChange={(e) => setProficiency(e.target.value)}>
                {['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <Button disabled={!skillId || assignSkillMutation.isPending} onClick={() => assignSkillMutation.mutate()}>
                Add skill
              </Button>
            </CardContent>
          </Card>
          <ul className="space-y-2 text-sm">
            {((skillsQuery.data as Array<{ skill: { name: string }; proficiency: string }>) ?? []).map((es, i) => (
              <li key={i} className="rounded-md border px-3 py-2">
                {es.skill.name} · {es.proficiency}
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Add document</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={docName} onChange={(e) => setDocName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>File URL</Label>
                <Input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://…" />
              </div>
              <div className="flex items-end">
                <Button disabled={!docName || !docUrl || addDocMutation.isPending} onClick={() => addDocMutation.mutate()}>
                  Upload metadata
                </Button>
              </div>
            </CardContent>
          </Card>
          <ul className="space-y-2 text-sm">
            {((documentsQuery.data as Array<{ id: string; name: string; fileUrl: string; uploadedAt: string }>) ?? []).map((doc) => (
              <li key={doc.id} className="rounded-md border px-3 py-2">
                <a className="text-primary hover:underline" href={doc.fileUrl} target="_blank" rel="noreferrer">
                  {doc.name}
                </a>
                <div className="text-xs text-muted-foreground">
                  {new Date(doc.uploadedAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="timeline">
          <ul className="space-y-3">
            {((timelineQuery.data as Array<{ id: string; title: string; description?: string | null; occurredAt: string; eventType: string }>) ?? []).map((event) => (
              <li key={event.id} className="rounded-md border px-4 py-3">
                <div className="font-medium">{event.title}</div>
                <div className="text-xs text-muted-foreground">
                  {event.eventType} · {new Date(event.occurredAt).toLocaleString()}
                </div>
                {event.description ? <p className="mt-1 text-sm text-muted-foreground">{event.description}</p> : null}
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
