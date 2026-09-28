import { PERMISSIONS, type PermissionCode } from '../../../common/constants/permissions.js';
import type { AiToolDefinition } from '../providers/ai-provider.interface.js';

export interface CopilotToolMeta {
  code: string;
  description: string;
  requiresConfirmation: boolean;
  permissions: PermissionCode[];
  parameters: Record<string, unknown>;
}

export const COPILOT_TOOLS: CopilotToolMeta[] = [
  {
    code: 'get_headcount',
    description: 'Get active and total employee headcount for the organization.',
    requiresConfirmation: false,
    permissions: [PERMISSIONS.EMPLOYEE_READ],
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    code: 'search_employees',
    description: 'Search employees by name, email, or status. Results respect RBAC scope.',
    requiresConfirmation: false,
    permissions: [PERMISSIONS.EMPLOYEE_READ],
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        status: { type: 'string' },
        departmentName: { type: 'string' },
        limit: { type: 'number' },
      },
    },
  },
  {
    code: 'get_employee',
    description: 'Get a single employee profile by id.',
    requiresConfirmation: false,
    permissions: [PERMISSIONS.EMPLOYEE_READ],
    parameters: {
      type: 'object',
      properties: { employeeId: { type: 'string' } },
      required: ['employeeId'],
    },
  },
  {
    code: 'get_attendance',
    description: 'Attendance summary: late, absence, overtime aggregates for a period.',
    requiresConfirmation: false,
    permissions: [PERMISSIONS.ATTENDANCE_READ],
    parameters: {
      type: 'object',
      properties: {
        departmentName: { type: 'string' },
        days: { type: 'number' },
      },
    },
  },
  {
    code: 'get_leave_balance',
    description: 'Leave balances for an employee (self or scoped employee).',
    requiresConfirmation: false,
    permissions: [PERMISSIONS.LEAVE_READ],
    parameters: {
      type: 'object',
      properties: { employeeId: { type: 'string' } },
    },
  },
  {
    code: 'get_leave_requests',
    description: 'List leave requests in scope, optionally filtered by status.',
    requiresConfirmation: false,
    permissions: [PERMISSIONS.LEAVE_READ],
    parameters: {
      type: 'object',
      properties: { status: { type: 'string' } },
    },
  },
  {
    code: 'get_payroll_summary',
    description: 'High-level payroll period summary (no individual salaries unless permitted).',
    requiresConfirmation: false,
    permissions: [PERMISSIONS.PAYROLL_READ],
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    code: 'get_training_status',
    description: 'Incomplete or overdue training enrollments in scope.',
    requiresConfirmation: false,
    permissions: [PERMISSIONS.TRAINING_READ],
    parameters: {
      type: 'object',
      properties: { overdueOnly: { type: 'boolean' } },
    },
  },
  {
    code: 'get_performance_summary',
    description: 'Recent performance review ratings summary for scoped employees.',
    requiresConfirmation: false,
    permissions: [PERMISSIONS.PERFORMANCE_READ],
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    code: 'get_skill_gaps',
    description: 'Skill gap counts and top gaps for the organization or department.',
    requiresConfirmation: false,
    permissions: [PERMISSIONS.ANALYTICS_READ],
    parameters: {
      type: 'object',
      properties: { departmentName: { type: 'string' } },
    },
  },
  {
    code: 'get_workforce_risks',
    description: 'Open workforce risks with severity and rule codes.',
    requiresConfirmation: false,
    permissions: [PERMISSIONS.ANALYTICS_READ],
    parameters: {
      type: 'object',
      properties: { limit: { type: 'number' } },
    },
  },
  {
    code: 'get_hiring_pipeline',
    description: 'Open jobs and application counts by stage.',
    requiresConfirmation: false,
    permissions: [PERMISSIONS.RECRUITMENT_READ],
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    code: 'create_leave_request',
    description: 'Create a leave request (requires user confirmation before execution).',
    requiresConfirmation: true,
    permissions: [PERMISSIONS.LEAVE_READ],
    parameters: {
      type: 'object',
      properties: {
        leaveTypeCode: { type: 'string' },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        reason: { type: 'string' },
        employeeId: { type: 'string' },
      },
      required: ['leaveTypeCode', 'startDate', 'endDate'],
    },
  },
  {
    code: 'approve_leave_request',
    description: 'Approve a pending leave request (requires confirmation).',
    requiresConfirmation: true,
    permissions: [PERMISSIONS.LEAVE_APPROVE],
    parameters: {
      type: 'object',
      properties: { requestId: { type: 'string' }, note: { type: 'string' } },
      required: ['requestId'],
    },
  },
  {
    code: 'create_manager_checkin',
    description: 'Create a manager check-in timeline note for an employee (requires confirmation).',
    requiresConfirmation: true,
    permissions: [PERMISSIONS.EMPLOYEE_UPDATE],
    parameters: {
      type: 'object',
      properties: {
        employeeId: { type: 'string' },
        title: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['employeeId', 'title'],
    },
  },
  {
    code: 'send_notification',
    description: 'Queue an internal notification record for an employee (requires confirmation).',
    requiresConfirmation: true,
    permissions: [PERMISSIONS.EMPLOYEE_UPDATE],
    parameters: {
      type: 'object',
      properties: {
        employeeId: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['employeeId', 'subject', 'body'],
    },
  },
  {
    code: 'assign_training',
    description: 'Enroll an employee in a course (requires confirmation).',
    requiresConfirmation: true,
    permissions: [PERMISSIONS.TRAINING_MANAGE],
    parameters: {
      type: 'object',
      properties: { employeeId: { type: 'string' }, courseId: { type: 'string' } },
      required: ['employeeId', 'courseId'],
    },
  },
  {
    code: 'create_employee_task',
    description: 'Create an onboarding-style task for an employee (requires confirmation).',
    requiresConfirmation: true,
    permissions: [PERMISSIONS.EMPLOYEE_UPDATE],
    parameters: {
      type: 'object',
      properties: {
        employeeId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['employeeId', 'title'],
    },
  },
];

export function toAiToolDefinitions(): AiToolDefinition[] {
  return COPILOT_TOOLS.map((t) => ({
    name: t.code,
    description: t.description,
    parameters: t.parameters,
  }));
}

export function getToolMeta(code: string) {
  return COPILOT_TOOLS.find((t) => t.code === code);
}
