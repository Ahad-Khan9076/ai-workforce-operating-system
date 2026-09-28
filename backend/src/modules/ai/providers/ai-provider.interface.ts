export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  name?: string;
}

export interface AiToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AiToolCallRequest {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AiCompletionResult {
  content: string;
  toolCalls: AiToolCallRequest[];
  model: string;
  providerCode: string;
}

export interface AiProvider {
  readonly code: string;
  complete(input: {
    model: string;
    messages: AiChatMessage[];
    tools: AiToolDefinition[];
  }): Promise<AiCompletionResult>;
  stream?(input: {
    model: string;
    messages: AiChatMessage[];
    tools: AiToolDefinition[];
    onDelta: (text: string) => void;
  }): Promise<AiCompletionResult>;
}
