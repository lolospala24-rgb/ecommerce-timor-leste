import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { FinanceService } from './finance.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentStatus, OrderStatus, RefundStatus, RefundType } from '@prisma/client';
import { ResponseUtil } from '../../common/utils/response.util';

const REFUND_WINDOW_DAYS = 7;

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

@Injectable()
export class RefundsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private financeService: FinanceService,
    private notificationsService: NotificationsService,
  ) {}

  private resolveAmountAndType(paymentAmount: number, requested?: number) {
    if (requested == null || round2(requested) >= round2(paymentAmount)) {
      return { amount: round2(paymentAmount), type: RefundType.FULL };
    }
    if (requested <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }
    return { amount: round2(requested), type: RefundType.PARTIAL };
  }

  private async createRequest(
    orderId: number,
    requestedBy: number,
    reason: string,
    amount: number | undefined,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException(`Order with ID ${orderId} not found`);
    if (!order.payment) throw new BadRequestException('This order has no payment to refund');
    if (order.payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException(`Only a PAID payment can be refunded (current status: ${order.payment.status})`);
    }

    const existingPending = await this.prisma.refund.findFirst({
      where: { orderId, status: RefundStatus.PENDING },
    });
    if (existingPending) {
      throw new BadRequestException('A refund request is already pending for this order');
    }

    const { amount: resolvedAmount, type } = this.resolveAmountAndType(order.payment.amount, amount);

    const refund = await this.prisma.refund.create({
      data: {
        paymentId: order.payment.id,
        orderId: order.id,
        amount: resolvedAmount,
        reason,
        type,
        status: RefundStatus.PENDING,
        requestedBy,
      },
    });

    return { refund, order };
  }

  /**
   * Customer self-service refund request — only on a DELIVERED order,
   * within REFUND_WINDOW_DAYS of delivery. This is the customer-facing
   * counterpart to admin's approve/reject; unlike the old stub it creates a
   * real, queryable Refund row instead of writing text into Order.notes.
   */
  async requestRefund(orderId: number, userId: number, reason: string, amount?: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order with ID ${orderId} not found`);
    if (order.customerId !== userId) {
      throw new ForbiddenException('You can only request a refund for your own orders');
    }
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(`Cannot request a refund for an order with status ${order.status}`);
    }
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - REFUND_WINDOW_DAYS);
    if (order.deliveredAt && order.deliveredAt < windowStart) {
      throw new BadRequestException(`Refund period has expired (${REFUND_WINDOW_DAYS} days after delivery)`);
    }

    const { refund } = await this.createRequest(orderId, userId, reason, amount);

    await this.notificationsService
      .notifyRefundRequested(refund.id, order.id, order.orderNumber, refund.amount)
      .catch((err) => console.error('Failed to send refund-requested notification:', err));

    return refund;
  }

  /**
   * Used by OrdersService.cancelOrder() when a customer cancels an order
   * that's already been paid — no DELIVERED/window restriction, since
   * cancelling a paid-but-not-yet-shipped order is a normal, immediate
   * request, not a post-delivery return. Auto-approved: cancelling before
   * the seller has done anything with the order is unambiguous, unlike a
   * post-delivery refund which needs a human to look at it.
   */
  async createAndApproveForCancellation(orderId: number, userId: number, reason: string, adminId: number) {
    const { refund } = await this.createRequest(orderId, userId, reason, undefined);
    return this.approveRefund(refund.id, adminId, 'Auto-approved: order cancelled before shipment');
  }

  /**
   * Admin-initiated instant refund (the admin Payments page's single
   * "Refund Payment" button) — creates and immediately approves a full
   * refund in one step, preserving that button's existing one-click
   * behavior while routing the money movement through the same
   * ledger-correct path as the customer-request flow.
   */
  async createAndApproveFullRefund(paymentId: number, reason: string, adminId: number) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Only paid payments can be refunded');
    }

    const { refund } = await this.createRequest(payment.orderId, adminId, reason, undefined);
    return this.approveRefund(refund.id, adminId, 'Refunded directly by admin');
  }

  async approveRefund(refundId: number, adminId: number, adminNote?: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: { payment: true, order: true },
    });
    if (!refund) throw new NotFoundException('Refund request not found');
    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException(`Refund is already ${refund.status}`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Atomic status guard — same TOCTOU concern as payment confirm/reject.
      const updated = await tx.refund.updateMany({
        where: { id: refundId, status: RefundStatus.PENDING },
        data: { status: RefundStatus.APPROVED, processedBy: adminId, processedAt: new Date(), adminNote },
      });
      if (updated.count === 0) {
        throw new BadRequestException('Refund is already processed');
      }

      const newPaymentStatus =
        round2(refund.amount) >= round2(refund.payment.amount)
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIALLY_REFUNDED;

      await tx.payment.update({
        where: { id: refund.paymentId },
        data: { status: newPaymentStatus },
      });

      // A full refund voids the sale — cancel the order. A partial refund
      // (e.g. one damaged item in a multi-item order) doesn't; the order
      // keeps moving through its normal lifecycle.
      if (refund.type === RefundType.FULL && refund.order.status !== OrderStatus.CANCELLED) {
        await tx.order.update({
          where: { id: refund.orderId },
          data: { status: OrderStatus.CANCELLED, cancelledAt: new Date() },
        });
      }

      await this.financeService.reverseEarningsOnRefund(tx, refund.id);

      await tx.adminLog.create({
        data: {
          adminId,
          action: 'APPROVE_REFUND',
          targetType: 'REFUND',
          targetId: refundId,
          details: { orderId: refund.orderId, paymentId: refund.paymentId, amount: refund.amount, type: refund.type },
        },
      });

      return tx.refund.findUniqueOrThrow({
        where: { id: refundId },
        include: { order: { include: { customer: true } }, payment: true },
      });
    });

    await this.mailService.sendPaymentRefundEmail(
      result.order.customer?.email,
      result.order.customer?.name,
      result.order,
      refund.reason,
    );

    await this.notificationsService
      .notifyRefundDecision(
        result.order.customerId,
        refundId,
        result.orderId,
        result.order.orderNumber,
        result.amount,
        true,
      )
      .catch((err) => console.error('Failed to send refund-approved notification:', err));

    return result;
  }

  async rejectRefund(refundId: number, adminId: number, reason: string) {
    const refund = await this.prisma.refund.findUnique({ where: { id: refundId } });
    if (!refund) throw new NotFoundException('Refund request not found');
    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException(`Refund is already ${refund.status}`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.refund.updateMany({
        where: { id: refundId, status: RefundStatus.PENDING },
        data: { status: RefundStatus.REJECTED, processedBy: adminId, processedAt: new Date(), adminNote: reason },
      });
      if (updated.count === 0) {
        throw new BadRequestException('Refund is already processed');
      }

      await tx.adminLog.create({
        data: {
          adminId,
          action: 'REJECT_REFUND',
          targetType: 'REFUND',
          targetId: refundId,
          details: { orderId: refund.orderId, reason },
        },
      });

      return tx.refund.findUniqueOrThrow({ where: { id: refundId }, include: { order: true } });
    });

    await this.notificationsService
      .notifyRefundDecision(
        result.order.customerId,
        refundId,
        result.orderId,
        result.order.orderNumber,
        result.amount,
        false,
        reason,
      )
      .catch((err) => console.error('Failed to send refund-rejected notification:', err));

    return result;
  }

  async findAllForAdmin(filters: { status?: RefundStatus; page: number; limit: number }) {
    const { status, page, limit } = filters;
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [refunds, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        skip,
        take: limit,
        orderBy: { requestedAt: 'desc' },
        include: {
          order: { select: { orderNumber: true, total: true, seller: { select: { storeName: true } } } },
          payment: { select: { amount: true, method: true, status: true } },
        },
      }),
      this.prisma.refund.count({ where }),
    ]);

    // Requester name isn't a direct relation (requestedBy is a plain userId
    // so the same field works whether a customer or an admin created the
    // row) — resolve display names in one extra batched query rather than
    // n+1-ing through Prisma include.
    const userIds = [...new Set(refunds.map((r) => r.requestedBy))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const enriched = refunds.map((r) => ({ ...r, requester: userMap.get(r.requestedBy) ?? null }));

    return ResponseUtil.paginate(enriched, total, page, limit);
  }

  async findMyRefunds(userId: number, pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const where = { order: { customerId: userId } };

    const [refunds, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        skip,
        take: limit,
        orderBy: { requestedAt: 'desc' },
        include: { order: { select: { orderNumber: true, total: true } } },
      }),
      this.prisma.refund.count({ where }),
    ]);

    return ResponseUtil.paginate(refunds, total, page, limit);
  }

  async findByOrder(orderId: number, userId: number, userRole: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    if (userRole === 'CUSTOMER' && order.customerId !== userId) {
      throw new ForbiddenException('You can only view refunds for your own orders');
    }
    if (userRole === 'SELLER') {
      const seller = await this.prisma.seller.findUnique({ where: { userId } });
      if (!seller || order.sellerId !== seller.id) {
        throw new ForbiddenException('You can only view refunds for your store');
      }
    }

    return this.prisma.refund.findMany({
      where: { orderId },
      orderBy: { requestedAt: 'desc' },
    });
  }
}
