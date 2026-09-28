import { AttendanceStatus } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class CalendarQueryDto {
  @IsIn(['month', 'week', 'day'])
  view!: 'month' | 'week' | 'day';

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  anchor!: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;
}
