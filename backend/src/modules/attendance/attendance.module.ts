import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller.js';
import { AttendanceService } from './attendance.service.js';
import { AttendanceCalculationService } from './attendance-calculation.service.js';
import { ShiftsService } from './shifts.service.js';

@Module({
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    AttendanceCalculationService,
    ShiftsService,
  ],
  exports: [AttendanceService],
})
export class AttendanceModule {}
