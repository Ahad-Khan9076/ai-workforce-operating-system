import { Module } from '@nestjs/common';
import { InvitationsController } from './invitations.controller.js';
import { InvitationsService } from './invitations.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [InvitationsController],
  providers: [InvitationsService],
})
export class InvitationsModule {}
