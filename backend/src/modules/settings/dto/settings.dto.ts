import { IsObject, IsOptional } from 'class-validator';

export class PatchOrganizationSettingsDto {
  @IsOptional()
  @IsObject()
  notifications?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  ai?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  integrations?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  security?: Record<string, unknown>;
}
