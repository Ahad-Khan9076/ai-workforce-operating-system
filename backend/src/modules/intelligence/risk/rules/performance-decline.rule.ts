import {
  PerformanceReviewStatus,
  WorkforceRiskCategory,
  WorkforceRiskSeverity,
} from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service.js';
import type { WorkforceRiskRule } from '../risk-rule.types.js';

const MIN_REVIEWS = 2;
const RATING_DROP = 0.5;

function avgRating(ratings: number[]) {
  if (ratings.length === 0) return null;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}

export function createPerformanceDeclineRule(
  prisma: PrismaService,
): WorkforceRiskRule {
  return {
    code: 'PERFORMANCE_DECLINE',
    description:
      'Flags when average review feedback rating drops by at least 0.5 across the last two finalized cycles vs the prior two.',
    async detect(ctx) {
      const reviews = await prisma.performanceReview.findMany({
        where: {
          organizationId: ctx.organizationId,
          status: PerformanceReviewStatus.FINALIZED,
        },
        orderBy: { finalizedAt: 'desc' },
        include: {
          feedback: { select: { rating: true } },
          employee: { select: { departmentId: true } },
        },
      });

      const byEmployee = new Map<string, typeof reviews>();
      for (const r of reviews) {
        const list = byEmployee.get(r.employeeId) ?? [];
        list.push(r);
        byEmployee.set(r.employeeId, list);
      }

      const risks: import('../risk-rule.types.js').DetectedRisk[] = [];

      for (const [employeeId, list] of byEmployee) {
        if (list.length < MIN_REVIEWS * 2) continue;
        const recent = list.slice(0, MIN_REVIEWS);
        const prior = list.slice(MIN_REVIEWS, MIN_REVIEWS * 2);

        const recentRatings = recent.flatMap((r) =>
          r.feedback.map((f) => f.rating).filter((x): x is number => x != null),
        );
        const priorRatings = prior.flatMap((r) =>
          r.feedback.map((f) => f.rating).filter((x): x is number => x != null),
        );
        const recentAvg = avgRating(recentRatings);
        const priorAvg = avgRating(priorRatings);
        if (recentAvg == null || priorAvg == null) continue;
        const drop = priorAvg - recentAvg;
        if (drop < RATING_DROP) continue;

        risks.push({
          category: WorkforceRiskCategory.PERFORMANCE,
          severity:
            drop >= 1 ? WorkforceRiskSeverity.HIGH : WorkforceRiskSeverity.MEDIUM,
          title: 'Performance rating trend',
          summary: `Rule PERFORMANCE_DECLINE: average feedback rating fell from ${priorAvg.toFixed(2)} to ${recentAvg.toFixed(2)} (drop ${drop.toFixed(2)}; threshold ${RATING_DROP}).`,
          ruleCode: 'PERFORMANCE_DECLINE',
          evidence: {
            priorAverageRating: priorAvg,
            recentAverageRating: recentAvg,
            ratingDrop: drop,
            reviewsCompared: MIN_REVIEWS,
            thresholdRatingDrop: RATING_DROP,
          },
          employeeId,
          departmentId: list[0]?.employee.departmentId ?? undefined,
        });
      }

      return risks;
    },
  };
}
