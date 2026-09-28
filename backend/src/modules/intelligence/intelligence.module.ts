import { Module } from '@nestjs/common';
import { IntelligenceController } from './intelligence.controller.js';
import { IntelligenceService } from './intelligence.service.js';
import { RiskEngineService } from './risk/risk-engine.service.js';
import { TalentMatchingService } from './talent-matching.service.js';
import { WorkforceInsightsService } from './workforce-insights.service.js';
import { IntelligenceDashboardService } from './intelligence-dashboard.service.js';

@Module({
  controllers: [IntelligenceController],
  providers: [
    IntelligenceService,
    RiskEngineService,
    TalentMatchingService,
    WorkforceInsightsService,
    IntelligenceDashboardService,
  ],
  exports: [IntelligenceService],
})
export class IntelligenceModule {}
