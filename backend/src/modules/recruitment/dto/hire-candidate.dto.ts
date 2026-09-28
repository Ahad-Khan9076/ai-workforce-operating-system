import { IsOptional, IsString } from 'class-validator';

export class HireCandidateDto {
  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsString()
  jobTitleId?: string;

  @IsOptional()
  @IsString()
  membershipId?: string;
}
