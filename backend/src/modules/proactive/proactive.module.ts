import { Module } from '@nestjs/common';
import { ProactiveController } from './proactive.controller.js';
import { ActionCenterService } from './action-center.service.js';
import { RecommendationEngineService } from './recommendation/recommendation-engine.service.js';
import { AutomationEngineService } from './automation/automation-engine.service.js';

@Module({
  controllers: [ProactiveController],
  providers: [
    ActionCenterService,
    RecommendationEngineService,
    AutomationEngineService,
  ],
  exports: [AutomationEngineService, RecommendationEngineService],
})
export class ProactiveModule {}
