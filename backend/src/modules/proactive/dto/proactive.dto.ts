import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class RecommendationFeedbackDto {
  @IsBoolean()
  isHelpful!: boolean;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class SetAutomationEnabledDto {
  @IsBoolean()
  enabled!: boolean;
}
