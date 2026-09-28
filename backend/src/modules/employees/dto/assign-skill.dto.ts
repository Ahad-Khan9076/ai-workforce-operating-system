import { EmployeeSkillSource, SkillProficiency } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class AssignEmployeeSkillDto {
  @IsString()
  skillId!: string;

  @IsEnum(SkillProficiency)
  proficiency!: SkillProficiency;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  yearsExperience?: number;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @IsOptional()
  @IsEnum(EmployeeSkillSource)
  source?: EmployeeSkillSource;
}
