import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from './orders.service';
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
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sweepExpiredPayments() {
    const expired = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PENDING,
        method: PaymentMethod.BANK_TRANSFER,
        proofImage: null,
        expiresAt: { lt: new Date() },
      },
      select: { id: true, orderId: true },
    });

    if (expired.length === 0) return;

    this.logger.log(`Expiring ${expired.length} unpaid bank-transfer order(s) past their payment window`);

    for (const payment of expired) {
      try {
        await this.ordersService.expireUnpaidOrder(payment.orderId);
      } catch (error) {
        this.logger.error(
          `Failed to expire order ${payment.orderId} (payment ${payment.id}): ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }
}
