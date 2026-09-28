import { SalaryComponentType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreatePayrollAdjustmentDto {
  @IsString()
  employeeId!: string;

  @IsString()
  @MinLength(2)
  label!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsEnum(SalaryComponentType)
  componentType!: SalaryComponentType;

  @IsOptional()
  @IsString()
  componentId?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
