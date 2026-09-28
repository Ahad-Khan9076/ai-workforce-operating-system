import { Injectable } from '@nestjs/common';
import {
  CertificateStatus,
  EnrollmentStatus,
  RecommendationActionStatus,
  RecommendationPriority,
  RecommendationStatus,
  RecommendationType,
  RecruitmentJobStatus,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import type { DetectedRecommendation } from './recommendation.types.js';

@Injectable()
export class RecommendationEngineService {
  constructor(private readonly prisma: PrismaService) {}

  listRuleCatalog() {
    return [
      {
        code: 'DEPT_OVERTIME_INCREASE',
        type: RecommendationType.ATTENDANCE,
        name: 'Department overtime increase',
        description: 'Detects month-over-month overtime increase by department.',
      },
      {
        code: 'TRAINING_OVERDUE_BULK',
        type: RecommendationType.TRAINING,
        name: 'Overdue mandatory training',
        description: 'Counts incomplete required training past threshold.',
      },
      {
        code: 'SKILLS_GAP_CLUSTER',
        type: RecommendationType.SKILLS,
        name: 'Department skill gaps',
        description: 'Clusters open skill gaps by department.',
      },
      {
        code: 'RECRUITMENT_STRONG_CANDIDATES',
        type: RecommendationType.RECRUITMENT,
        name: 'Strong candidate pool',
        description: 'Open jobs with multiple high-match candidates.',
      },
      {
        code: 'CERTIFICATE_EXPIRING',
        type: RecommendationType.TRAINING,
        name: 'Certificates expiring soon',
        description: 'Certificates expiring within configured window.',
      },
    ];
  }

  async evaluate(organizationId: string, now = new Date()) {
    const detected: DetectedRecommendation[] = [];
    detected.push(...(await this.evalOvertime(organizationId, now)));
    detected.push(...(await this.evalTrainingOverdue(organizationId, now)));
    detected.push(...(await this.evalSkillGaps(organizationId)));
    detected.push(...(await this.evalRecruitment(organizationId)));
    detected.push(...(await this.evalCertificates(organizationId, now)));
    return detected;
  }

  async sync(organizationId: string, now = new Date()) {
    await this.ensureGlobalRules();
    const detected = await this.evaluate(organizationId, now);

    for (const item of detected) {
      const rule = await this.prisma.recommendationRule.findFirst({
        where: { code: item.ruleCode, organizationId: null },
      });

      const rec = await this.prisma.recommendation.upsert({
        where: {
          organizationId_ruleCode_dedupeKey: {
            organizationId,
            ruleCode: item.ruleCode,
            dedupeKey: item.dedupeKey,
          },
        },
        create: {
          organizationId,
          ruleId: rule?.id,
          ruleCode: item.ruleCode,
          type: item.type,
          priority: item.priority,
          title: item.title,
          whatHappened: item.whatHappened,
          evidence: item.evidence as Prisma.InputJsonValue,
          whyItMatters: item.whyItMatters,
          recommendedAction: item.recommendedAction,
          confidenceScore: item.confidenceScore,
          confidenceNote: item.confidenceNote,
          dedupeKey: item.dedupeKey,
          departmentId: item.departmentId,
          status: RecommendationStatus.OPEN,
        },
        update: {
          title: item.title,
          whatHappened: item.whatHappened,
          evidence: item.evidence as Prisma.InputJsonValue,
          whyItMatters: item.whyItMatters,
          recommendedAction: item.recommendedAction,
          confidenceScore: item.confidenceScore,
          confidenceNote: item.confidenceNote,
          priority: item.priority,
        },
      });

      const pendingAction = await this.prisma.recommendationAction.findFirst({
        where: {
          recommendationId: rec.id,
          status: RecommendationActionStatus.PENDING,
        },
      });

      if (!pendingAction && rec.status === RecommendationStatus.OPEN) {
        await this.prisma.recommendationAction.create({
          data: {
            organizationId,
            recommendationId: rec.id,
            title: rec.title,
            description: rec.whatHappened,
            source: `rule:${rec.ruleCode}`,
            priority: rec.priority,
            recommendedAction: rec.recommendedAction,
          },
        });
      }
    }

    return detected.length;
  }

  private async ensureGlobalRules() {
    for (const rule of this.listRuleCatalog()) {
      const existing = await this.prisma.recommendationRule.findFirst({
        where: { code: rule.code, organizationId: null },
      });
      if (existing) {
        await this.prisma.recommendationRule.update({
          where: { id: existing.id },
          data: {
            name: rule.name,
            description: rule.description,
            type: rule.type,
          },
        });
      } else {
        await this.prisma.recommendationRule.create({
          data: {
            code: rule.code,
            type: rule.type,
            name: rule.name,
            description: rule.description,
            organizationId: null,
          },
        });
      }
    }
  }

  private async evalOvertime(organizationId: string, now: Date) {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        organizationId,
        workDate: { gte: prevStart },
      },
      select: {
        overtimeMinutes: true,
        workDate: true,
        employee: { select: { departmentId: true, department: { select: { id: true, name: true } } } },
      },
    });

    const byDept = new Map<string, { name: string; current: number; prior: number }>();
    for (const r of records) {
      const dept = r.employee.department;
      if (!dept) continue;
      const entry = byDept.get(dept.id) ?? { name: dept.name, current: 0, prior: 0 };
      const t = r.workDate.getTime();
      if (t >= monthStart.getTime()) entry.current += r.overtimeMinutes;
      else if (t >= prevStart.getTime() && t <= prevEnd.getTime()) entry.prior += r.overtimeMinutes;
      byDept.set(dept.id, entry);
    }

    const out: DetectedRecommendation[] = [];
    for (const [deptId, v] of byDept) {
      if (v.prior <= 0 || v.current <= 60) continue;
      const pct = Math.round(((v.current - v.prior) / v.prior) * 100);
      if (pct < 15) continue;
      out.push({
        ruleCode: 'DEPT_OVERTIME_INCREASE',
        type: RecommendationType.ATTENDANCE,
        priority: pct >= 25 ? RecommendationPriority.HIGH : RecommendationPriority.MEDIUM,
        title: `${v.name} overtime increased ${pct}%`,
        whatHappened: `${v.name} logged ${Math.round(v.current / 60)} overtime hours this month vs ${Math.round(v.prior / 60)} last month (~${pct}% change).`,
        evidence: {
          departmentId: deptId,
          departmentName: v.name,
          currentMinutes: v.current,
          priorMinutes: v.prior,
          percentChange: pct,
        },
        whyItMatters: 'Sustained overtime may signal workload imbalance or understaffing.',
        recommendedAction: `Review workload distribution for ${v.name}.`,
        confidenceScore: 0.85,
        confidenceNote: 'Based on attendance records only; does not infer individual performance.',
        dedupeKey: `dept:${deptId}:${now.getFullYear()}-${now.getMonth() + 1}`,
        departmentId: deptId,
      });
    }
    return out;
  }

  private async evalTrainingOverdue(organizationId: string, now: Date) {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 30);
    const count = await this.prisma.employeeEnrollment.count({
      where: {
        organizationId,
        status: { in: [EnrollmentStatus.NOT_STARTED, EnrollmentStatus.IN_PROGRESS] },
        createdAt: { lte: cutoff },
      },
    });
    if (count < 1) return [];
    return [
      {
        ruleCode: 'TRAINING_OVERDUE_BULK',
        type: RecommendationType.TRAINING,
        priority:
          count >= 10 ? RecommendationPriority.HIGH : RecommendationPriority.MEDIUM,
        title: `${count} employees have overdue training enrollments`,
        whatHappened: `${count} course enrollments remain incomplete ${30}+ days after enrollment.`,
        evidence: { overdueEnrollmentCount: count, thresholdDays: 30 },
        whyItMatters: 'Overdue training affects compliance and role readiness.',
        recommendedAction: 'Send reminder to affected employees.',
        confidenceScore: 0.9,
        confidenceNote: 'Counts enrollments marked incomplete; verify mandatory flags in LMS.',
        dedupeKey: `training-overdue:${now.toISOString().slice(0, 10)}`,
      },
    ];
  }

  private async evalSkillGaps(organizationId: string) {
    const gaps = await this.prisma.skillGap.findMany({
      where: { organizationId },
      include: {
        employee: { select: { departmentId: true, department: { select: { id: true, name: true } } } },
      },
    });
    const byDept = new Map<string, { name: string; count: number }>();
    for (const g of gaps) {
      const dept = g.employee.department;
      if (!dept) continue;
      const prev = byDept.get(dept.id) ?? { name: dept.name, count: 0 };
      prev.count += 1;
      byDept.set(dept.id, prev);
    }
    const out: DetectedRecommendation[] = [];
    for (const [deptId, v] of byDept) {
      if (v.count < 3) continue;
      out.push({
        ruleCode: 'SKILLS_GAP_CLUSTER',
        type: RecommendationType.SKILLS,
        priority: RecommendationPriority.MEDIUM,
        title: `${v.name} has ${v.count} recorded skill gaps`,
        whatHappened: `${v.name} shows ${v.count} open skill gaps against role profiles.`,
        evidence: { departmentId: deptId, gapCount: v.count },
        whyItMatters: 'Skill gaps may limit delivery on upcoming work.',
        recommendedAction: 'Recommend employees for targeted training.',
        confidenceScore: 0.75,
        confidenceNote: 'Gaps depend on defined role requirements and recorded employee skills.',
        dedupeKey: `skills:${deptId}`,
        departmentId: deptId,
      });
    }
    return out;
  }

  private async evalRecruitment(organizationId: string) {
    const jobs = await this.prisma.recruitmentJob.findMany({
      where: { organizationId, status: RecruitmentJobStatus.OPEN },
      select: { id: true, title: true },
    });
    const out: DetectedRecommendation[] = [];
    for (const job of jobs) {
      const strong = await this.prisma.aiCandidateEvaluation.count({
        where: {
          organizationId,
          matchScore: { gte: 80 },
          application: { jobId: job.id },
        },
      });
      if (strong < 3) continue;
      out.push({
        ruleCode: 'RECRUITMENT_STRONG_CANDIDATES',
        type: RecommendationType.RECRUITMENT,
        priority: RecommendationPriority.MEDIUM,
        title: `Strong candidates for ${job.title}`,
        whatHappened: `Open role "${job.title}" has ${strong} candidates with match score ≥ 80%.`,
        evidence: { jobId: job.id, jobTitle: job.title, strongCandidateCount: strong },
        whyItMatters: 'High-match candidates reduce time-to-hire if acted on promptly.',
        recommendedAction: 'Schedule interviews.',
        confidenceScore: 0.8,
        confidenceNote: 'Match scores come from screening provider output, not hiring decisions.',
        dedupeKey: `job:${job.id}`,
      });
    }
    return out;
  }

  private async evalCertificates(organizationId: string, now: Date) {
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);
    const count = await this.prisma.trainingCertificate.count({
      where: {
        organizationId,
        status: { in: [CertificateStatus.ACTIVE, CertificateStatus.EXPIRING] },
        expiresAt: { lte: in30, gte: now },
      },
    });
    if (count < 1) return [];
    return [
      {
        ruleCode: 'CERTIFICATE_EXPIRING',
        type: RecommendationType.TRAINING,
        priority: RecommendationPriority.MEDIUM,
        title: `${count} certificates expiring within 30 days`,
        whatHappened: `${count} training certificates expire in the next 30 days.`,
        evidence: { expiringCount: count, windowDays: 30 },
        whyItMatters: 'Expired certificates may affect compliance and role eligibility.',
        recommendedAction: 'Notify employee and HR to schedule renewal training.',
        confidenceScore: 0.92,
        confidenceNote: 'Based on certificate expiry dates in LMS records.',
        dedupeKey: `cert-expiry:${now.toISOString().slice(0, 7)}`,
      },
    ];
  }
}
