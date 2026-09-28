import { Module } from '@nestjs/common';
import { LeaveController } from './leave.controller.js';
import { LeaveService } from './leave.service.js';
import { AttendanceModule } from '../attendance/attendance.module.js';
import { ProactiveModule } from '../proactive/proactive.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [AttendanceModule, ProactiveModule, AuditModule],
  controllers: [LeaveController],
  providers: [LeaveService],
})
export class LeaveModule {}
