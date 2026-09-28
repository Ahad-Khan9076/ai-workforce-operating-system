import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AiChatMessage,
  AiCompletionResult,
  AiProvider,
  AiToolDefinition,
} from './ai-provider.interface.js';

@Injectable()
export class OpenAiProvider implements AiProvider {
  readonly code = 'OPENAI';
  private readonly logger = new Logger(OpenAiProvider.name);

  constructor(private readonly config: ConfigService) {}

  private get apiKey() {
    return this.config.get<string>('ai.openAiApiKey');
  }

  async complete(input: {
    model: string;
    messages: AiChatMessage[];
    tools: AiToolDefinition[];
  }): Promise<AiCompletionResult> {
    const key = this.apiKey;
    if (!key) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const body = {
      model: input.model,
      messages: input.messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
        ...(m.name ? { name: m.name } : {}),
      })),
      tools: input.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      })),
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`OpenAI error: ${response.status} ${errText}`);
      throw new Error('AI provider request failed');
    }

    const json = (await response.json()) as {
      model: string;
      choices: Array<{
        message: {
          content?: string;
          tool_calls?: Array<{
            id: string;
            function: { name: string; arguments: string };
          }>;
        };
      }>;
    };

    const message = json.choices[0]?.message;
    const toolCalls =
      message?.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>,
      })) ?? [];

    return {
      providerCode: this.code,
      model: json.model ?? input.model,
      content: message?.content ?? '',
      toolCalls,
    };
  }
}
