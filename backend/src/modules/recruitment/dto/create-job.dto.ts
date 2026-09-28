import { EmploymentType } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateRecruitmentJobDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsString()
  @MinLength(10)
  description!: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @IsString()
  responsibilities?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsNumber()
  experienceYears?: number;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  salaryMin?: number;

  @IsOptional()
  @IsNumber()
  salaryMax?: number;
}
