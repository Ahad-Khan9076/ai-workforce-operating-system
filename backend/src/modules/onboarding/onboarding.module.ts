import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller.js';
import { OnboardingService } from './onboarding.service.js';
import { TrainingModule } from '../training/training.module.js';

@Module({
  imports: [TrainingModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
