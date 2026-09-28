import { Module } from '@nestjs/common';
import { RecruitmentController } from './recruitment.controller.js';
import { RecruitmentService } from './recruitment.service.js';
import { DefaultCvDocumentProcessor } from './cv/default-cv-document.processor.js';
import { MockCandidateScreeningProvider } from './ai/mock-candidate-screening.provider.js';
import { RecruitmentEmailService } from './recruitment-email.service.js';
import { MailRecruitmentEmailProvider } from './email/mail-recruitment-email.provider.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { OnboardingModule } from '../onboarding/onboarding.module.js';

@Module({
  imports: [EmployeesModule, NotificationsModule, OnboardingModule],
  controllers: [RecruitmentController],
  providers: [
    RecruitmentService,
    DefaultCvDocumentProcessor,
    MockCandidateScreeningProvider,
    RecruitmentEmailService,
    MailRecruitmentEmailProvider,
  ],
})
export class RecruitmentModule {}
