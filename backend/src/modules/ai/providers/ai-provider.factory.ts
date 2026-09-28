import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiProvider } from './ai-provider.interface.js';
import { MockAiProvider } from './mock-ai.provider.js';
import { OpenAiProvider } from './openai-ai.provider.js';

@Injectable()
export class AiProviderFactory {
  private readonly mock = new MockAiProvider();

  constructor(
    private readonly config: ConfigService,
    private readonly openAi: OpenAiProvider,
  ) {}

  getProvider(): AiProvider {
    const mode = this.config.get<string>('ai.provider') ?? 'auto';
    const hasKey = Boolean(this.config.get<string>('ai.openAiApiKey'));
    if (mode === 'mock' || (mode === 'auto' && !hasKey)) {
      return this.mock;
    }
    if (mode === 'openai' || (mode === 'auto' && hasKey)) {
      return this.openAi;
    }
    return this.mock;
  }
}
