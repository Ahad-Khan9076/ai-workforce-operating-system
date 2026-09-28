import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller.js';
import { PayrollService } from './payroll.service.js';
import { SalaryStructureService } from './salary-structure.service.js';
import { AttendancePayrollDataService } from './attendance-payroll-data.service.js';
import { EmployeeLoanService } from './employee-loan.service.js';
import { PayslipService } from './payslip.service.js';
import { StubPayslipPdfRenderer } from './payslip/stub-payslip-pdf.renderer.js';

@Module({
  controllers: [PayrollController],
  providers: [
    PayrollService,
    SalaryStructureService,
    AttendancePayrollDataService,
    EmployeeLoanService,
    PayslipService,
    StubPayslipPdfRenderer,
  ],
  exports: [PayrollService],
})
export class PayrollModule {}
