import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CertificateStatus,
  EnrollmentStatus,
  EmploymentType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { notFoundInTenant } from '../../common/utils/tenant.util.js';
import { gradeObjectiveAssessment } from './assessment-grader.js';
import { resolveCertificateStatus } from './certificate-status.util.js';

@Injectable()
export class TrainingService {
  constructor(private readonly prisma: PrismaService) {}

  listCourses(organizationId: string) {
    return this.prisma.course.findMany({
      where: { organizationId },
      include: { modules: { include: { lessons: true } }, assessments: true },
      orderBy: { title: 'asc' },
    });
  }

  createCourse(organizationId: string, data: { title: string; description?: string }) {
    return this.prisma.course.create({
      data: { organizationId, ...data },
    });
  }

  async publishCourse(organizationId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId },
    });
    if (!course) notFoundInTenant('Course');
    return this.prisma.course.update({
      where: { id: courseId },
      data: { isPublished: true },
    });
  }

  createAssignment(
    organizationId: string,
    data: {
      courseId: string;
      roleCode?: string;
      departmentId?: string;
      employeeId?: string;
      isRequired?: boolean;
    },
  ) {
    return this.prisma.trainingAssignment.create({
      data: { organizationId, isRequired: true, ...data },
    });
  }

  async assignRequiredCoursesForEmployee(
    organizationId: string,
    employeeId: string,
    context: {
      roleCode?: string | null;
      departmentId?: string | null;
      employmentType?: EmploymentType | null;
    },
  ) {
    const assignments = await this.prisma.trainingAssignment.findMany({
      where: {
        organizationId,
        isRequired: true,
        OR: [
          { employeeId },
          { departmentId: context.departmentId ?? undefined },
          { roleCode: context.roleCode ?? undefined },
          { employeeId: null, departmentId: null, roleCode: null },
        ],
      },
    });

    const courseIds = [...new Set(assignments.map((a) => a.courseId))];
    for (const courseId of courseIds) {
      await this.enrollEmployee(organizationId, employeeId, courseId);
    }
  }

  async enrollEmployee(organizationId: string, employeeId: string, courseId: string) {
    return this.prisma.employeeEnrollment.upsert({
      where: { employeeId_courseId: { employeeId, courseId } },
      update: {},
      create: {
        organizationId,
        employeeId,
        courseId,
        status: EnrollmentStatus.NOT_STARTED,
      },
    });
  }

  async completeCourse(organizationId: string, enrollmentId: string) {
    const enrollment = await this.prisma.employeeEnrollment.findFirst({
      where: { id: enrollmentId, organizationId },
      include: { course: true },
    });
    if (!enrollment) notFoundInTenant('Enrollment');

    const updated = await this.prisma.employeeEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: EnrollmentStatus.COMPLETED,
        progressPercent: 100,
        completedAt: new Date(),
        startedAt: enrollment.startedAt ?? new Date(),
      },
    });

    await this.issueCertificate(organizationId, enrollment.employeeId, enrollment.courseId);
    return updated;
  }

  async submitAssessment(
    organizationId: string,
    enrollmentId: string,
    assessmentId: string,
    answers: Record<string, string>,
  ) {
    const enrollment = await this.prisma.employeeEnrollment.findFirst({
      where: { id: enrollmentId, organizationId },
    });
    if (!enrollment) notFoundInTenant('Enrollment');

    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, organizationId, courseId: enrollment.courseId },
      include: { questions: true },
    });
    if (!assessment) notFoundInTenant('Assessment');

    const grade = gradeObjectiveAssessment(
      assessment.questions.map((q) => ({ id: q.id, correctAnswer: q.correctAnswer })),
      answers,
      assessment.passingScore,
    );

    const priorAttempts = await this.prisma.assessmentAttempt.count({
      where: { enrollmentId, assessmentId },
    });

    const attempt = await this.prisma.assessmentAttempt.create({
      data: {
        organizationId,
        assessmentId,
        enrollmentId,
        score: grade.score,
        passed: grade.passed,
        answers: answers as Prisma.InputJsonValue,
        attemptNumber: priorAttempts + 1,
      },
    });

    if (grade.passed) {
      await this.prisma.employeeEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: EnrollmentStatus.IN_PROGRESS,
          progressPercent: Math.max(enrollment.progressPercent, grade.score),
          startedAt: enrollment.startedAt ?? new Date(),
        },
      });
    }

    return attempt;
  }

  async issueCertificate(
    organizationId: string,
    employeeId: string,
    courseId: string,
    expiresAt?: Date,
  ) {
    const number = `CERT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const status = resolveCertificateStatus(expiresAt ?? null);
    return this.prisma.trainingCertificate.create({
      data: {
        organizationId,
        employeeId,
        courseId,
        certificateNumber: number,
        expiresAt,
        status,
      },
    });
  }

  async refreshCertificateStatuses(organizationId: string) {
    const certs = await this.prisma.trainingCertificate.findMany({
      where: { organizationId },
    });
    for (const cert of certs) {
      const status = resolveCertificateStatus(cert.expiresAt);
      if (status !== cert.status) {
        await this.prisma.trainingCertificate.update({
          where: { id: cert.id },
          data: { status },
        });
      }
    }
  }

  getDashboard(organizationId: string) {
    return Promise.all([
      this.prisma.course.count({ where: { organizationId, isPublished: true } }),
      this.prisma.employeeEnrollment.count({ where: { organizationId } }),
      this.prisma.employeeEnrollment.count({
        where: { organizationId, status: EnrollmentStatus.COMPLETED },
      }),
      this.prisma.trainingCertificate.count({ where: { organizationId } }),
    ]).then(([publishedCourses, enrollments, completed, certificates]) => ({
      publishedCourses,
      enrollments,
      completedEnrollments: completed,
      certificates,
    }));
  }

  async createAssessmentWithQuestions(
    organizationId: string,
    courseId: string,
    data: {
      title: string;
      passingScore?: number;
      questions: Array<{
        questionType: import('@prisma/client').AssessmentQuestionType;
        prompt: string;
        options?: string[];
        correctAnswer: string;
      }>;
    },
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId },
    });
    if (!course) notFoundInTenant('Course');
    if (data.questions.length === 0) {
      throw new BadRequestException('Assessment requires at least one question');
    }

    const assessment = await this.prisma.assessment.create({
      data: {
        organizationId,
        courseId,
        title: data.title,
        passingScore: data.passingScore ?? 70,
      },
    });

    for (const [index, q] of data.questions.entries()) {
      await this.prisma.assessmentQuestion.create({
        data: {
          assessmentId: assessment.id,
          questionType: q.questionType,
          prompt: q.prompt,
          options: q.options ? (q.options as Prisma.InputJsonValue) : undefined,
          correctAnswer: q.correctAnswer,
          sortOrder: index,
        },
      });
    }

    return this.prisma.assessment.findFirst({
      where: { id: assessment.id },
      include: { questions: true },
    });
  }
}
