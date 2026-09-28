import { CandidatePipelineStage } from '@prisma/client';
import { IsEnum, IsInt, IsOptional } from 'class-validator';

export class MoveStageDto {
  @IsEnum(CandidatePipelineStage)
  stage!: CandidatePipelineStage;

  @IsOptional()
  @IsInt()
  stageOrder?: number;
}
