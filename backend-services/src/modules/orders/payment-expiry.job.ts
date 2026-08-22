import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from './orders.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationEvent } from '../notifications/notifications.constants';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

/**
 * Sweeps abandoned bank-transfer payments — PENDING, no proof ever
 * uploaded, past their expiresAt (see PaymentsService.create). Each one
 * goes through OrdersService.expireUnpaidOrder, which restores reserved
 * stock and cancels the order — the same stock-release path an ordinary
 * customer cancellation already uses, just system-triggered.
 */
@Injectable()
export class PaymentExpiryJob {
  private readonly logger = new Logger(PaymentExpiryJob.name);

  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sweepExpiredPayments() {
    let expired: { id: number; orderId: number }[];
    try {
      expired = await this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.PENDING,
          method: PaymentMethod.BANK_TRANSFER,
          proofImage: null,
          expiresAt: { lt: new Date() },
        },
        select: { id: true, orderId: true },
      });
    } catch (error) {
      await this.alertAdmins(
        'PaymentExpiryJob could not run',
        `The payment-expiry sweep failed to query pending payments: ${error instanceof Error ? error.message : error}`,
      );
      return;
    }

    if (expired.length === 0) return;

    this.logger.log(`Expiring ${expired.length} unpaid bank-transfer order(s) past their payment window`);

    const failedOrderIds: number[] = [];
    for (const payment of expired) {
      try {
        await this.ordersService.expireUnpaidOrder(payment.orderId);
      } catch (error) {
        this.logger.error(
          `Failed to expire order ${payment.orderId} (payment ${payment.id}): ${error instanceof Error ? error.message : error}`,
        );
        failedOrderIds.push(payment.orderId);
      }
    }

    if (failedOrderIds.length > 0) {
      await this.alertAdmins(
        `Payment expiry failed for ${failedOrderIds.length} order(s)`,
        `Order IDs: ${failedOrderIds.join(', ')}. These unpaid bank-transfer orders did not get cancelled/restocked automatically — check the backend logs and handle manually if needed.`,
      );
    }
  }

  private async alertAdmins(title: string, message: string) {
    try {
      await this.notificationsService.broadcastNotification({
        title,
        message,
        type: NotificationEvent.SYSTEM,
        priority: 'CRITICAL',
        userFilter: { role: 'ADMIN' },
        sendEmail: true,
      });
    } catch (notifyError) {
      this.logger.error(
        `Failed to notify admins about job failure: ${notifyError instanceof Error ? notifyError.message : notifyError}`,
      );
    }
  }
}
