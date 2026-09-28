import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsString()
  leaveTypeId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;
}
