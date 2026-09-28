import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  async send(input: SendMailInput): Promise<void> {
    const appUrl = this.configService.get<string>('appUrl') ?? 'http://localhost:5173';
    this.logger.log(
      `[mail] to=${input.to} subject="${input.subject}" appUrl=${appUrl}`,
    );
    this.logger.debug(input.text ?? input.html);
  }
}
