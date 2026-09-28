import { Module } from '@nestjs/common';
import { MembersController } from './members.controller.js';
import { MembersService } from './members.service.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [AuditModule],
  controllers: [MembersController],
  providers: [MembersService],
})
export class MembersModule {}
