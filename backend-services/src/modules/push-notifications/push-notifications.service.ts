import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

// Best-effort delivery layer, called from NotificationsService.sendNotification
// alongside the existing in-app (WebSocket) and email sends — a push failure
// must never fail the notification itself, only ever logged. VAPID keys are
// optional: unset in local dev, sendToUser silently no-ops so nothing here
// blocks working without them.
@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);
  private readonly enabled: boolean;

  constructor(private prisma: PrismaService) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;
    this.enabled = !!(publicKey && privateKey && subject);
    if (this.enabled) {
      webpush.setVapidDetails(subject!, publicKey!, privateKey!);
    } else {
      this.logger.warn('VAPID keys not configured — push notifications disabled');
    }
  }

  getVapidPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  }

  async subscribe(userId: number, dto: SubscribePushDto, userAgent?: string) {
    // Upsert on endpoint (globally unique — a browser's own subscription
    // URL), not (userId, endpoint): the same browser re-subscribing (keys
    // rotate periodically per the Push API spec) must replace its old row
    // rather than violate the unique constraint or create a duplicate.
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: userAgent?.slice(0, 255),
      },
      update: {
        userId,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: userAgent?.slice(0, 255),
      },
    });
  }

  async unsubscribe(userId: number, endpoint: string) {
    // Scoped to userId too — a subscription row can only be removed by the
    // account that owns it, never by guessing another user's endpoint.
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
    return { success: true };
  }

  async sendToUser(userId: number, payload: PushPayload) {
    if (!this.enabled) return;

    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId } });
    if (subscriptions.length === 0) return;

    const body = JSON.stringify(payload);
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body,
          );
        } catch (error: any) {
          // 404/410 = the browser/OS has permanently invalidated this
          // subscription (uninstalled, permission revoked, expired) —
          // clean it up so future sends don't keep retrying a dead
          // endpoint. Any other error (network blip, ...) is just logged.
          if (error?.statusCode === 404 || error?.statusCode === 410) {
            await this.prisma.pushSubscription.deleteMany({ where: { id: sub.id } });
          } else {
            this.logger.warn(`Push send failed for subscription ${sub.id}: ${error?.message || error}`);
          }
        }
      }),
    );
  }
}
