import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiActionStatus,
  AiMessageRole,
  AiToolCallStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import { AiProviderFactory } from '../providers/ai-provider.factory.js';
import type { AiChatMessage } from '../providers/ai-provider.interface.js';
import { toAiToolDefinitions, getToolMeta } from '../tools/copilot-tool.registry.js';
import { CopilotToolExecutor } from '../tools/copilot-tool.executor.js';
import { resolveCopilotMode, suggestedPrompts } from './copilot-mode.util.js';
import { AiAuditService } from '../ai-audit.service.js';

const SYSTEM_PROMPT = `You are the AI Workforce Copilot for a multi-tenant HR platform.
Use tools for all factual workforce data. Never invent counts, names, or metrics.
If a tool fails or returns no data, say so explicitly.
For write operations, propose actions and wait for user confirmation.
Respect that users only see data their role permits.`;

@Injectable()
export class CopilotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: AiProviderFactory,
    private readonly toolExecutor: CopilotToolExecutor,
    private readonly config: ConfigService,
    private readonly aiAudit: AiAuditService,
  ) {}

  getSuggestedPrompts(user: AuthenticatedUser) {
    return suggestedPrompts(resolveCopilotMode(user.roleCode));
  }

  async listConversations(user: AuthenticatedUser) {
    return this.prisma.aiConversation.findMany({
      where: { organizationId: user.organizationId!, userId: user.userId },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });
  }

  async createConversation(user: AuthenticatedUser, title?: string) {
    const mode = resolveCopilotMode(user.roleCode);
    const modelName = this.config.get<string>('ai.defaultModel') ?? 'gpt-4o-mini';
    let model = await this.prisma.aiModel.findFirst({
      where: { providerCode: 'MOCK', modelName, organizationId: null },
    });
    if (!model) {
      model = await this.prisma.aiModel.create({
        data: {
          providerCode: 'MOCK',
          modelName,
          displayName: modelName,
          isDefault: true,
        },
      });
    }
    return this.prisma.aiConversation.create({
      data: {
        organizationId: user.organizationId!,
        userId: user.userId,
        mode,
        title: title ?? 'New conversation',
        modelId: model.id,
      },
    });
  }

  async getConversation(user: AuthenticatedUser, conversationId: string) {
    const conv = await this.prisma.aiConversation.findFirst({
      where: {
        id: conversationId,
        organizationId: user.organizationId!,
        userId: user.userId,
      },
      include: {
        model: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            toolCalls: true,
          },
        },
        actions: { where: { status: AiActionStatus.PENDING } },
      },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }

  async sendMessage(
    user: AuthenticatedUser,
    conversationId: string,
    content: string,
    stream?: { onDelta: (text: string) => void },
  ) {
    const conversation = await this.getConversation(user, conversationId);
    const provider = this.providerFactory.getProvider();
    const model =
      conversation.model?.modelName ??
      this.config.get<string>('ai.defaultModel') ??
      'gpt-4o-mini';

    await this.prisma.aiMessage.create({
      data: {
        conversationId,
        role: AiMessageRole.USER,
        content,
      },
    });

    const history = await this.buildChatHistory(conversationId);
    const tools = toAiToolDefinitions();
    const toolResults: Array<{ callId: string; content: string }> = [];
    const pendingActions: Array<{ id: string; summary: string; toolCode: string }> = [];
    let assistantContent = '';
    let iterations = 0;

    while (iterations < 4) {
      iterations++;
      const completion = stream
        ? await provider.stream?.({
            model,
            messages: history,
            tools,
            onDelta: stream.onDelta,
          }) ?? (await provider.complete({ model, messages: history, tools }))
        : await provider.complete({ model, messages: history, tools });

      assistantContent = completion.content;

      const assistantMsg = await this.prisma.aiMessage.create({
        data: {
          conversationId,
          role: AiMessageRole.ASSISTANT,
          content: completion.content || '(Processing tools…)',
          metadata: {
            provider: completion.providerCode,
            model: completion.model,
          } as Prisma.InputJsonValue,
        },
      });

      if (completion.toolCalls.length === 0) {
        break;
      }

      let needsFollowUp = false;
      for (const call of completion.toolCalls) {
        const meta = getToolMeta(call.name);
        const toolRow = await this.prisma.aiTool.findFirst({
          where: { code: call.name, organizationId: null },
        });

        const toolCallRow = await this.prisma.aiToolCall.create({
          data: {
            messageId: assistantMsg.id,
            toolId: toolRow?.id,
            toolCode: call.name,
            arguments: call.arguments as Prisma.InputJsonValue,
            status: AiToolCallStatus.PENDING,
          },
        });

        if (meta?.requiresConfirmation) {
          const summary = this.toolExecutor.buildActionSummary(call.name, call.arguments);
          const action = await this.prisma.aiAction.create({
            data: {
              organizationId: user.organizationId!,
              conversationId,
              toolCallId: toolCallRow.id,
              toolCode: call.name,
              payload: call.arguments as Prisma.InputJsonValue,
              summary,
              status: AiActionStatus.PENDING,
            },
          });
          await this.prisma.aiToolCall.update({
            where: { id: toolCallRow.id },
            data: { status: AiToolCallStatus.REQUIRES_CONFIRMATION },
          });
          pendingActions.push({ id: action.id, summary, toolCode: call.name });
          assistantContent = `${completion.content}\n\nProposed action: ${summary}. Confirm or reject in the action card.`;
          await this.prisma.aiMessage.update({
            where: { id: assistantMsg.id },
            data: { content: assistantContent },
          });
          continue;
        }

        const result = await this.toolExecutor.executeRead(
          user,
          call.name,
          call.arguments,
          conversationId,
        );
        const resultJson = JSON.stringify(result);
        toolResults.push({ callId: call.id, content: resultJson });

        await this.prisma.aiToolCall.update({
          where: { id: toolCallRow.id },
          data: {
            status: result.ok ? AiToolCallStatus.SUCCESS : AiToolCallStatus.FAILED,
            result: result as unknown as Prisma.InputJsonValue,
            errorMessage: result.error,
          },
        });

        await this.prisma.aiMessage.create({
          data: {
            conversationId,
            role: AiMessageRole.TOOL,
            content: resultJson,
            metadata: { toolCallId: call.id, toolCode: call.name } as Prisma.InputJsonValue,
          },
        });

        history.push({
          role: 'assistant',
          content: completion.content || '',
        });
        history.push({
          role: 'tool',
          content: resultJson,
          toolCallId: call.id,
          name: call.name,
        });
        needsFollowUp = true;
      }

      if (pendingActions.length > 0 && !needsFollowUp) {
        break;
      }
      if (!needsFollowUp) {
        break;
      }
    }

    if (toolResults.length > 0 && pendingActions.length === 0) {
      const synthesis = await provider.complete({
        model,
        messages: [
          ...history,
          {
            role: 'user',
            content:
              'Summarize the tool results above for the user in clear prose. Use only numbers from tool JSON. If data is missing, say unavailable.',
          },
        ],
        tools: [],
      });
      assistantContent = synthesis.content;
      await this.prisma.aiMessage.create({
        data: {
          conversationId,
          role: AiMessageRole.ASSISTANT,
          content: assistantContent,
        },
      });
      if (stream) {
        stream.onDelta(`\n${assistantContent}`);
      }
    }

    await this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    await this.aiAudit.log({
      organizationId: user.organizationId!,
      conversationId,
      userId: user.userId,
      actionType: 'CHAT_TURN',
      success: true,
      metadata: { pendingActions: pendingActions.length },
    });

    return {
      content: assistantContent,
      pendingActions,
      toolResults,
    };
  }

  async confirmAction(user: AuthenticatedUser, actionId: string) {
    const action = await this.prisma.aiAction.findFirst({
      where: { id: actionId, organizationId: user.organizationId! },
      include: { conversation: true, toolCall: true },
    });
    if (!action) throw new NotFoundException('Action not found');
    if (action.conversation.userId !== user.userId) {
      throw new ForbiddenException('Not your conversation');
    }
    if (action.status !== AiActionStatus.PENDING) {
      throw new BadRequestException('Action is not pending');
    }

    const payload = action.payload as Record<string, unknown>;
    const result = await this.toolExecutor.executeWrite(
      user,
      action.toolCode,
      payload,
      action.conversationId,
    );

    await this.prisma.aiAction.update({
      where: { id: actionId },
      data: {
        status: result.ok ? AiActionStatus.EXECUTED : AiActionStatus.FAILED,
        confirmedAt: new Date(),
        executedAt: new Date(),
        result: result as unknown as Prisma.InputJsonValue,
        errorMessage: result.error,
      },
    });

    if (action.toolCallId) {
      await this.prisma.aiToolCall.update({
        where: { id: action.toolCallId },
        data: {
          status: result.ok ? AiToolCallStatus.SUCCESS : AiToolCallStatus.FAILED,
          result: result as unknown as Prisma.InputJsonValue,
          errorMessage: result.error,
        },
      });
    }

    await this.prisma.aiMessage.create({
      data: {
        conversationId: action.conversationId,
        role: AiMessageRole.ASSISTANT,
        content: result.ok
          ? `Action completed: ${action.summary}`
          : `Action failed: ${result.error ?? 'Unknown error'}`,
      },
    });

    return { actionId, ...result };
  }

  async rejectAction(user: AuthenticatedUser, actionId: string) {
    const action = await this.prisma.aiAction.findFirst({
      where: { id: actionId, organizationId: user.organizationId! },
      include: { conversation: true },
    });
    if (!action) throw new NotFoundException('Action not found');
    if (action.conversation.userId !== user.userId) {
      throw new ForbiddenException('Not your conversation');
    }
    await this.prisma.aiAction.update({
      where: { id: actionId },
      data: { status: AiActionStatus.REJECTED },
    });
    return { actionId, status: AiActionStatus.REJECTED };
  }

  private async buildChatHistory(conversationId: string): Promise<AiChatMessage[]> {
    const rows = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 40,
    });
    const messages: AiChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }];
    for (const row of rows) {
      if (row.role === AiMessageRole.USER) {
        messages.push({ role: 'user', content: row.content });
      } else if (row.role === AiMessageRole.ASSISTANT) {
        messages.push({ role: 'assistant', content: row.content });
      } else if (row.role === AiMessageRole.TOOL) {
        const meta = row.metadata as { toolCallId?: string; toolCode?: string } | null;
        messages.push({
          role: 'tool',
          content: row.content,
          toolCallId: meta?.toolCallId,
          name: meta?.toolCode,
        });
      }
    }
    return messages;
  }
}
