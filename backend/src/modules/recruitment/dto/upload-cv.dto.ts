import { IsString, MinLength } from 'class-validator';

export class UploadCvDto {
  @IsString()
  fileName!: string;

  @IsString()
  mimeType!: string;

  @IsString()
  @MinLength(8)
  contentBase64!: string;
}
