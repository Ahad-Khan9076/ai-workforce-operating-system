import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { MailService } from './mail.service.js';

export interface SendNotificationInput {
  organizationId: string;
  userId: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  email?: string;
  sendEmail?: boolean;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async sendInApp(input: SendNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        channel: NotificationChannel.IN_APP,
        title: input.title,
        body: input.body,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    await this.prisma.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel: NotificationChannel.IN_APP,
        status: NotificationDeliveryStatus.SENT,
        attemptedAt: new Date(),
      },
    });

    if (input.sendEmail && input.email) {
      await this.sendEmailDelivery(notification.id, input.email, input.title, input.body);
    }

    return notification;
  }

  async sendEmailDelivery(
    notificationId: string,
    to: string,
    subject: string,
    body: string,
  ) {
    const delivery = await this.prisma.notificationDelivery.create({
      data: {
        notificationId,
        channel: NotificationChannel.EMAIL,
        status: NotificationDeliveryStatus.PENDING,
      },
    });

    try {
      await this.mail.send({
        to,
        subject,
        html: `<p>${body}</p>`,
        text: body,
      });
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.SENT,
          attemptedAt: new Date(),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Email failed';
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.FAILED,
          errorMessage: message,
          attemptedAt: new Date(),
        },
      });
    }
  }

  /** Push/SMS: architecture hook only — logs SKIPPED delivery row. */
  async recordUnsupportedChannel(
    notificationId: string,
    channel: 'PUSH' | 'SMS',
  ) {
    await this.prisma.notificationDelivery.create({
      data: {
        notificationId,
        channel:
          channel === 'PUSH'
            ? NotificationChannel.PUSH
            : NotificationChannel.SMS,
        status: NotificationDeliveryStatus.SKIPPED,
        errorMessage: 'Provider not configured',
        attemptedAt: new Date(),
      },
    });
    this.logger.debug(`Skipped ${channel} delivery (no provider)`);
  }

  listForUser(organizationId: string, userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        organizationId,
        userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  markRead(organizationId: string, userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, organizationId, userId },
      data: { readAt: new Date() },
    });
  }
}
