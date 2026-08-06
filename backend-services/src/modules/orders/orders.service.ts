// placeholder for src/modules/orders/orders.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MailService } from '../../mail/mail.service';
import { ProductsService } from '../products/products.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ShippingService } from '../shipping/shipping.service';
import { AdminService } from '../admin/admin.service';
import { OrderEventsGateway } from './order-events.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { ResponseUtil } from '../../common/utils/response.util';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private mailService: MailService,
    private productsService: ProductsService,
    private notificationsService: NotificationsService,
    private shippingService: ShippingService,
    private adminService: AdminService,
    private orderEventsGateway: OrderEventsGateway,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: number) {
    // Get user cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                seller: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Group items by seller
    const sellerGroups = new Map();
    for (const item of cart.items) {
      const sellerId = item.product.sellerId;
      if (!sellerGroups.has(sellerId)) {
        sellerGroups.set(sellerId, {
          sellerId,
          seller: item.product.seller,
          items: [],
          subtotal: 0,
        });
      }
      const group = sellerGroups.get(sellerId);
      group.items.push(item);
      group.subtotal += item.quantity * item.product.price;
    }

    // Delivery address is the same for every seller group in this checkout,
    // so it's fetched once up front instead of once per seller.
    const address = await this.prisma.address.findUnique({
      where: { id: createOrderDto.addressId },
    });
    if (!address) {
      throw new BadRequestException('Selected delivery address not found');
    }

    // Tax rate and service fee are platform settings, not client input —
    // any taxAmount/serviceFee sent by the client is accepted for backward
    // compatibility but ignored below so a request can't undercharge itself.
    const settings = await this.adminService.getSystemSettings();
    const taxRate = Number(settings.taxRate ?? 0);
    const flatServiceFee = Number(settings.serviceFee ?? 0);

    // Create orders for each seller
    const orders = [];
    const orderNumberPrefix = `ORD-${Date.now()}-`;

    for (const [_, group] of sellerGroups) {
      if (!group.sellerId) {
        throw new BadRequestException('Invalid seller information for one or more cart items');
      }

      if (!Array.isArray(group.items) || group.items.length === 0) {
        throw new BadRequestException('No order items found for the selected seller');
      }

      const invalidItems = group.items.filter((item: any) => {
        return (
          !item.product ||
          item.productId == null ||
          item.quantity == null ||
          item.quantity <= 0 ||
          item.product.price == null ||
          !Number.isFinite(item.product.price)
        );
      });

      if (invalidItems.length > 0) {
        throw new BadRequestException('One or more cart items contain invalid product or pricing data');
      }

      const shippingCost = Number(await this.shippingService.calculateShippingCost({
        municipality: address?.municipality,
        municipalityId: address?.municipalityId ?? undefined,
        provinceId: address?.provinceId ?? undefined,
        shippingMethod: createOrderDto.shippingMethod,
        subtotal: group.subtotal,
      }));

      if (!Number.isFinite(shippingCost) || shippingCost < 0) {
        throw new BadRequestException('Calculated shipping cost is invalid');
      }

      if (!Number.isFinite(group.subtotal) || group.subtotal < 0) {
        throw new BadRequestException('Cart subtotal is invalid');
      }

      const taxAmount = Number((group.subtotal * taxRate) / 100);
      const serviceFee = flatServiceFee;
      const total = Number(group.subtotal + shippingCost + taxAmount + serviceFee);
      if (!Number.isFinite(total) || total < 0) {
        throw new BadRequestException('Order total is invalid');
      }

      // Generate unique order number
      const orderNumber = `${orderNumberPrefix}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Create order
      const orderCreateData = {
        orderNumber,
        customerId: userId,
        sellerId: group.sellerId,
        subtotal: group.subtotal,
        shippingCost,
        taxAmount,
        serviceFee,
        total,
        status: OrderStatus.PENDING,
        paymentMethod: createOrderDto.paymentMethod,
        addressId: createOrderDto.addressId,
        notes: createOrderDto.notes,
        items: {
          create: group.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
            total: item.quantity * item.product.price,
          })),
        },
      };

      let order;
      try {
        // Atomic, race-safe checkout: reserve stock and create the order
        // in a single DB transaction. The conditional `stock: { gte }` guard
        // means concurrent checkouts on the same product can never both
        // succeed for more units than are actually in stock — the losing
        // request's updateMany matches zero rows and we abort the whole
        // transaction (order + any earlier stock reservations in this loop
        // are rolled back together).
        order = await this.prisma.$transaction(async (tx) => {
          for (const item of group.items) {
            const stockUpdate = await tx.product.updateMany({
              where: { id: item.productId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            });

            if (stockUpdate.count === 0) {
              throw new BadRequestException(
                `Insufficient stock for "${item.product.name}". Please adjust the quantity in your cart and try again.`,
              );
            }
          }

          const createdOrder = await tx.order.create({
            data: orderCreateData,
            include: {
              items: {
                include: {
                  product: true,
                },
              },
              customer: true,
              seller: {
                include: {
                  user: true,
                },
              },
              address: true,
            },
          });

          // Create payment record for COD
          if (createOrderDto.paymentMethod === PaymentMethod.COD) {
            await tx.payment.create({
              data: {
                orderId: createdOrder.id,
                amount: total,
                method: PaymentMethod.COD,
                status: PaymentStatus.PENDING,
              },
            });
          }

          return createdOrder;
        });

        orders.push(order);

        // Send order confirmation email
        await this.mailService.sendOrderConfirmation(
          order.customer.email,
          order.customer.name,
          order,
        );

        // Send notification to seller
        await this.mailService.sendNewOrderNotification(
          order.seller.user.email,
          order.seller.storeName,
          order,
        );

        await this.notificationsService.sendNotification({
          userId,
          title: 'Order Successfully Created',
          message: `Your order ${order.orderNumber} is now pending. Total: $${order.total.toFixed(2)}`,
          type: 'ORDER',
          data: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            total: order.total,
            paymentMethod: order.paymentMethod,
            createdAt: order.createdAt,
          },
          sendEmail: false,
        });

        await this.notificationsService.broadcastNotification({
          title: 'New Order Received',
          message: `Order ${order.orderNumber} from ${order.customer.name} is pending. Total: $${order.total.toFixed(2)}`,
          type: 'ORDER',
          data: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customer.name,
            customerEmail: order.customer.email,
            total: order.total,
            status: order.status,
            paymentMethod: order.paymentMethod,
            createdAt: order.createdAt,
          },
          userFilter: { role: 'ADMIN', isActive: true },
        });

        this.orderEventsGateway.emitOrderCreated({
          orderId: order.id,
          userId,
          orderNumber: order.orderNumber,
          customerName: order.customer.name,
          customerEmail: order.customer.email,
          sellerName: order.seller.storeName,
          status: order.status,
          paymentMethod: order.paymentMethod,
          total: order.total,
          shippingCost,
          createdAt: order.createdAt,
        });
      } catch (error) {
        this.logger.error(
          `Order create failed for seller ${group.sellerId}: ${error instanceof Error ? error.message : error}`,
          error instanceof Error ? error.stack : undefined,
        );
        throw error;
      }
    }

    // Clear user's cart
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    // Clear cache
    await this.clearOrderCache();

    return orders.length === 1 ? orders[0] : orders;
  }

  async findAll(
    userId: number,
    userRole: string,
    filterDto: OrderFilterDto,
  ) {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filterDto;

    const skip = (page - 1) * limit;
    const where: any = {};

    // Filter by user role
    if (userRole === 'CUSTOMER') {
      where.customerId = userId;
    } else if (userRole === 'SELLER') {
      const seller = await this.prisma.seller.findUnique({
        where: { userId },
      });
      if (seller) {
        where.sellerId = seller.id;
      } else {
        return ResponseUtil.paginate([], 0, page, limit);
      }
    }

    if (status) {
      where.status = status;
    }

    if (startDate) {
      where.createdAt = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
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
          payment: true,
          address: true,
        },
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.order.count({ where }),
    ]);

    return ResponseUtil.paginate(orders, total, page, limit);
  }

  async getUserOrders(
    userId: number,
    pagination: { page: number; limit: number; status?: string },
  ) {
    const { page, limit, status } = pagination;
    const skip = (page - 1) * limit;

    const where: any = { customerId: userId };
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          seller: {
            select: {
              id: true,
              storeName: true,
              storePhone: true,
              storeLogo: true,
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
          payment: true,
          address: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return ResponseUtil.paginate(orders, total, page, limit);
  }

  async getSellerOrders(
    userId: number,
    pagination: { page: number; limit: number; status?: string },
  ) {
    const seller = await this.prisma.seller.findUnique({
      where: { userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const { page, limit, status } = pagination;
    const skip = (page - 1) * limit;

    const where: any = { sellerId: seller.id };
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
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
          payment: true,
          address: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return ResponseUtil.paginate(orders, total, page, limit);
  }

  async findOne(id: number) {
    const cacheKey = `order:${id}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const order = await this.prisma.order.findUnique({
      where: { id },
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
            storeAddress: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                thumbnail: true,
                price: true,
                sellerId: true,
              },
            },
          },
        },
        payment: true,
        address: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Calculate timeline
    const timeline = this.getOrderTimeline(order);

    const orderWithTimeline = {
      ...order,
      timeline,
    };

    await this.redisService.set(cacheKey, JSON.stringify(orderWithTimeline), 300);

    return orderWithTimeline;
  }

  async updateStatus(
    id: number,
    updateOrderStatusDto: UpdateOrderStatusDto,
    userId: number,
    userRole: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        seller: {
          include: {
            user: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Check permissions
    if (userRole === 'SELLER') {
      const seller = await this.prisma.seller.findUnique({
        where: { userId },
      });
      if (order.sellerId !== seller?.id) {
        throw new ForbiddenException('You do not have permission to update this order');
      }
    }

    const validTransitions: Record<string, string[]> = {
      PENDING: ['PAID', 'PROCESSING', 'CANCELLED'],
      PAID: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['SHIPPING', 'CANCELLED'],
      SHIPPING: ['DELIVERED', 'CANCELLED'],
      DELIVERED: [],
      CANCELLED: [],
    };

    if (!validTransitions[order.status].includes(updateOrderStatusDto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${updateOrderStatusDto.status}`,
      );
    }

    const targetStatus = updateOrderStatusDto.status as OrderStatus;

    const updateData: any = {
      status: targetStatus,
    };

    if (targetStatus === OrderStatus.SHIPPING) {
      const trackingNumber = updateOrderStatusDto.trackingNumber?.trim() || order.trackingNumber?.trim();
      updateData.trackingNumber = trackingNumber || await this.generateUniqueTrackingNumber(order.orderNumber);
      if (!order.shippedAt) {
        updateData.shippedAt = new Date();
      }
    }

    if (updateOrderStatusDto.trackingNumber?.trim()) {
      updateData.trackingNumber = updateOrderStatusDto.trackingNumber.trim();
    }

    if (updateOrderStatusDto.note) {
      updateData.notes = updateOrderStatusDto.note;
    }

    if (targetStatus === OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
      
      // Update payment status to paid if COD
      if (order.paymentMethod === PaymentMethod.COD) {
        await this.prisma.payment.update({
          where: { orderId: order.id },
          data: {
            status: PaymentStatus.PAID,
            paidAt: new Date(),
          },
        });
      }
    }

    if (updateOrderStatusDto.status === OrderStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
      
      // Restore product stock
      for (const item of order.items) {
        await this.productsService.updateStock(
          item.productId,
          item.quantity,
          'add',
          order.seller.userId,
        );
      }
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        seller: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    const statusLabel = updatedOrder.status
      .toLowerCase()
      .split('_')
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    const messageParts = [`Your order ${updatedOrder.orderNumber} status changed to ${statusLabel}.`];

    if (updatedOrder.status === OrderStatus.SHIPPING) {
      if (updatedOrder.trackingNumber) {
        messageParts.push(`Tracking number: ${updatedOrder.trackingNumber}`);
      }
      if (updateOrderStatusDto.note) {
        messageParts.push(`Reason / Notes: ${updateOrderStatusDto.note}`);
      }
    } else if (updateOrderStatusDto.note) {
      messageParts.push(`Reason / Notes: ${updateOrderStatusDto.note}`);
    }

    await this.notificationsService.sendNotification({
      userId: updatedOrder.customerId,
      title: `Order ${updatedOrder.orderNumber} updated`,
      message: messageParts.join(' '),
      type: 'ORDER',
      data: {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        trackingNumber: updatedOrder.trackingNumber,
        note: updateOrderStatusDto.note,
      },
      sendEmail: false,
    });

    // Send status update email
    await this.mailService.sendOrderStatusUpdate(
      order.customer.email,
      order.customer.name,
      updatedOrder,
    );

    // Clear cache
    await this.clearOrderCache(id);

    this.orderEventsGateway.emitOrderUpdated(updatedOrder.id, {
      orderId: updatedOrder.id,
      userId: updatedOrder.customerId,
      status: updatedOrder.status,
      orderNumber: updatedOrder.orderNumber,
      updatedAt: new Date().toISOString(),
      trackingNumber: updatedOrder.trackingNumber,
      note: updateOrderStatusDto.note,
    });

    return updatedOrder;
  }

  async cancelOrder(id: number, userId: number, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        seller: {
          include: {
            user: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (order.customerId !== userId) {
      throw new ForbiddenException('You can only cancel your own orders');
    }

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PAID) {
      throw new BadRequestException(
        `Cannot cancel order with status ${order.status}`,
      );
    }

    // Restore product stock
    for (const item of order.items) {
      await this.productsService.updateStock(
        item.productId,
        item.quantity,
        'add',
        order.seller.userId,
      );
    }

    const cancelledOrder = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        notes: reason ? `Cancelled: ${reason}` : order.notes,
      },
    });

    // Update payment status if exists
    const payment = await this.prisma.payment.findUnique({
      where: { orderId: id },
    });

    if (payment && payment.status === PaymentStatus.PAID) {
      await this.prisma.payment.update({
        where: { orderId: id },
        data: {
          status: PaymentStatus.REFUNDED,
        },
      });
    }

    // Send cancellation email
    await this.mailService.sendOrderCancelledEmail(
      order.customer.email,
      order.customer.name,
      cancelledOrder,
      reason,
    );

    // Clear cache
    await this.clearOrderCache(id);

    return cancelledOrder;
  }

  async confirmDelivery(id: number, userId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (order.customerId !== userId) {
      throw new ForbiddenException('You can only confirm your own orders');
    }

    if (order.status !== OrderStatus.SHIPPING) {
      throw new BadRequestException(
        `Cannot confirm delivery for order with status ${order.status}`,
      );
    }

    const confirmedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.DELIVERED,
        deliveredAt: new Date(),
      },
    });

    // Update payment status if COD
    if (order.paymentMethod === PaymentMethod.COD) {
      await this.prisma.payment.update({
        where: { orderId: id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
        },
      });
    }

    await this.clearOrderCache(id);

    return confirmedOrder;
  }

  async requestRefund(id: number, userId: number, reason: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (order.customerId !== userId) {
      throw new ForbiddenException('You can only request refund for your own orders');
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        `Cannot request refund for order with status ${order.status}`,
      );
    }

    // Check if within refund period (7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    if (order.deliveredAt && order.deliveredAt < sevenDaysAgo) {
      throw new BadRequestException('Refund period has expired (7 days after delivery)');
    }

    // Create refund request record (would need a Refund table)
    // For now, just update order notes
    const refundRequest = await this.prisma.order.update({
      where: { id },
      data: {
        notes: `Refund requested: ${reason}. Status: PENDING`,
      },
    });

    // Notify admin about refund request
    // This would typically send an email to admin

    await this.clearOrderCache(id);

    return refundRequest;
  }

  async getAllOrdersAdmin(filters: {
    page: number;
    limit: number;
    status?: string;
    sellerId?: number;
  }) {
    const { page, limit, status, sellerId } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (sellerId) where.sellerId = sellerId;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
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
          payment: true,
          address: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return ResponseUtil.paginate(orders, total, page, limit);
  }

  async getOrderStats(userId: number) {
    const cacheKey = `order:stats:${userId}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const [totalOrders, pendingOrders, processingOrders, shippingOrders, deliveredOrders, cancelledOrders, totalSpent] = await Promise.all([
      this.prisma.order.count({ where: { customerId: userId } }),
      this.prisma.order.count({ where: { customerId: userId, status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { customerId: userId, status: OrderStatus.PROCESSING } }),
      this.prisma.order.count({ where: { customerId: userId, status: OrderStatus.SHIPPING } }),
      this.prisma.order.count({ where: { customerId: userId, status: OrderStatus.DELIVERED } }),
      this.prisma.order.count({ where: { customerId: userId, status: OrderStatus.CANCELLED } }),
      this.prisma.order.aggregate({
        where: { customerId: userId, status: OrderStatus.DELIVERED },
        _sum: { total: true },
      }),
    ]);

    const stats = {
      total: totalOrders,
      pending: pendingOrders,
      processing: processingOrders,
      shipping: shippingOrders,
      delivered: deliveredOrders,
      cancelled: cancelledOrders,
      totalSpent: totalSpent._sum.total || 0,
    };

    await this.redisService.set(cacheKey, JSON.stringify(stats), 300);

    return stats;
  }

  async trackOrder(trackingNumber: string) {
    const order = await this.prisma.order.findFirst({
      where: { trackingNumber },
      include: {
        customer: {
          select: {
            name: true,
          },
        },
        seller: {
          select: {
            storeName: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                thumbnail: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with tracking number ${trackingNumber} not found`);
    }

    const timeline = this.getOrderTimeline(order);

    return {
      ...order,
      timeline,
    };
  }

  async getShippingOverview(userId: number, userRole: string) {
    const where: any = {};

    if (userRole === 'CUSTOMER') {
      where.customerId = userId;
    } else if (userRole === 'SELLER') {
      const seller = await this.prisma.seller.findUnique({
        where: { userId },
      });
      if (!seller) {
        return [];
      }
      where.sellerId = seller.id;
    }

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: {
          select: { name: true },
        },
        seller: {
          select: { storeName: true },
        },
        address: true,
      },
    });

    return orders
      .filter((order) => order.status)
      .map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.name ?? 'Unknown',
        location: order.address?.municipality ?? order.address?.suco ?? 'Unknown',
        status: this.mapOrderStatusToShipmentStatus(order.status),
        rawStatus: order.status,
        trackingNumber: order.trackingNumber ?? null,
        lastUpdate: order.updatedAt ? new Date(order.updatedAt).toLocaleString() : 'No update',
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        timeline: this.getOrderTimeline(order),
      }))
      .filter((shipment, index, self) => index === self.findIndex((item) => item.id === shipment.id));
  }

  async getInvoice(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        seller: {
          select: {
            storeName: true,
            storePhone: true,
            storeEmail: true,
            storeAddress: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
        address: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async remove(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Cannot delete non-cancelled or non-delivered orders');
    }

    await this.prisma.order.delete({
      where: { id },
    });

    await this.clearOrderCache(id);

    return true;
  }

  private mapOrderStatusToShipmentStatus(status: string) {
    switch (status) {
      case OrderStatus.SHIPPING:
      case OrderStatus.PROCESSING:
        return 'IN_TRANSIT';
      case OrderStatus.DELIVERED:
        return 'DELIVERED';
      case OrderStatus.CANCELLED:
        return 'FAILED';
      default:
        return 'PENDING';
    }
  }

  private async generateUniqueTrackingNumber(orderNumber: string) {
    const base = orderNumber.replace(/[^A-Z0-9]/g, '').slice(0, 8).toUpperCase() || 'ORD';
    let trackingNumber = `ET-${base}-${Date.now().toString().slice(-6)}`;

    let existing = await this.prisma.order.findFirst({
      where: { trackingNumber },
    });

    while (existing) {
      trackingNumber = `ET-${base}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      existing = await this.prisma.order.findFirst({
        where: { trackingNumber },
      });
    }

    return trackingNumber;
  }

  private getOrderTimeline(order: any) {
    const timeline = [];

    if (order.createdAt) {
      timeline.push({
        status: 'Order Placed',
        date: order.createdAt,
        description: 'Your order has been placed successfully',
        completed: true,
      });
    }

    if (order.status === OrderStatus.PAID || order.status === OrderStatus.PROCESSING || 
        order.status === OrderStatus.SHIPPING || order.status === OrderStatus.DELIVERED) {
      timeline.push({
        status: 'Payment Confirmed',
        date: order.payment?.paidAt || order.createdAt,
        description: 'Payment has been confirmed',
        completed: true,
      });
    }

    if (order.status === OrderStatus.PROCESSING || order.status === OrderStatus.SHIPPING || 
        order.status === OrderStatus.DELIVERED) {
      timeline.push({
        status: 'Processing',
        date: order.updatedAt,
        description: 'Your order is being processed',
        completed: order.status !== OrderStatus.PENDING,
      });
    }

    if (order.status === OrderStatus.SHIPPING || order.status === OrderStatus.DELIVERED) {
      timeline.push({
        status: 'Shipped',
        date: order.shippedAt || order.updatedAt,
        description: `Your order has been shipped${order.trackingNumber ? ` with tracking number: ${order.trackingNumber}` : ''}`,
        completed: order.status !== OrderStatus.PROCESSING && order.status !== OrderStatus.PENDING,
      });
    }

    if (order.status === OrderStatus.DELIVERED) {
      timeline.push({
        status: 'Delivered',
        date: order.deliveredAt,
        description: 'Your order has been delivered',
        completed: true,
      });
    }

    if (order.status === OrderStatus.CANCELLED) {
      timeline.push({
        status: 'Cancelled',
        date: order.cancelledAt || order.updatedAt,
        description: order.notes?.replace('Cancelled: ', '') || 'Your order has been cancelled',
        completed: true,
      });
    }

    return timeline;
  }

  private async clearOrderCache(orderId?: number) {
    if (orderId) {
      await this.redisService.del(`order:${orderId}`);
    }
    
    const keys = await this.redisService.keys('order:*');
    for (const key of keys) {
      await this.redisService.del(key);
    }
  }
}