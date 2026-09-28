import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import configuration from './config/configuration.js';
import { validateEnv } from './config/env.validation.js';
import { DatabaseModule } from './database/database.module.js';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';
import { TenantGuard } from './common/guards/tenant.guard.js';
import { OrganizationContextGuard } from './common/guards/organization-context.guard.js';
import { RbacModule } from './modules/rbac/rbac.module.js';
import { MembersModule } from './modules/members/members.module.js';
import { InvitationsModule } from './modules/invitations/invitations.module.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { HealthController } from './health.controller.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { OrganizationsModule } from './modules/organizations/organizations.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { EmployeesModule } from './modules/employees/employees.module.js';
import { DepartmentsModule } from './modules/departments/departments.module.js';
import { AttendanceModule } from './modules/attendance/attendance.module.js';
import { LeaveModule } from './modules/leave/leave.module.js';
import { PayrollModule } from './modules/payroll/payroll.module.js';
import { RecruitmentModule } from './modules/recruitment/recruitment.module.js';
import { TrainingModule } from './modules/training/training.module.js';
import { PerformanceModule } from './modules/performance/performance.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { AiModule } from './modules/ai/ai.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { WorkforceModule } from './modules/workforce/workforce.module.js';
import { OnboardingModule } from './modules/onboarding/onboarding.module.js';
import { IntelligenceModule } from './modules/intelligence/intelligence.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    DatabaseModule,
    WorkforceModule,
    RbacModule,
    AuthModule,
    OrganizationsModule,
    MembersModule,
    InvitationsModule,
    UsersModule,
    EmployeesModule,
    DepartmentsModule,
    AttendanceModule,
    LeaveModule,
    PayrollModule,
    RecruitmentModule,
    TrainingModule,
    OnboardingModule,
    PerformanceModule,
    AnalyticsModule,
    IntelligenceModule,
    AiModule,
    NotificationsModule,
    DocumentsModule,
    AuditModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_GUARD,
      useClass: OrganizationContextGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
