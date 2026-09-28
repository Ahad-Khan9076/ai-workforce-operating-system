import { SkillProficiency } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class UpsertRoleSkillRequirementDto {
  @IsString()
  @MinLength(2)
  profileName!: string;

  @IsString()
  skillId!: string;

  @IsEnum(SkillProficiency)
  requiredProficiency!: SkillProficiency;

  @IsOptional()
  @IsString()
  jobTitleId?: string;
}

export class AnalyzeSkillGapDto {
  @IsString()
  @MinLength(2)
  profileName!: string;
}

export class TalentSearchDto {
  @IsString()
  @MinLength(2)
  profileName!: string;
}

export class RecordSkillAssessmentDto {
  @IsString()
  skillId!: string;

  @IsEnum(SkillProficiency)
  proficiency!: SkillProficiency;

  @IsOptional()
  @IsString()
  notes?: string;
}
