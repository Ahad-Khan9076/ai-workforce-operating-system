import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateShiftTemplateDto {
  @IsString()
  name!: string;

  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string;

  @Matches(/^\d{2}:\d{2}$/)
  endTime!: string;

  @IsInt()
  @Min(0)
  breakDurationMinutes!: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  workingDays!: number[];

  @IsInt()
  @Min(0)
  gracePeriodMinutes!: number;

  @IsInt()
  @Min(0)
  overtimeThresholdMinutes!: number;
}
