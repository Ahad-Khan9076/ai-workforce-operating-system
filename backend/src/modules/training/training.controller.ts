import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TrainingService } from './training.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireOrganization } from '../../common/decorators/require-organization.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';

@Controller('training')
@RequireOrganization()
export class TrainingController {
  constructor(private readonly training: TrainingService) {}

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.TRAINING_READ)
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.training.getDashboard(user.organizationId!);
  }

  @Get('courses')
  @RequirePermissions(PERMISSIONS.TRAINING_READ)
  courses(@CurrentUser() user: AuthenticatedUser) {
    return this.training.listCourses(user.organizationId!);
  }

  @Post('courses')
  @RequirePermissions(PERMISSIONS.TRAINING_MANAGE)
  createCourse(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { title: string; description?: string },
  ) {
    return this.training.createCourse(user.organizationId!, body);
  }

  @Post('courses/:courseId/publish')
  @RequirePermissions(PERMISSIONS.TRAINING_MANAGE)
  publish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
  ) {
    return this.training.publishCourse(user.organizationId!, courseId);
  }

  @Post('assignments')
  @RequirePermissions(PERMISSIONS.TRAINING_MANAGE)
  assign(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      courseId: string;
      roleCode?: string;
      departmentId?: string;
      employeeId?: string;
    },
  ) {
    return this.training.createAssignment(user.organizationId!, body);
  }

  @Post('enrollments')
  @RequirePermissions(PERMISSIONS.TRAINING_MANAGE)
  enroll(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { employeeId: string; courseId: string },
  ) {
    return this.training.enrollEmployee(
      user.organizationId!,
      body.employeeId,
      body.courseId,
    );
  }

  @Post('enrollments/:enrollmentId/complete')
  @RequirePermissions(PERMISSIONS.TRAINING_MANAGE)
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('enrollmentId') enrollmentId: string,
  ) {
    return this.training.completeCourse(user.organizationId!, enrollmentId);
  }

  @Post('courses/:courseId/assessments')
  @RequirePermissions(PERMISSIONS.TRAINING_MANAGE)
  createAssessment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
    @Body() body: Parameters<TrainingService['createAssessmentWithQuestions']>[2],
  ) {
    return this.training.createAssessmentWithQuestions(
      user.organizationId!,
      courseId,
      body,
    );
  }

  @Post('enrollments/:enrollmentId/assessments/:assessmentId/submit')
  @RequirePermissions(PERMISSIONS.TRAINING_READ)
  submitAssessment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('enrollmentId') enrollmentId: string,
    @Param('assessmentId') assessmentId: string,
    @Body() body: { answers: Record<string, string> },
  ) {
    return this.training.submitAssessment(
      user.organizationId!,
      enrollmentId,
      assessmentId,
      body.answers,
    );
  }
}
