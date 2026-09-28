import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RequestCorrectionDto {
  @IsOptional()
  @IsDateString()
  proposedClockInAt?: string;

  @IsOptional()
  @IsDateString()
  proposedClockOutAt?: string;

  @IsString()
  @MinLength(3)
  reason!: string;
}

export class ReviewCorrectionDto {
  @IsBoolean()
  approve!: boolean;
}
