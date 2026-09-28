import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller.js';
import { EmployeesService } from './employees.service.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [AuditModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
