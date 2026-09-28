import { describe, it, expect } from 'vitest';
import { MockAiProvider } from './mock-ai.provider.js';
import { toAiToolDefinitions } from '../tools/copilot-tool.registry.js';

describe('MockAiProvider', () => {
  const provider = new MockAiProvider();
  const tools = toAiToolDefinitions();

  it('routes headcount questions to get_headcount tool', async () => {
    const result = await provider.complete({
      model: 'mock',
      messages: [{ role: 'user', content: 'How many employees do we have?' }],
      tools,
    });
    expect(result.toolCalls[0]?.name).toBe('get_headcount');
  });

  it('does not return fabricated numeric answer without tool result', async () => {
    const result = await provider.complete({
      model: 'mock',
      messages: [{ role: 'user', content: 'How many employees do we have?' }],
      tools,
    });
    expect(result.content).not.toMatch(/\d+\s+employees/i);
  });
});
