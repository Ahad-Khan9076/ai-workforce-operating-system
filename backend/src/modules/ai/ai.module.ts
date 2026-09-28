import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { CopilotController } from './copilot/copilot.controller.js';
import { CopilotService } from './copilot/copilot.service.js';
import { CopilotToolExecutor } from './tools/copilot-tool.executor.js';
import { AiAuditService } from './ai-audit.service.js';
import { AiProviderFactory } from './providers/ai-provider.factory.js';
import { OpenAiProvider } from './providers/openai-ai.provider.js';

@Module({
  imports: [AuditModule],
  controllers: [CopilotController],
  providers: [
    CopilotService,
    CopilotToolExecutor,
    AiAuditService,
    OpenAiProvider,
    AiProviderFactory,
  ],
  exports: [CopilotService],
})
export class AiModule {}
