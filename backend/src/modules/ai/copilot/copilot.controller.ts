import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CopilotService } from './copilot.service.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { RequireOrganization } from '../../../common/decorators/require-organization.decorator.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../../common/constants/permissions.js';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import { SendCopilotMessageDto, CreateConversationDto } from '../dto/copilot.dto.js';

@Controller('ai/copilot')
@RequireOrganization()
@RequirePermissions(PERMISSIONS.AI_USE)
export class CopilotController {
  constructor(private readonly copilot: CopilotService) {}

  @Get('prompts')
  prompts(@CurrentUser() user: AuthenticatedUser) {
    return this.copilot.getSuggestedPrompts(user);
  }

  @Get('conversations')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.copilot.listConversations(user);
  }

  @Post('conversations')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateConversationDto) {
    return this.copilot.createConversation(user, dto.title);
  }

  @Get('conversations/:id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.copilot.getConversation(user, id);
  }

  @Post('conversations/:id/messages')
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SendCopilotMessageDto,
  ) {
    return this.copilot.sendMessage(user, id, dto.content);
  }

  @Post('conversations/:id/messages/stream')
  async stream(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SendCopilotMessageDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const result = await this.copilot.sendMessage(user, id, dto.content, {
        onDelta: (text) => send('delta', { text }),
      });
      send('done', result);
      res.end();
    } catch (err) {
      send('error', {
        message: err instanceof Error ? err.message : 'Stream failed',
      });
      res.end();
    }
  }

  @Post('actions/:actionId/confirm')
  confirm(@CurrentUser() user: AuthenticatedUser, @Param('actionId') actionId: string) {
    return this.copilot.confirmAction(user, actionId);
  }

  @Post('actions/:actionId/reject')
  reject(@CurrentUser() user: AuthenticatedUser, @Param('actionId') actionId: string) {
    return this.copilot.rejectAction(user, actionId);
  }
}
