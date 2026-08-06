// placeholder for src/modules/payments/strategies/cod.strategy.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class CodStrategy {
  private readonly logger = new Logger(CodStrategy.name);

  constructor(private prisma: PrismaService) {}

  async processPayment(orderId: number, amount: number): Promise<any> {
    this.logger.log(`Processing COD payment for order ${orderId}`);

    // For COD, we just create a pending payment record
    // Payment will be collected upon delivery
    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        amount,
        method: PaymentMethod.COD,
        status: PaymentStatus.PENDING,
      },
    });

    this.logger.log(`COD payment created for order ${orderId}`);

    return payment;
  }

  async confirmDelivery(orderId: number): Promise<any> {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.method !== PaymentMethod.COD) {
      throw new Error('Not a COD payment');
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { orderId },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
      },
    });

    this.logger.log(`COD payment confirmed for order ${orderId}`);

    return updatedPayment;
  }

  async cancelPayment(orderId: number): Promise<any> {
    const payment = await this.prisma.payment.update({
      where: { orderId },
      data: {
        status: PaymentStatus.REFUNDED,
        notes: 'Payment cancelled due to order cancellation',
      },
    });

    this.logger.log(`COD payment cancelled for order ${orderId}`);

    return payment;
  }
}