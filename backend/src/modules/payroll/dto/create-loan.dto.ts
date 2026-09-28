import { IsDateString, IsNumber, IsString, Min } from 'class-validator';

export class CreateEmployeeLoanDto {
  @IsString()
  employeeId!: string;

  @IsNumber()
  @Min(1)
  principalAmount!: number;

  @IsNumber()
  @Min(1)
  installmentAmount!: number;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
