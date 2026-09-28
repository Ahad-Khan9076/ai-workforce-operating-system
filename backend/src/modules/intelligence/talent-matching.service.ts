import { Injectable } from '@nestjs/common';
import {
  EmploymentStatus,
  EnrollmentStatus,
  PerformanceReviewStatus,
  SkillProficiency,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { analyzeSkillGaps } from './skill-gap.engine.js';
import { proficiencyLevel } from './skill-proficiency.util.js';

export const TALENT_MATCH_DISCLAIMER =
  'This is an AI-assisted recommendation based on skills, training, performance, and role data. It is not an automatic HR decision—managers and HR should review candidates manually.';

export interface TalentMatchFactor {
  label: string;
  score: number;
  maxScore: number;
  detail: string;
}

export interface TalentMatchCandidate {
  employeeId: string;
  displayName: string;
  currentJobTitle: string | null;
  matchPercent: number;
  factors: TalentMatchFactor[];
  skillGaps: string[];
}

@Injectable()
export class TalentMatchingService {
  constructor(private readonly prisma: PrismaService) {}

  async findCandidatesForProfile(
    organizationId: string,
    profileName: string,
    employeeWhereExtra?: object,
    limit = 20,
  ) {
    const requirements = await this.prisma.roleSkillRequirement.findMany({
      where: { organizationId, profileName },
      include: { skill: { select: { name: true } } },
    });
    if (requirements.length === 0) {
      return {
        profileName,
        disclaimer: TALENT_MATCH_DISCLAIMER,
        requirements: [],
        candidates: [] as TalentMatchCandidate[],
      };
    }

    const employees = await this.prisma.employee.findMany({
      where: {
        organizationId,
        employmentStatus: EmploymentStatus.ACTIVE,
        ...(employeeWhereExtra ?? {}),
      },
      include: {
        jobTitle: { select: { title: true } },
        employeeSkills: { include: { skill: true } },
        enrollments: {
          where: { status: EnrollmentStatus.COMPLETED },
          select: { courseId: true },
        },
      },
    });

    const candidates: TalentMatchCandidate[] = [];

    for (const emp of employees) {
      const analysis = analyzeSkillGaps(
        requirements.map((r) => ({
          skillId: r.skillId,
          skillName: r.skill.name,
          requiredProficiency: r.requiredProficiency,
        })),
        emp.employeeSkills.map((s) => ({
          skillId: s.skillId,
          proficiency: s.proficiency,
        })),
      );

      const skillScore =
        requirements.length === 0
          ? 0
          : Math.round(
              (analysis.strengths.length / requirements.length) * 40,
            );
      const partialCredit = analysis.gaps.reduce((sum, g) => {
        const req = proficiencyLevel(g.requiredProficiency);
        const actual = g.actualProficiency
          ? proficiencyLevel(g.actualProficiency)
          : 0;
        return sum + (actual / req) * (40 / requirements.length);
      }, 0);

      const skillsTotal = Math.min(40, Math.round(skillScore + partialCredit * 0.5));

      const years =
        emp.joinDate != null
          ? (Date.now() - emp.joinDate.getTime()) / (365.25 * 24 * 3600 * 1000)
          : 0;
      const experienceScore = Math.min(15, Math.round(years * 3));

      const reviews = await this.prisma.performanceReview.findMany({
        where: {
          organizationId,
          employeeId: emp.id,
          status: PerformanceReviewStatus.FINALIZED,
        },
        orderBy: { finalizedAt: 'desc' },
        take: 2,
        include: { feedback: { select: { rating: true } } },
      });
      const ratings = reviews.flatMap((r) =>
        r.feedback.map((f) => f.rating).filter((x): x is number => x != null),
      );
      const perfAvg =
        ratings.length > 0
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : null;
      const performanceScore =
        perfAvg != null ? Math.min(20, Math.round((perfAvg / 5) * 20)) : 8;

      const requiredCourses = await this.prisma.trainingAssignment.count({
        where: {
          organizationId,
          isRequired: true,
          OR: [
            { employeeId: emp.id },
            { departmentId: emp.departmentId ?? undefined },
          ],
        },
      });
      const completed = emp.enrollments.length;
      const trainingScore =
        requiredCourses === 0
          ? 10
          : Math.min(15, Math.round((completed / requiredCourses) * 15));

      const titleMatch =
        emp.jobTitle?.title.toLowerCase() === profileName.toLowerCase();
      const roleScore = titleMatch ? 10 : profileName.split(' ').some((w) =>
          emp.jobTitle?.title.toLowerCase().includes(w.toLowerCase()),
        )
          ? 5
          : 0;

      const matchPercent = Math.min(
        100,
        skillsTotal + experienceScore + performanceScore + trainingScore + roleScore,
      );

      candidates.push({
        employeeId: emp.id,
        displayName: `${emp.firstName} ${emp.lastName}`,
        currentJobTitle: emp.jobTitle?.title ?? null,
        matchPercent,
        factors: [
          {
            label: 'Skills fit',
            score: skillsTotal,
            maxScore: 40,
            detail: `${analysis.strengths.length}/${requirements.length} required skills at or above level`,
          },
          {
            label: 'Experience',
            score: experienceScore,
            maxScore: 15,
            detail: `${years.toFixed(1)} years tenure`,
          },
          {
            label: 'Performance',
            score: performanceScore,
            maxScore: 20,
            detail:
              perfAvg != null
                ? `Recent review avg ${perfAvg.toFixed(1)}/5`
                : 'Limited review data—neutral weight applied',
          },
          {
            label: 'Training',
            score: trainingScore,
            maxScore: 15,
            detail: `${completed} completed enrollments vs ${requiredCourses} required assignments`,
          },
          {
            label: 'Role alignment',
            score: roleScore,
            maxScore: 10,
            detail: emp.jobTitle?.title ?? 'No job title',
          },
        ],
        skillGaps: analysis.gaps.map(
          (g) =>
            `${g.skillName}: need ${g.requiredProficiency}, have ${g.actualProficiency ?? 'none'}`,
        ),
      });
    }

    candidates.sort((a, b) => b.matchPercent - a.matchPercent);

    return {
      profileName,
      disclaimer: TALENT_MATCH_DISCLAIMER,
      requirements: requirements.map((r) => ({
        skill: r.skill.name,
        level: r.requiredProficiency as SkillProficiency,
      })),
      candidates: candidates.slice(0, limit),
    };
  }
}
