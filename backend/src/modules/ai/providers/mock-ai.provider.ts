import type {
  AiChatMessage,
  AiCompletionResult,
  AiProvider,
  AiToolDefinition,
} from './ai-provider.interface.js';

function lastUserMessage(messages: AiChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === 'user') return messages[i]!.content;
  }
  return '';
}

function pickTool(
  text: string,
  tools: AiToolDefinition[],
): { name: string; arguments: Record<string, unknown> } | null {
  const q = text.toLowerCase();
  const has = (name: string) => tools.some((t) => t.name === name);

  if ((q.includes('how many') && q.includes('employee')) || q.includes('headcount')) {
    return has('get_headcount') ? { name: 'get_headcount', arguments: {} } : null;
  }
  if (q.includes('on leave') || q.includes('who is on leave')) {
    return has('search_employees')
      ? { name: 'search_employees', arguments: { status: 'ON_LEAVE', limit: 25 } }
      : null;
  }
  if (q.includes('overtime')) {
    const deptMatch = q.match(/engineering|sales|marketing|support/i);
    return has('get_attendance')
      ? {
          name: 'get_attendance',
          arguments: {
            days: 30,
            ...(deptMatch ? { departmentName: deptMatch[0] } : {}),
          },
        }
      : null;
  }
  if (q.includes('training') || q.includes('overdue')) {
    return has('get_training_status')
      ? { name: 'get_training_status', arguments: { overdueOnly: q.includes('overdue') } }
      : null;
  }
  if (q.includes('risk')) {
    return has('get_workforce_risks') ? { name: 'get_workforce_risks', arguments: { limit: 15 } } : null;
  }
  if (q.includes('skill')) {
    const deptMatch = q.match(/engineering|sales|marketing|support/i);
    return has('get_skill_gaps')
      ? {
          name: 'get_skill_gaps',
          arguments: deptMatch ? { departmentName: deptMatch[0] } : {},
        }
      : null;
  }
  if (q.includes('hiring') || q.includes('pipeline') || q.includes('recruitment')) {
    return has('get_hiring_pipeline') ? { name: 'get_hiring_pipeline', arguments: {} } : null;
  }
  if (q.includes('leave balance') || q.includes('my leave')) {
    return has('get_leave_balance') ? { name: 'get_leave_balance', arguments: {} } : null;
  }
  if (q.includes('payroll')) {
    return has('get_payroll_summary') ? { name: 'get_payroll_summary', arguments: {} } : null;
  }
  if (q.includes('performance')) {
    return has('get_performance_summary') ? { name: 'get_performance_summary', arguments: {} } : null;
  }
  if (q.includes('focus') || q.includes('hr focus')) {
    return has('get_workforce_risks')
      ? { name: 'get_workforce_risks', arguments: { limit: 5 } }
      : null;
  }
  if (q.includes('check-in') || q.includes('check in')) {
    return has('create_manager_checkin')
      ? {
          name: 'create_manager_checkin',
          arguments: {
            employeeId: 'pending-user-selection',
            title: 'Manager check-in',
            notes: text,
          },
        }
      : null;
  }
  return has('get_headcount') ? { name: 'get_headcount', arguments: {} } : null;
}

export class MockAiProvider implements AiProvider {
  readonly code = 'MOCK';

  async complete(input: {
    model: string;
    messages: AiChatMessage[];
    tools: AiToolDefinition[];
  }): Promise<AiCompletionResult> {
    const userText = lastUserMessage(input.messages);

    const priorTool = input.messages.filter((m) => m.role === 'tool').at(-1);
    if (priorTool && (userText.includes('why') || userText.includes('increase'))) {
      return {
        providerCode: this.code,
        model: input.model,
        content:
          'Based on the attendance and overtime data already retrieved, the increase is likely driven by higher overtime minutes in that department over the last 30 days. I only use platform tool results—if you need a deeper breakdown, ask me to refresh the attendance summary for a specific department.',
        toolCalls: [],
      };
    }

    const picked = pickTool(userText, input.tools);
    if (picked) {
      const isWrite = [
        'create_leave_request',
        'approve_leave_request',
        'create_manager_checkin',
        'send_notification',
        'assign_training',
        'create_employee_task',
      ].includes(picked.name);

      if (isWrite) {
        return {
          providerCode: this.code,
          model: input.model,
          content: `I can prepare "${picked.name}" for you. Please review and confirm the proposed action.`,
          toolCalls: [
            {
              id: `call_${Date.now()}`,
              name: picked.name,
              arguments: picked.arguments,
            },
          ],
        };
      }

      return {
        providerCode: this.code,
        model: input.model,
        content: 'Let me pull the latest workforce data for your question.',
        toolCalls: [
          {
            id: `call_${Date.now()}`,
            name: picked.name,
            arguments: picked.arguments,
          },
        ],
      };
    }

    return {
      providerCode: this.code,
      model: input.model,
      content:
        'I can help with headcount, leave, attendance, overtime, training, risks, skills, hiring, and performance—scoped to your permissions. Try one of the suggested prompts.',
      toolCalls: [],
    };
  }

  async stream(input: {
    model: string;
    messages: AiChatMessage[];
    tools: AiToolDefinition[];
    onDelta: (text: string) => void;
  }): Promise<AiCompletionResult> {
    const result = await this.complete(input);
    if (result.content) {
      const chunks = result.content.match(/.{1,24}/g) ?? [result.content];
      for (const chunk of chunks) {
        input.onDelta(chunk);
      }
    }
    return result;
  }
}
