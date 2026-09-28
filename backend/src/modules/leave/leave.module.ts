import { Module } from '@nestjs/common';
import { LeaveController } from './leave.controller.js';
import { LeaveService } from './leave.service.js';
import { AttendanceModule } from '../attendance/attendance.module.js';

@Module({
  imports: [AttendanceModule],
  controllers: [LeaveController],
  providers: [LeaveService],
})
export class LeaveModule {}
