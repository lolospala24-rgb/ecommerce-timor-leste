// placeholder for src/modules/payments/payments.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import 'multer';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MailService } from '../../mail/mail.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { SettingsService } from '../settings/settings.service';
import { FinanceService } from '../finance/finance.service';
import { RefundsService } from '../finance/refunds.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';
import { ResponseUtil } from '../../common/utils/response.util';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private mailService: MailService,
    private cloudinaryService: CloudinaryService,
    private settingsService: SettingsService,
    private financeService: FinanceService,
    private refundsService: RefundsService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto, userId: number) {
    // Get order and verify ownership
    const order = await this.prisma.order.findUnique({
      where: { id: createPaymentDto.orderId },
      include: {
        customer: true,
        seller: {
          include: {
            user: true,
          },
        },
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== userId) {
      throw new ForbiddenException('You can only pay for your own orders');
    }

    if (order.payment) {
      throw new BadRequestException('Payment already exists for this order');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay for cancelled order');
    }

    // Create payment record based on payment method
    let paymentData: any = {
      orderId: order.id,
      amount: order.total,
      method: createPaymentDto.paymentMethod,
      status: PaymentStatus.PENDING,
    };

    // If COD, automatically mark as pending (will be paid on delivery)
    if (createPaymentDto.paymentMethod === PaymentMethod.COD) {
      paymentData.status = PaymentStatus.PENDING;
    }

    // If Bank Transfer, require proof upload — and give it a deadline.
    // PaymentExpiryJob sweeps anything still unpaid with no proof past this.
    if (createPaymentDto.paymentMethod === PaymentMethod.BANK_TRANSFER) {
      paymentData.status = PaymentStatus.PENDING;
      const { paymentExpiryHours } = await this.settingsService.getSettings();
      const hours = Number(paymentExpiryHours ?? 48);
      paymentData.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    }

    const payment = await this.prisma.payment.create({
      data: paymentData,
      include: {
        order: {
          include: {
            customer: true,
            seller: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    // Update order status to PAID for non-COD payments that are auto-confirmed
    if (createPaymentDto.paymentMethod === PaymentMethod.COD) {
      // For COD, order status remains PENDING until delivery
    }

    // Clear cache
    await this.clearPaymentCache(payment.id, order.id);

    return payment;
  }

  async confirmPayment(id: number, confirmPaymentDto: ConfirmPaymentDto, adminId: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            customer: true,
            seller: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(`Payment is already ${payment.status}`);
    }

    // Update payment status
    const updatedPayment = await this.prisma.$transaction(async (prisma) => {
      // Conditional updateMany, not update(): the PENDING check above ran
      // outside this transaction, so two concurrent confirm/reject calls on
      // the same payment could both pass it before either write lands. The
      // `status: PENDING` guard in the where-clause makes the transition
      // itself atomic — only the first caller's write actually matches a
      // row; the loser gets count 0 and a clean error instead of silently
      // double-processing the same payment (mirrors the stock-reservation
      // guard pattern in OrdersService.create).
      const result = await prisma.payment.updateMany({
        where: { id, status: PaymentStatus.PENDING },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          transactionId: confirmPaymentDto.transactionId,
          notes: confirmPaymentDto.notes,
        },
      });

      if (result.count === 0) {
        throw new BadRequestException('Payment is already processed');
      }

      // Update order status
      await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.PAID,
        },
      });

      await this.financeService.recordSaleOnPaymentConfirmed(prisma, payment.orderId);

      // Log admin action
      await prisma.adminLog.create({
        data: {
          adminId,
          action: 'CONFIRM_PAYMENT',
          targetType: 'PAYMENT',
          targetId: id,
          details: {
            orderId: payment.orderId,
            amount: payment.amount,
          },
        },
      });

      return prisma.payment.findUniqueOrThrow({ where: { id } });
    });

    // Send payment confirmation email
    await this.mailService.sendPaymentConfirmation(
      payment.order.customer.email,
      payment.order.customer.name,
      payment.order,
      updatedPayment,
    );

    // Send notification to seller
    await this.mailService.sendPaymentReceivedNotification(
      payment.order.seller.user.email,
      payment.order.seller.storeName,
      payment.order,
    );

    await this.notificationsService
      .notifyPaymentApproved(
        payment.order.customerId,
        id,
        payment.orderId,
        payment.order.orderNumber,
        updatedPayment.amount,
      )
      .catch((err) => console.error('Failed to send payment-approved notification:', err));

    // Clear cache
    await this.clearPaymentCache(id, payment.orderId);

    return updatedPayment;
  }

  async rejectPayment(id: number, reason: string, adminId: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(`Payment is already ${payment.status}`);
    }

    const updatedPayment = await this.prisma.$transaction(async (prisma) => {
      // Same atomic status-guard as confirmPayment — see the comment there.
      const result = await prisma.payment.updateMany({
        where: { id, status: PaymentStatus.PENDING },
        data: {
          status: PaymentStatus.FAILED,
          notes: reason,
        },
      });

      if (result.count === 0) {
        throw new BadRequestException('Payment is already processed');
      }

      // Log admin action
      await prisma.adminLog.create({
        data: {
          adminId,
          action: 'REJECT_PAYMENT',
          targetType: 'PAYMENT',
          targetId: id,
          details: {
            orderId: payment.orderId,
            reason,
          },
        },
      });

      return prisma.payment.findUniqueOrThrow({ where: { id } });
    });

    // Send payment rejection email
    await this.mailService.sendPaymentRejectedEmail(
      payment.order.customer.email,
      payment.order.customer.name,
      payment.order,
      reason,
    );

    await this.notificationsService
      .notifyPaymentRejected(payment.order.customerId, id, payment.orderId, payment.order.orderNumber, reason)
      .catch((err) => console.error('Failed to send payment-rejected notification:', err));

    await this.clearPaymentCache(id, payment.orderId);

    return updatedPayment;
  }

  async uploadPaymentProof(paymentId: number, file: Express.Multer.File, userId: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.order.customerId !== userId) {
      throw new ForbiddenException('You can only upload proof for your own payments');
    }

    if (payment.method !== PaymentMethod.BANK_TRANSFER) {
      throw new BadRequestException('Payment proof only required for bank transfer');
    }

    // FAILED is allowed too — a rejected receipt (wrong amount, unreadable
    // scan, etc.) shouldn't dead-end the customer with no way to try again.
    // Re-uploading resets it back to PENDING for another admin review pass.
    if (payment.status !== PaymentStatus.PENDING && payment.status !== PaymentStatus.FAILED) {
      throw new BadRequestException('Payment is already processed');
    }

    // Upload proof image
    const result = await this.cloudinaryService.uploadFile(file, {
      folder: 'ecommerce-timor/payments/proofs',
      transformation: { width: 1000, quality: 80 },
    });

    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        proofImage: result.secure_url,
        status: PaymentStatus.PENDING,
        notes: null,
      },
    });

    await this.clearPaymentCache(paymentId, payment.orderId);

    const { autoConfirmBankTransfer } = await this.settingsService.getSettings();
    if (autoConfirmBankTransfer) {
      await this.autoConfirmBankTransfer(paymentId);
    } else {
      // The single most important admin alert in the bank-transfer flow —
      // without this, an uploaded receipt sat unreviewed until an admin
      // happened to browse the Payments page. See audit finding: previously
      // this created no notification at all, not even an email.
      await this.notificationsService
        .notifyPaymentReceiptUploaded(paymentId, payment.orderId, payment.order.orderNumber, payment.amount)
        .catch((err) => console.error('Failed to send payment-receipt-uploaded notification:', err));
    }

    return result.secure_url;
  }

  // Mirrors the "mark paid" half of confirmPayment() for the
  // autoConfirmBankTransfer setting, minus the AdminLog entry — there's no
  // admin behind this action, it's triggered by the customer's own upload.
  private async autoConfirmBankTransfer(paymentId: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            customer: true,
            seller: { include: { user: true } },
          },
        },
      },
    });

    if (!payment || payment.status !== PaymentStatus.PENDING) return;

    const updatedPayment = await this.prisma.$transaction(async (prisma) => {
      // Same atomic status-guard as confirmPayment/rejectPayment.
      const result = await prisma.payment.updateMany({
        where: { id: paymentId, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.PAID, paidAt: new Date() },
      });
      if (result.count === 0) return null;

      await prisma.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.PAID },
      });

      await this.financeService.recordSaleOnPaymentConfirmed(prisma, payment.orderId);

      return prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    });

    if (!updatedPayment) return;

    await this.mailService.sendPaymentConfirmation(
      payment.order.customer.email,
      payment.order.customer.name,
      payment.order,
      updatedPayment,
    );
    await this.mailService.sendPaymentReceivedNotification(
      payment.order.seller.user.email,
      payment.order.seller.storeName,
      payment.order,
    );

    await this.notificationsService
      .notifyPaymentApproved(
        payment.order.customerId,
        paymentId,
        payment.orderId,
        payment.order.orderNumber,
        updatedPayment.amount,
      )
      .catch((err) => console.error('Failed to send payment-approved notification:', err));

    await this.clearPaymentCache(paymentId, payment.orderId);
  }

  async findAll(
    userId: number,
    userRole: string,
    pagination: { page: number; limit: number; status?: string },
  ) {
    const { page, limit, status } = pagination;
    const skip = (page - 1) * limit;

    let where: any = {};

    if (userRole === 'CUSTOMER') {
      where = {
        order: {
          customerId: userId,
        },
      };
    } else if (userRole === 'SELLER') {
      const seller = await this.prisma.seller.findUnique({
        where: { userId },
      });
      if (seller) {
        where = {
          order: {
            sellerId: seller.id,
          },
        };
      } else {
        return ResponseUtil.paginate([], 0, page, limit);
      }
    }

    if (status) {
      where.status = status;
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        include: {
          order: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              seller: {
                select: {
                  id: true,
                  storeName: true,
                },
              },
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return ResponseUtil.paginate(payments, total, page, limit);
  }

  async getUserPayments(
    userId: number,
    pagination: { page: number; limit: number },
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          order: {
            customerId: userId,
          },
        },
        skip,
        take: limit,
        include: {
          order: {
            include: {
              seller: {
                select: {
                  id: true,
                  storeName: true,
                },
              },
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      thumbnail: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({
        where: {
          order: {
            customerId: userId,
          },
        },
      }),
    ]);

    return ResponseUtil.paginate(payments, total, page, limit);
  }

  async getPendingPayments(pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.PENDING,
          method: PaymentMethod.BANK_TRANSFER,
        },
        skip,
        take: limit,
        include: {
          order: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
              seller: {
                select: {
                  id: true,
                  storeName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.payment.count({
        where: {
          status: PaymentStatus.PENDING,
          method: PaymentMethod.BANK_TRANSFER,
        },
      }),
    ]);

    return ResponseUtil.paginate(payments, total, page, limit);
  }

  async findOne(id: number, userId: number, userRole: string) {
    const cacheKey = `payment:${id}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            seller: {
              select: {
                id: true,
                storeName: true,
                storePhone: true,
                storeEmail: true,
              },
            },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    thumbnail: true,
                    price: true,
                  },
                },
              },
            },
            address: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    // Check permissions
    if (userRole === 'CUSTOMER' && payment.order.customerId !== userId) {
      throw new ForbiddenException('You can only view your own payments');
    }

    if (userRole === 'SELLER') {
      const seller = await this.prisma.seller.findUnique({
        where: { userId },
      });
      if (payment.order.sellerId !== seller?.id) {
        throw new ForbiddenException('You can only view payments for your store');
      }
    }

    await this.redisService.set(cacheKey, JSON.stringify(payment), 300);

    return payment;
  }

  async getPaymentByOrder(orderId: number, userId: number, userRole: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check permissions
    if (userRole === 'CUSTOMER' && order.customerId !== userId) {
      throw new ForbiddenException('You can only view your own orders');
    }

    if (userRole === 'SELLER') {
      const seller = await this.prisma.seller.findUnique({
        where: { userId },
      });
      if (order.sellerId !== seller?.id) {
        throw new ForbiddenException('You can only view orders for your store');
      }
    }

    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: {
        order: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            seller: {
              select: {
                id: true,
                storeName: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found for this order');
    }

    return payment;
  }

  // Delegates to RefundsService, which creates a real Refund record (instead
  // of just flipping Payment.status) and reverses the seller's ledger/
  // balance — this button used to be a one-shot status flag with no
  // financial reconciliation behind it at all. Kept as a single call so the
  // admin Payments page's existing "Refund Payment" button doesn't need to
  // change; it now goes through the same ledger-correct path as a
  // customer-initiated refund request.
  async refundPayment(id: number, reason: string, adminId: number) {
    const refund = await this.refundsService.createAndApproveFullRefund(id, reason, adminId);
    await this.clearPaymentCache(id, refund.orderId);
    return refund;
  }

  async getPaymentStats(userId: number) {
    const cacheKey = `payment:stats:${userId}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const [
      totalPayments,
      pendingPayments,
      paidPayments,
      failedPayments,
      refundedPayments,
      totalAmount,
      codCount,
      bankTransferCount,
    ] = await Promise.all([
      this.prisma.payment.count({
        where: {
          order: { customerId: userId },
        },
      }),
      this.prisma.payment.count({
        where: {
          order: { customerId: userId },
          status: PaymentStatus.PENDING,
        },
      }),
      this.prisma.payment.count({
        where: {
          order: { customerId: userId },
          status: PaymentStatus.PAID,
        },
      }),
      this.prisma.payment.count({
        where: {
          order: { customerId: userId },
          status: PaymentStatus.FAILED,
        },
      }),
      this.prisma.payment.count({
        where: {
          order: { customerId: userId },
          status: PaymentStatus.REFUNDED,
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          order: { customerId: userId },
          status: PaymentStatus.PAID,
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.payment.count({
        where: {
          order: { customerId: userId },
          method: PaymentMethod.COD,
        },
      }),
      this.prisma.payment.count({
        where: {
          order: { customerId: userId },
          method: PaymentMethod.BANK_TRANSFER,
        },
      }),
    ]);

    const stats = {
      total: totalPayments,
      pending: pendingPayments,
      paid: paidPayments,
      failed: failedPayments,
      refunded: refundedPayments,
      totalAmount: totalAmount._sum.amount || 0,
      byMethod: {
        [PaymentMethod.COD]: codCount,
        [PaymentMethod.BANK_TRANSFER]: bankTransferCount,
      },
    };

    await this.redisService.set(cacheKey, JSON.stringify(stats), 300);

    return stats;
  }

  // orderId is optional only because create() doesn't have one to pass on
  // the very first payment attempt failure path — every other call site
  // always has the order loaded and should pass it. Without this, GET
  // /orders/:id keeps serving a cached snapshot (up to 5 min old, real TTL
  // even with Redis disabled via the in-memory fallback) that still shows
  // the payment's old status/proofImage after upload/confirm/reject.
  private async clearPaymentCache(paymentId?: number, orderId?: number) {
    if (paymentId) {
      await this.redisService.del(`payment:${paymentId}`);
    }
    if (orderId) {
      await this.redisService.del(`order:${orderId}`);
    }

    const keys = await this.redisService.keys('payment:*');
    await this.redisService.delMany(keys);
  }
}