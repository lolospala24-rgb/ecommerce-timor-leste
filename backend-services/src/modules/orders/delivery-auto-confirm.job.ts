import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from './orders.service';
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
  ) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async sweepUnconfirmedDeliveries() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - DELIVERY_AUTO_CONFIRM_GRACE_DAYS);

    const candidates = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.SHIPPING,
        shippingStatus: ShippingStatus.DELIVERED,
        driverDeliveredAt: { lte: cutoff },
      },
      select: { id: true },
    });

    if (candidates.length === 0) return;

    this.logger.log(`Auto-confirming ${candidates.length} order(s) delivered ${DELIVERY_AUTO_CONFIRM_GRACE_DAYS}+ days ago with no customer response`);

    for (const { id } of candidates) {
      try {
        await this.ordersService.autoConfirmDelivery(id);
      } catch (error) {
        this.logger.error(
          `Failed to auto-confirm order ${id}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }
}
