import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageShell } from '@/components/page-shell';
import { PageHeader } from '@/components/page-header';
import { LoadingState } from '@/components/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { fetchSkillsCatalog } from '@/features/departments/api';
import {
  fetchProfileRequirements,
  fetchSkillProfiles,
  talentSearch,
  upsertRoleRequirement,
} from '@/features/intelligence/api';
import { getErrorMessage } from '@/lib/errors';

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;

export function SkillsIntelligencePage() {
  const [profileName, setProfileName] = useState('Senior React Developer');
  const [skillId, setSkillId] = useState('');
  const [level, setLevel] = useState<string>('ADVANCED');
  const queryClient = useQueryClient();

  const profilesQuery = useQuery({
    queryKey: ['intelligence', 'skill-profiles'],
    queryFn: fetchSkillProfiles,
  });

  const catalogQuery = useQuery({
    queryKey: ['skills', 'catalog'],
    queryFn: fetchSkillsCatalog,
  });

  const requirementsQuery = useQuery({
    queryKey: ['intelligence', 'requirements', profileName],
    queryFn: () => fetchProfileRequirements(profileName),
    enabled: profileName.length > 2,
  });

  const talentQuery = useQuery({
    queryKey: ['intelligence', 'talent', profileName],
    queryFn: () => talentSearch(profileName),
    enabled: false,
  });

  const saveReq = useMutation({
    mutationFn: () =>
      upsertRoleRequirement({
        profileName,
        skillId,
        requiredProficiency: level,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'skill-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'requirements', profileName] });
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="Skills intelligence"
        description="Role skill requirements, gap analysis, and internal talent matching."
      />

      <Card>
        <CardHeader>
          <CardTitle>Role profile requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="Profile name e.g. Senior React Developer"
          />
          <div className="flex flex-wrap gap-2">
            <select
              className="h-10 rounded-md border px-3 text-sm w-[220px]"
              value={skillId}
              onChange={(e) => setSkillId(e.target.value)}
            >
              <option value="">Skill</option>
              {(
                (catalogQuery.data as Array<{ id: string; name: string }>) ?? []
              ).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border px-3 text-sm w-[160px]"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <Button
              disabled={!skillId || saveReq.isPending}
              onClick={() => saveReq.mutate()}
            >
              Add requirement
            </Button>
            <Button
              variant="secondary"
              onClick={() => talentQuery.refetch()}
              disabled={talentQuery.isFetching}
            >
              Find internal candidates
            </Button>
          </div>
          {saveReq.isError ? (
            <Alert variant="destructive">
              <AlertDescription>{getErrorMessage(saveReq.error)}</AlertDescription>
            </Alert>
          ) : null}
          {requirementsQuery.isLoading ? <LoadingState label="Loading requirements…" /> : null}
          <ul className="text-sm space-y-1">
            {(
              (requirementsQuery.data as Array<{
                skill: { name: string };
                requiredProficiency: string;
              }>) ?? []
            ).map((r, i) => (
              <li key={i}>
                {r.skill.name} = {r.requiredProficiency}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {talentQuery.data ? (
        <Card>
          <CardHeader>
            <CardTitle>Talent match — {profileName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Alert>
              <AlertDescription>
                {(talentQuery.data as { disclaimer: string }).disclaimer}
              </AlertDescription>
            </Alert>
            {(
              (talentQuery.data as { candidates: Array<{ displayName: string; matchPercent: number; skillGaps: string[] }> })
                .candidates ?? []
            ).map((c) => (
              <div key={c.displayName} className="border rounded-md p-3">
                <div className="font-medium">
                  {c.displayName} — {c.matchPercent}% match
                </div>
                {c.skillGaps.length > 0 ? (
                  <div className="text-muted-foreground">Gaps: {c.skillGaps.join('; ')}</div>
                ) : (
                  <div className="text-muted-foreground">No skill gaps for this profile.</div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Defined profiles</CardTitle>
        </CardHeader>
        <CardContent>
          {profilesQuery.isLoading ? <LoadingState /> : null}
          <ul className="text-sm">
            {(
              (profilesQuery.data as Array<{ profileName: string; _count: { skillId: number } }>) ??
              []
            ).map((p) => (
              <li key={p.profileName}>
                {p.profileName} ({p._count.skillId} skills)
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </PageShell>
  );
}
