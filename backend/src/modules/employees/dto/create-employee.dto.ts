import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { EmploymentStatus, EmploymentType } from '@prisma/client';

export class CreateEmployeeDto {
  @IsOptional()
  @IsString()
  employeeNumber?: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsOptional()
  @IsString()
  preferredName?: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  jobTitleId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsString()
  membershipId?: string;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsOptional()
  @IsEnum(EmploymentStatus)
  employmentStatus?: EmploymentStatus;

  @IsOptional()
  @IsDateString()
  joinDate?: string;

  @IsOptional()
  @IsDateString()
  probationEndDate?: string;

  @IsOptional()
  @IsString()
  workLocation?: string;

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  emergencyContact?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  certifications?: unknown;
}
