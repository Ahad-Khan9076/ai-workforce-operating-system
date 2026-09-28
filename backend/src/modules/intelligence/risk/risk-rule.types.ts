import type {
  WorkforceRiskCategory,
  WorkforceRiskSeverity,
} from '@prisma/client';

export interface RiskRuleContext {
  organizationId: string;
  now: Date;
}

export interface DetectedRisk {
  category: WorkforceRiskCategory;
  severity: WorkforceRiskSeverity;
  title: string;
  summary: string;
  ruleCode: string;
  evidence: Record<string, unknown>;
  employeeId?: string;
  departmentId?: string;
}

export interface WorkforceRiskRule {
  code: string;
  description: string;
  detect(ctx: RiskRuleContext): Promise<DetectedRisk[]>;
}
