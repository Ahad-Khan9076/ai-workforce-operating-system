import { DocumentVisibility } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateEmployeeDocumentDto {
  @IsString()
  name!: string;

  @IsString()
  type!: string;

  @IsString()
  fileUrl!: string;

  @IsOptional()
  @IsString()
  storageKey?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsEnum(DocumentVisibility)
  visibility?: DocumentVisibility;
}
