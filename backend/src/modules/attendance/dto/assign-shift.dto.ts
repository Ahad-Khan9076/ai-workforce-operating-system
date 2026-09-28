import { IsDateString, IsOptional, IsString } from 'class-validator';

export class AssignShiftDto {
  @IsString()
  employeeId!: string;

  @IsString()
  shiftTemplateId!: string;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
