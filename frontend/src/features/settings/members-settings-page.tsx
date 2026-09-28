import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingState } from '@/components/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  createInvitationRequest,
  fetchInvitationsRequest,
  fetchMembersRequest,
  fetchAssignableRolesRequest,
  resendInvitationRequest,
} from '@/features/members/api';
import { getErrorMessage } from '@/lib/errors';

export function MembersSettingsPage() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');

  const membersQuery = useQuery({ queryKey: ['members'], queryFn: fetchMembersRequest });
  const invitationsQuery = useQuery({ queryKey: ['invitations'], queryFn: fetchInvitationsRequest });
  const rolesQuery = useQuery({
    queryKey: ['roles', 'assignable'],
    queryFn: fetchAssignableRolesRequest,
  });

  const inviteMutation = useMutation({
    mutationFn: () => createInvitationRequest({ email, roleId }),
    onSuccess: () => {
      setEmail('');
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });

  const resendMutation = useMutation({
    mutationFn: resendInvitationRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invitations'] }),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Members"
        description="Manage organization membership and pending invitations."
      />

      <Card>
        <CardHeader>
          <CardTitle>Invite member</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="inviteEmail">Email</Label>
            <Input id="inviteEmail" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="inviteRole">Role</Label>
            <select
              id="inviteRole"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
            >
              <option value="">Select role</option>
              {(rolesQuery.data ?? []).map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              disabled={!email || !roleId || inviteMutation.isPending}
              onClick={() => inviteMutation.mutate()}
            >
              Send invitation
            </Button>
          </div>
          {inviteMutation.isError ? (
            <Alert variant="destructive" className="md:col-span-3">
              <AlertDescription>{getErrorMessage(inviteMutation.error)}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active members</CardTitle>
        </CardHeader>
        <CardContent>
          {membersQuery.isLoading ? (
            <LoadingState />
          ) : membersQuery.isError ? (
            <Alert variant="destructive">
              <AlertDescription>{getErrorMessage(membersQuery.error)}</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(membersQuery.data as Array<{ user: { firstName: string; lastName: string; email: string }; role: { name: string } }>).map(
                  (member, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {member.user.firstName} {member.user.lastName}
                      </TableCell>
                      <TableCell>{member.user.email}</TableCell>
                      <TableCell>{member.role.name}</TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending invitations</CardTitle>
        </CardHeader>
        <CardContent>
          {invitationsQuery.isLoading ? (
            <LoadingState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invitationsQuery.data as Array<{ id: string; email: string; status: string; role: { name: string } }>).map(
                  (invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell>{invitation.role.name}</TableCell>
                      <TableCell>{invitation.status}</TableCell>
                      <TableCell>
                        {invitation.status === 'PENDING' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resendMutation.mutate(invitation.id)}
                          >
                            Resend
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
