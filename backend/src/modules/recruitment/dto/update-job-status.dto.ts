import { RecruitmentJobStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateJobStatusDto {
  @IsEnum(RecruitmentJobStatus)
  status!: RecruitmentJobStatus;
}
