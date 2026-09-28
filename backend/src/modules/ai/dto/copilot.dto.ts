import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  title?: string;
}

export class SendCopilotMessageDto {
  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsBoolean()
  stream?: boolean;
}
