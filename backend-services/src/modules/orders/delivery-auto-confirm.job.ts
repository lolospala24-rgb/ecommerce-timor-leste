import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from './orders.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationEvent } from '../notifications/notifications.constants';
import { OrderStatus, ShippingStatus } from '@prisma/client';
import { DELIVERY_AUTO_CONFIRM_GRACE_DAYS } from './orders.constants';

/**
 * Closes out orders the driver marked DELIVERED but the customer never
 * confirmed — without this, an unresponsive customer would hold a
 * seller's COD earnings hostage indefinitely, since only confirmDelivery
 * (customer) or an admin's manual status change ever released them.
 * Each eligible order goes through OrdersService.autoConfirmDelivery,
 * which re-checks for an open refund before touching anything.
 */
@Injectable()
export class DeliveryAutoConfirmJob {
  private readonly logger = new Logger(DeliveryAutoConfirmJob.name);

  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async sweepUnconfirmedDeliveries() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - DELIVERY_AUTO_CONFIRM_GRACE_DAYS);

    let candidates: { id: number }[];
    try {
      candidates = await this.prisma.order.findMany({
        where: {
          status: OrderStatus.SHIPPING,
          shippingStatus: ShippingStatus.DELIVERED,
          driverDeliveredAt: { lte: cutoff },
        },
        select: { id: true },
      });
    } catch (error) {
      // Can't even query — this is the whole job broken, not one order.
      // Silent failure here means COD payouts/seller earnings just stop
      // releasing on schedule with nobody the wiser, so this always pages
      // an admin rather than only logging to a container nobody tails.
      await this.alertAdmins(
        'DeliveryAutoConfirmJob could not run',
        `The delivery auto-confirm sweep failed to query eligible orders: ${error instanceof Error ? error.message : error}`,
      );
      return;
    }

    if (candidates.length === 0) return;

    this.logger.log(`Auto-confirming ${candidates.length} order(s) delivered ${DELIVERY_AUTO_CONFIRM_GRACE_DAYS}+ days ago with no customer response`);

    const failedOrderIds: number[] = [];
    for (const { id } of candidates) {
      try {
        await this.ordersService.autoConfirmDelivery(id);
      } catch (error) {
        this.logger.error(
          `Failed to auto-confirm order ${id}: ${error instanceof Error ? error.message : error}`,
        );
        failedOrderIds.push(id);
      }
    }

    if (failedOrderIds.length > 0) {
      // One summary notification per sweep, not one per order — a bad run
      // touching 40 orders shouldn't flood the admin notification bell
      // with 40 separate alerts for what's likely the same root cause.
      await this.alertAdmins(
        `Delivery auto-confirm failed for ${failedOrderIds.length} order(s)`,
        `Order IDs: ${failedOrderIds.join(', ')}. Check the backend logs for the specific errors and confirm these manually via Update Status if needed.`,
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
      // Last resort — if even the alert can't be sent, at least it's loud
      // in the logs.
      this.logger.error(
        `Failed to notify admins about job failure: ${notifyError instanceof Error ? notifyError.message : notifyError}`,
      );
    }
  }
}
