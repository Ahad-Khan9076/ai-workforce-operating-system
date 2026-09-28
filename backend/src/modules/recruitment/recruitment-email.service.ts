import { Injectable } from '@nestjs/common';
import { RecruitmentEmailTemplateKind } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { MailRecruitmentEmailProvider } from './email/mail-recruitment-email.provider.js';

const DEFAULT_TEMPLATES: Array<{
  kind: RecruitmentEmailTemplateKind;
  name: string;
  subject: string;
  bodyHtml: string;
}> = [
  {
    kind: RecruitmentEmailTemplateKind.INTERVIEW_INVITATION,
    name: 'Default interview invitation',
    subject: 'Interview invitation — {{jobTitle}}',
    bodyHtml: '<p>Hello {{candidateName}},</p><p>We would like to invite you to an interview for {{jobTitle}}.</p>',
  },
  {
    kind: RecruitmentEmailTemplateKind.REJECTION,
    name: 'Default rejection',
    subject: 'Update on your application — {{jobTitle}}',
    bodyHtml: '<p>Hello {{candidateName}},</p><p>Thank you for your interest in {{jobTitle}}. We will not be moving forward at this time.</p>',
  },
  {
    kind: RecruitmentEmailTemplateKind.OFFER,
    name: 'Default offer',
    subject: 'Offer — {{jobTitle}}',
    bodyHtml: '<p>Hello {{candidateName}},</p><p>We are pleased to extend an offer for {{jobTitle}}.</p>',
  },
  {
    kind: RecruitmentEmailTemplateKind.GENERAL,
    name: 'Default general',
    subject: 'Message from {{organizationName}}',
    bodyHtml: '<p>Hello {{candidateName}},</p><p>{{message}}</p>',
  },
];

@Injectable()
export class RecruitmentEmailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailProvider: MailRecruitmentEmailProvider,
  ) {}

  async ensureDefaults(organizationId: string) {
    for (const tpl of DEFAULT_TEMPLATES) {
      await this.prisma.recruitmentEmailTemplate.upsert({
        where: {
          organizationId_kind_name: {
            organizationId,
            kind: tpl.kind,
            name: tpl.name,
          },
        },
        update: {},
        create: { organizationId, ...tpl },
      });
    }
  }

  listTemplates(organizationId: string) {
    return this.prisma.recruitmentEmailTemplate.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    });
  }

  private render(template: string, vars: Record<string, string>) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
  }

  async sendTemplate(
    organizationId: string,
    input: {
      kind: RecruitmentEmailTemplateKind;
      to: string;
      variables: Record<string, string>;
      templateName?: string;
    },
  ) {
    await this.ensureDefaults(organizationId);
    const template = await this.prisma.recruitmentEmailTemplate.findFirst({
      where: {
        organizationId,
        kind: input.kind,
        isActive: true,
        ...(input.templateName ? { name: input.templateName } : {}),
      },
    });
    if (!template) {
      throw new Error('Email template not found');
    }

    const subject = this.render(template.subject, input.variables);
    const html = this.render(template.bodyHtml, input.variables);
    const text = template.bodyText
      ? this.render(template.bodyText, input.variables)
      : undefined;

    await this.emailProvider.send(input.to, { subject, html, text });
    return { subject, sent: true };
  }
}
