import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingState } from '@/components/loading-state';
import {
  createEmployee,
  fetchEmployee,
  updateEmployee,
  type EmployeePayload,
} from '@/features/employees/api';
import { fetchDepartments, fetchJobTitles, fetchTeams } from '@/features/departments/api';
import { fetchEmployees } from '@/features/employees/api';
import { getErrorMessage } from '@/lib/errors';

export function EmployeeFormPage() {
  const { employeeId } = useParams();
  const isEdit = Boolean(employeeId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const employeeQuery = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => fetchEmployee(employeeId!),
    enabled: isEdit,
  });

  const departmentsQuery = useQuery({ queryKey: ['departments'], queryFn: fetchDepartments });
  const jobTitlesQuery = useQuery({ queryKey: ['job-titles'], queryFn: fetchJobTitles });
  const managersQuery = useQuery({
    queryKey: ['employees', 'managers'],
    queryFn: () => fetchEmployees({ pageSize: 100 }),
  });

  const form = useForm<EmployeePayload>({
    values: isEdit
      ? ({
          firstName: (employeeQuery.data as EmployeePayload)?.firstName ?? '',
          lastName: (employeeQuery.data as EmployeePayload)?.lastName ?? '',
          email: (employeeQuery.data as { email: string })?.email ?? '',
          preferredName: (employeeQuery.data as { preferredName?: string })?.preferredName,
          phone: (employeeQuery.data as { phone?: string })?.phone,
          jobTitleId: (employeeQuery.data as { jobTitleId?: string })?.jobTitleId,
          departmentId: (employeeQuery.data as { departmentId?: string })?.departmentId,
          teamId: (employeeQuery.data as { teamId?: string })?.teamId,
          managerId: (employeeQuery.data as { managerId?: string })?.managerId,
          employmentStatus: (employeeQuery.data as { employmentStatus?: string })?.employmentStatus,
          employmentType: (employeeQuery.data as { employmentType?: string })?.employmentType,
          workLocation: (employeeQuery.data as { workLocation?: string })?.workLocation,
          joinDate: (employeeQuery.data as { joinDate?: string })?.joinDate?.slice(0, 10),
          bio: (employeeQuery.data as { bio?: string })?.bio,
        } as EmployeePayload)
      : undefined,
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      employmentStatus: 'ACTIVE',
      employmentType: 'FULL_TIME',
    },
  });

  const departmentId = form.watch('departmentId');
  const teamsQuery = useQuery({
    queryKey: ['teams', departmentId],
    queryFn: () => fetchTeams(departmentId),
    enabled: Boolean(departmentId),
  });

  const mutation = useMutation({
    mutationFn: (payload: EmployeePayload) =>
      isEdit ? updateEmployee(employeeId!, payload) : createEmployee(payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      const id = isEdit ? employeeId : (result as { id: string }).id;
      navigate(`/employees/${id}`);
    },
  });

  if (isEdit && employeeQuery.isLoading) {
    return <LoadingState label="Loading employee…" />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        title={isEdit ? 'Edit employee' : 'New employee'}
        description="Maintain accurate employment records for your tenant workforce."
      />
      {mutation.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
        </Alert>
      ) : null}
      <form
        className="space-y-6"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>First name</Label>
              <Input {...form.register('firstName', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Last name</Label>
              <Input {...form.register('lastName', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Preferred name</Label>
              <Input {...form.register('preferredName')} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...form.register('email', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...form.register('phone')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employment</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Job title</Label>
              <select className="flex h-10 w-full rounded-md border px-3 text-sm" {...form.register('jobTitleId')}>
                <option value="">Select</option>
                {((jobTitlesQuery.data as Array<{ id: string; title: string }>) ?? []).map((jt) => (
                  <option key={jt.id} value={jt.id}>{jt.title}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <select className="flex h-10 w-full rounded-md border px-3 text-sm" {...form.register('departmentId')}>
                <option value="">Select</option>
                {((departmentsQuery.data as Array<{ id: string; name: string }>) ?? []).map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Team</Label>
              <select className="flex h-10 w-full rounded-md border px-3 text-sm" {...form.register('teamId')}>
                <option value="">Select</option>
                {((teamsQuery.data as Array<{ id: string; name: string }>) ?? []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Manager</Label>
              <select className="flex h-10 w-full rounded-md border px-3 text-sm" {...form.register('managerId')}>
                <option value="">Select</option>
                {(
                  (managersQuery.data as { items: Array<{ id: string; firstName: string; lastName: string }> })
                    ?.items ?? []
                )
                  .filter((m) => m.id !== employeeId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select className="flex h-10 w-full rounded-md border px-3 text-sm" {...form.register('employmentStatus')}>
                {['ACTIVE', 'ON_LEAVE', 'PROBATION', 'SUSPENDED', 'TERMINATED', 'RESIGNED'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Employment type</Label>
              <select className="flex h-10 w-full rounded-md border px-3 text-sm" {...form.register('employmentType')}>
                {['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Join date</Label>
              <Input type="date" {...form.register('joinDate')} />
            </div>
            <div className="space-y-2">
              <Label>Work location</Label>
              <Input {...form.register('workLocation')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Bio</Label>
              <Input {...form.register('bio')} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create employee'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
