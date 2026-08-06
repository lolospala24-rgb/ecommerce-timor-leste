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

    // If Bank Transfer, require proof upload
    if (createPaymentDto.paymentMethod === PaymentMethod.BANK_TRANSFER) {
      paymentData.status = PaymentStatus.PENDING;
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
    await this.clearPaymentCache();

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
      const updated = await prisma.payment.update({
        where: { id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          transactionId: confirmPaymentDto.transactionId,
          notes: confirmPaymentDto.notes,
        },
      });

      // Update order status
      await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.PAID,
        },
      });

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

      return updated;
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

    // Clear cache
    await this.clearPaymentCache(id);

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
      const updated = await prisma.payment.update({
        where: { id },
        data: {
          status: PaymentStatus.FAILED,
          notes: reason,
        },
      });

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

      return updated;
    });

    // Send payment rejection email
    await this.mailService.sendPaymentRejectedEmail(
      payment.order.customer.email,
      payment.order.customer.name,
      payment.order,
      reason,
    );

    await this.clearPaymentCache(id);

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

    if (payment.status !== PaymentStatus.PENDING) {
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
      },
    });

    await this.clearPaymentCache(paymentId);

    return result.secure_url;
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

  async refundPayment(id: number, reason: string, adminId: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            customer: true,
            seller: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Only paid payments can be refunded');
    }

    const updatedPayment = await this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.payment.update({
        where: { id },
        data: {
          status: PaymentStatus.REFUNDED,
          notes: `Refunded: ${reason}`,
        },
      });

      // Update order status to cancelled
      await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      // Log admin action
      await prisma.adminLog.create({
        data: {
          adminId,
          action: 'REFUND_PAYMENT',
          targetType: 'PAYMENT',
          targetId: id,
          details: {
            orderId: payment.orderId,
            amount: payment.amount,
            reason,
          },
        },
      });

      return updated;
    });

    // Send refund email
    await this.mailService.sendPaymentRefundEmail(
      payment.order.customer.email,
      payment.order.customer.name,
      payment.order,
      reason,
    );

    await this.clearPaymentCache(id);

    return updatedPayment;
  }

  async getPaymentStats(userId: number) {
    const cacheKey = `payment:stats:${userId}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const [totalPayments, pendingPayments, paidPayments, failedPayments, refundedPayments, totalAmount] = await Promise.all([
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
    ]);

    const stats = {
      total: totalPayments,
      pending: pendingPayments,
      paid: paidPayments,
      failed: failedPayments,
      refunded: refundedPayments,
      totalAmount: totalAmount._sum.amount || 0,
      byMethod: {
        [PaymentMethod.COD]: await this.prisma.payment.count({
          where: {
            order: { customerId: userId },
            method: PaymentMethod.COD,
          },
        }),
        [PaymentMethod.BANK_TRANSFER]: await this.prisma.payment.count({
          where: {
            order: { customerId: userId },
            method: PaymentMethod.BANK_TRANSFER,
          },
        }),
      },
    };

    await this.redisService.set(cacheKey, JSON.stringify(stats), 300);

    return stats;
  }

  private async clearPaymentCache(paymentId?: number) {
    if (paymentId) {
      await this.redisService.del(`payment:${paymentId}`);
    }
    
    const keys = await this.redisService.keys('payment:*');
    for (const key of keys) {
      await this.redisService.del(key);
    }
  }
}