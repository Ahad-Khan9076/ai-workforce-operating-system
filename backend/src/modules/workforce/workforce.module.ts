import { Global, Module } from '@nestjs/common';
import { EmployeeScopeService } from './employee-scope.service.js';

@Global()
@Module({
  providers: [EmployeeScopeService],
  exports: [EmployeeScopeService],
})
export class WorkforceModule {}
