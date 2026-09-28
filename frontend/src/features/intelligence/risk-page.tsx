import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { LoadingState } from '@/components/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchRiskRules,
  fetchWorkforceRisks,
  scanWorkforceRisks,
} from '@/features/intelligence/api';
import { getErrorMessage } from '@/lib/errors';

export function RiskCenterPage() {
  const queryClient = useQueryClient();

  const risksQuery = useQuery({
    queryKey: ['intelligence', 'risks'],
    queryFn: fetchWorkforceRisks,
  });

  const rulesQuery = useQuery({
    queryKey: ['intelligence', 'risk-rules'],
    queryFn: fetchRiskRules,
  });

  const scan = useMutation({
    mutationFn: scanWorkforceRisks,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['intelligence', 'risks'] }),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Workforce risk center"
        description="Rule-based signals with explicit evidence—never opaque HR decisions."
        actions={
          <Button disabled={scan.isPending} onClick={() => scan.mutate()}>
            Run risk scan
          </Button>
        }
      />

      {risksQuery.isLoading ? <LoadingState label="Loading risks…" /> : null}
      {scan.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(scan.error)}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Active rules</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {(
            (rulesQuery.data as Array<{ code: string; description: string }>) ?? []
          ).map((r) => (
            <div key={r.code}>
              <span className="font-mono text-xs">{r.code}</span> — {r.description}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {(
          (risksQuery.data as Array<{
            id: string;
            severity: string;
            category: string;
            title: string;
            summary: string;
            ruleCode: string;
            evidence: Record<string, unknown>;
            employee?: { firstName: string; lastName: string } | null;
          }>) ?? []
        ).map((risk) => (
          <Card key={risk.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">{risk.title}</CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline">{risk.category}</Badge>
                <Badge>{risk.severity}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{risk.summary}</p>
              {risk.employee ? (
                <p className="text-muted-foreground">
                  Employee: {risk.employee.firstName} {risk.employee.lastName}
                </p>
              ) : null}
              <pre className="text-xs bg-muted p-2 rounded-md overflow-auto">
                {JSON.stringify(risk.evidence, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
