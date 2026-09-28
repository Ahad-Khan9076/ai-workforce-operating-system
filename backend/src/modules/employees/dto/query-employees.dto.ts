import { EmploymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryEmployeesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsEnum(EmploymentStatus)
  status?: EmploymentStatus;

  @IsOptional()
  @IsString()
  jobTitleId?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsIn(['firstName', 'lastName', 'joinDate', 'createdAt', 'employeeNumber'])
  sortBy?: 'firstName' | 'lastName' | 'joinDate' | 'createdAt' | 'employeeNumber' =
    'lastName';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}
