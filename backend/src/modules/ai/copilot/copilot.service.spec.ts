import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiActionStatus } from '@prisma/client';
import { CopilotService } from './copilot.service.js';

describe('CopilotService action confirmation', () => {
  const prisma = {
    aiAction: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    aiToolCall: { update: vi.fn() },
    aiMessage: { create: vi.fn() },
  };
  const toolExecutor = {
    executeWrite: vi.fn(),
    buildActionSummary: vi.fn(),
  };

  let service: CopilotService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CopilotService(
      prisma as never,
      { getProvider: vi.fn() } as never,
      toolExecutor as never,
      { get: vi.fn() } as never,
      { log: vi.fn() } as never,
    );
  });

  it('executes write only after confirm', async () => {
    prisma.aiAction.findFirst.mockResolvedValue({
      id: 'act-1',
      organizationId: 'org-1',
      conversationId: 'conv-1',
      toolCode: 'create_manager_checkin',
      payload: { employeeId: 'e1', title: 'Check-in' },
      summary: 'Check-in',
      status: AiActionStatus.PENDING,
      toolCallId: 'tc-1',
      conversation: { userId: 'user-1' },
    });
    toolExecutor.executeWrite.mockResolvedValue({ ok: true, data: { timelineEventId: 'ev-1' } });
    prisma.aiAction.update.mockResolvedValue({});

    const user = { userId: 'user-1', organizationId: 'org-1', permissions: [] } as never;
    const result = await service.confirmAction(user, 'act-1');
    expect(toolExecutor.executeWrite).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it('rejects foreign conversation action', async () => {
    prisma.aiAction.findFirst.mockResolvedValue({
      id: 'act-1',
      organizationId: 'org-1',
      conversation: { userId: 'other-user' },
      status: AiActionStatus.PENDING,
    });
    await expect(
      service.confirmAction(
        { userId: 'user-1', organizationId: 'org-1', permissions: [] } as never,
        'act-1',
      ),
    ).rejects.toThrow('Not your conversation');
  });
});
