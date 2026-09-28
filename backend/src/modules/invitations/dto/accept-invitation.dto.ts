import { IsOptional, IsString, MinLength } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  token!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
