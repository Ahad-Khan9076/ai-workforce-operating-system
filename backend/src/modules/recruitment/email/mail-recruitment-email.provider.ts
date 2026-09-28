import { Injectable } from '@nestjs/common';
import { MailService } from '../../notifications/mail.service.js';
import {
  RecruitmentEmailProvider,
  type RenderedEmail,
} from './recruitment-email.provider.js';

@Injectable()
export class MailRecruitmentEmailProvider extends RecruitmentEmailProvider {
  constructor(private readonly mail: MailService) {
    super();
  }

  async send(to: string, rendered: RenderedEmail): Promise<void> {
    await this.mail.send({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }
}
