import { CopilotMode } from '@prisma/client';
import { ROLE_CODES } from '../../../common/constants/permissions.js';

export function resolveCopilotMode(roleCode?: string): CopilotMode {
  if (roleCode === ROLE_CODES.DEPARTMENT_MANAGER) {
    return CopilotMode.MANAGER;
  }
  if (roleCode === ROLE_CODES.EMPLOYEE) {
    return CopilotMode.EMPLOYEE;
  }
  return CopilotMode.HR;
}

export function suggestedPrompts(mode: CopilotMode): string[] {
  if (mode === CopilotMode.EMPLOYEE) {
    return [
      'What is my leave balance?',
      'Show my training progress.',
      'Summarize my recent performance feedback.',
    ];
  }
  if (mode === CopilotMode.MANAGER) {
    return [
      'Who on my team is on leave this week?',
      'Show overtime for my direct reports this month.',
      'Which reports have overdue training?',
      'What workforce risks affect my team?',
    ];
  }
  return [
    'How many employees do we have?',
    'Who is currently on leave?',
    'Which department has the highest overtime?',
    'Show employees with overdue training.',
    'What are our biggest workforce risks?',
    'What should HR focus on today?',
  ];
}
