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
import { SettingsService } from '../settings/settings.service';
import { FinanceService } from '../finance/finance.service';
import { RefundsService } from '../finance/refunds.service';
import { CouponsService } from '../coupons/coupons.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { LOW_STOCK_THRESHOLD, NotificationEvent } from '../notifications/notifications.constants';
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
    private settingsService: SettingsService,
    private financeService: FinanceService,
    private refundsService: RefundsService,
    private notificationsGateway: NotificationsGateway,
    private couponsService: CouponsService,
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
            variant: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // A variant can be deactivated, deleted (setting variantId to null via
    // the FK's onDelete: SetNull), or run out of stock between add-to-cart
    // and checkout — cart-add already checked these, but that check is
    // stale by the time the customer actually places the order, so it's
    // re-verified here rather than trusted from the cart row.
    for (const item of cart.items) {
      if (item.variantId != null && (!item.variant || item.variant.productId !== item.productId)) {
        throw new BadRequestException(
          `"${item.product.name}" has a selected option that no longer exists. Please update your cart.`,
        );
      }
      if (item.variant && !item.variant.isActive) {
        throw new BadRequestException(
          `The selected option for "${item.product.name}" is no longer available. Please choose a different option.`,
        );
      }
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
      const unitPrice = item.variant?.price ?? item.product.price;
      group.items.push(item);
      group.subtotal += item.quantity * unitPrice;
    }

    // Delivery address is the same for every seller group in this checkout,
    // so it's fetched once up front instead of once per seller. Scoped to
    // userId — without this, any authenticated customer could pass another
    // user's addressId and have their order shipped/priced against it.
    const address = await this.prisma.address.findFirst({
      where: { id: createOrderDto.addressId, userId, isActive: true },
    });
    if (!address) {
      throw new BadRequestException('Selected delivery address not found');
    }

    // Tax rate and service fee are platform settings, not client input —
    // any taxAmount/serviceFee sent by the client is accepted for backward
    // compatibility but ignored below so a request can't undercharge itself.
    const settings = await this.settingsService.getSettings();
    const taxRate = Number(settings.taxRate ?? 0);
    const flatServiceFee = Number(settings.serviceFee ?? 0);

    if (createOrderDto.paymentMethod === PaymentMethod.COD && !settings.enableCOD) {
      throw new BadRequestException('Cash on Delivery is currently unavailable');
    }
    if (createOrderDto.paymentMethod === PaymentMethod.BANK_TRANSFER && !settings.enableBankTransfer) {
      throw new BadRequestException('Bank transfer is currently unavailable');
    }

    // Validate + atomically redeem the coupon (if any) once for the whole
    // checkout, before any orders/stock changes happen — a coupon applies
    // to the full cart, not per seller, and its discount amount is split
    // proportionally across each seller's Order below (each seller gets
    // its own Order row; see the seller-grouping loop above).
    const cartSubtotal: number = Array.from(sellerGroups.values()).reduce(
      (sum: number, g: any) => sum + g.subtotal,
      0,
    );
    let appliedCoupon: { couponUsageId: number; totalDiscount: number } | null = null;
    if (createOrderDto.couponCode) {
      const { coupon, discountAmount } = await this.couponsService.validateForCustomer(
        createOrderDto.couponCode,
        userId,
        cartSubtotal,
      );
      const usage = await this.prisma.$transaction((tx) =>
        this.couponsService.recordUsage(tx, coupon, userId, discountAmount),
      );
      appliedCoupon = { couponUsageId: usage.id, totalDiscount: discountAmount };
    }

    // Create orders for each seller
    const orders = [];
    const orderNumberPrefix = `ORD-${Date.now()}-`;
    const sellerGroupList = Array.from(sellerGroups.values());
    let distributedDiscount = 0;

    for (let groupIndex = 0; groupIndex < sellerGroupList.length; groupIndex++) {
      const group = sellerGroupList[groupIndex];
      if (!group.sellerId) {
        throw new BadRequestException('Invalid seller information for one or more cart items');
      }

      if (!Array.isArray(group.items) || group.items.length === 0) {
        throw new BadRequestException('No order items found for the selected seller');
      }

      const invalidItems = group.items.filter((item: any) => {
        const price = item.variant?.price ?? item.product?.price;
        return (
          !item.product ||
          item.productId == null ||
          item.quantity == null ||
          item.quantity <= 0 ||
          price == null ||
          !Number.isFinite(price)
        );
      });

      if (invalidItems.length > 0) {
        throw new BadRequestException('One or more cart items contain invalid product or pricing data');
      }

      const shippingResult = await this.shippingService.calculateShippingCost({
        municipality: address?.municipality,
        municipalityId: address?.municipalityId ?? undefined,
        provinceId: address?.provinceId ?? undefined,
        shippingMethod: createOrderDto.shippingMethod,
        subtotal: group.subtotal,
        courierId: createOrderDto.courierId,
        courierServiceId: createOrderDto.courierServiceId,
        shippingZoneId: createOrderDto.shippingZoneId,
      });
      const shippingCost = Number(shippingResult.shippingCost);

      // A courierId was explicitly selected at checkout but no active rate
      // matched it for this address — don't silently fall back to the
      // default shipping cost, that would let a tampered/stale courierId
      // slip an order through for a courier that doesn't actually serve
      // this municipality.
      if (createOrderDto.courierId && shippingResult.shippingZoneId == null) {
        throw new BadRequestException('The selected courier is no longer available for this delivery address. Please choose a different shipping option.');
      }

      if (!Number.isFinite(shippingCost) || shippingCost < 0) {
        throw new BadRequestException('Calculated shipping cost is invalid');
      }

      if (!Number.isFinite(group.subtotal) || group.subtotal < 0) {
        throw new BadRequestException('Cart subtotal is invalid');
      }

      // This seller's proportional share of the cart-wide coupon discount.
      // The last group absorbs whatever's left after rounding every earlier
      // share to the cent, so the shares always sum to exactly
      // appliedCoupon.totalDiscount rather than drifting a cent off from
      // rounding each share independently.
      let discountShare = 0;
      if (appliedCoupon) {
        const isLastGroup = groupIndex === sellerGroupList.length - 1;
        discountShare = isLastGroup
          ? Math.round((appliedCoupon.totalDiscount - distributedDiscount) * 100) / 100
          : Math.round(((appliedCoupon.totalDiscount * group.subtotal) / cartSubtotal) * 100) / 100;
        distributedDiscount += discountShare;
      }
      const discountedSubtotal = Math.round((group.subtotal - discountShare) * 100) / 100;

      // Rounded to cents at the point of calculation — a percentage tax on
      // a subtotal that already has cents (e.g. 8% of $84.30 = $6.744) is a
      // real fractional-cent value, not float noise, and it must not
      // propagate unrounded into `total`/Payment.amount or every downstream
      // consumer (refund default amount, commission base, invoices) ends up
      // a fraction of a cent off the number the customer actually saw and paid.
      // Tax is computed on the post-discount subtotal — the customer is
      // taxed on what they actually paid for the goods, not the pre-coupon
      // sticker price.
      const taxAmount = Math.round(((discountedSubtotal * taxRate) / 100) * 100) / 100;
      const serviceFee = flatServiceFee;
      const total = Math.round((discountedSubtotal + shippingCost + taxAmount + serviceFee) * 100) / 100;
      if (!Number.isFinite(total) || total < 0) {
        throw new BadRequestException('Order total is invalid');
      }

      if (createOrderDto.paymentMethod === PaymentMethod.COD) {
        const minCOD = Number(settings.minCODOrderAmount ?? 0);
        const maxCOD = Number(settings.maxCODOrderAmount ?? 0);
        if (minCOD > 0 && total < minCOD) {
          throw new BadRequestException(`Cash on Delivery requires a minimum order of $${minCOD.toFixed(2)}`);
        }
        if (maxCOD > 0 && total > maxCOD) {
          throw new BadRequestException(`Cash on Delivery is not available for orders over $${maxCOD.toFixed(2)}`);
        }
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
        discountAmount: discountShare,
        couponUsageId: appliedCoupon?.couponUsageId ?? null,
        total,
        status: OrderStatus.PENDING,
        paymentMethod: createOrderDto.paymentMethod,
        addressId: createOrderDto.addressId,
        shippingZoneId: shippingResult.shippingZoneId,
        courier: shippingResult.courierName,
        notes: createOrderDto.notes,
        items: {
          create: group.items.map((item) => {
            const unitPrice = item.variant?.price ?? item.product.price;
            return {
              productId: item.productId,
              variantId: item.variantId ?? null,
              quantity: item.quantity,
              price: unitPrice,
              total: item.quantity * unitPrice,
            };
          }),
        },
      };

      let order;
      // Populated (base-product items only — variant-level stock isn't
      // modeled by the low-stock notification yet) whenever this order's
      // decrement crosses the low-stock/out-of-stock line, so it fires
      // exactly once per crossing rather than once per order that happens
      // to touch an already-low product.
      const lowStockAlerts: Array<{ productId: number; productName: string; sellerId: number; newStock: number }> = [];
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
            // Variant and base-product stock are separate pools (mirrors
            // cart-add's `currentVariant ? currentVariant.stock : prod.stock`
            // check) — a variant-bearing product's own Product.stock is not
            // touched by a variant purchase, only the selected variant's row is.
            const stockUpdate = item.variantId
              ? await tx.productVariant.updateMany({
                  where: { id: item.variantId, stock: { gte: item.quantity } },
                  data: { stock: { decrement: item.quantity } },
                })
              : await tx.product.updateMany({
                  where: { id: item.productId, stock: { gte: item.quantity } },
                  data: { stock: { decrement: item.quantity } },
                });

            if (stockUpdate.count === 0) {
              throw new BadRequestException(
                `Insufficient stock for "${item.product.name}". Please adjust the quantity in your cart and try again.`,
              );
            }

            if (!item.variantId) {
              const beforeStock = item.product.stock;
              if (beforeStock > LOW_STOCK_THRESHOLD) {
                const afterStock = beforeStock - item.quantity;
                if (afterStock <= LOW_STOCK_THRESHOLD) {
                  lowStockAlerts.push({
                    productId: item.productId,
                    productName: item.product.name,
                    sellerId: group.sellerId,
                    newStock: Math.max(afterStock, 0),
                  });
                }
              }
            }
          }

          const createdOrder = await tx.order.create({
            data: orderCreateData,
            include: {
              items: {
                include: {
                  product: true,
                  variant: true,
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
      } catch (error) {
        this.logger.error(
          `Order create failed for seller ${group.sellerId}: ${error instanceof Error ? error.message : error}`,
          error instanceof Error ? error.stack : undefined,
        );
        throw error;
      }

      orders.push(order);

      // The order (with stock reserved and payment record, if COD) is
      // already committed at this point — everything below is best-effort
      // notification. A flaky mail server or websocket hiccup must never
      // surface as a request failure for an order that actually succeeded,
      // which is why this has its own try/catch that only logs.
      try {
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
          type: NotificationEvent.ORDER_CREATED,
          entityType: 'ORDER',
          entityId: order.id,
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
          type: NotificationEvent.ORDER_CREATED,
          entityType: 'ORDER',
          entityId: order.id,
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

        this.notificationsGateway.emitOrderCreated({
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

        // One alert per threshold crossing (captured during the stock
        // decrement above), not one per unit sold — buying the item that
        // takes a product from 11 down to 9 fires once; further purchases
        // that keep it under the threshold don't re-fire.
        for (const alert of lowStockAlerts) {
          await this.notificationsService.sendLowStockAlert(
            alert.productId,
            alert.productName,
            alert.sellerId,
            alert.newStock,
          );
        }
      } catch (notifyError) {
        this.logger.error(
          `Order ${order.orderNumber} was created successfully, but post-order notifications failed: ${notifyError instanceof Error ? notifyError.message : notifyError}`,
          notifyError instanceof Error ? notifyError.stack : undefined,
        );
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
          couponUsage: { select: { coupon: { select: { code: true } } } },
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
          couponUsage: { select: { coupon: { select: { code: true } } } },
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
          couponUsage: { select: { coupon: { select: { code: true } } } },
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
                slug: true,
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
        couponUsage: { select: { coupon: { select: { code: true } } } },
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
            variant: true,
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
    }

    if (updateOrderStatusDto.status === OrderStatus.CANCELLED) {
      updateData.cancelledAt = new Date();

      // Restore stock — variant and base-product stock are separate pools
      // (see orders.service.ts create()), so a variant purchase restores
      // only that variant's row, not the parent Product's.
      for (const item of order.items) {
        if (item.variantId) {
          await this.prisma.productVariant.updateMany({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        } else {
          await this.productsService.updateStock(
            item.productId,
            item.quantity,
            'add',
            order.seller.userId,
          );
        }
      }
    }

    const orderInclude = {
      customer: true,
      seller: true,
      items: {
        include: {
          product: true,
        },
      },
    } as const;

    // DELIVERED needs the order-status write, the COD payment-paid write,
    // and the finance-ledger writes (commission snapshot for COD — its
    // payment only becomes PAID at this exact moment — plus releasing
    // pending -> available earnings) to succeed or fail together, so it
    // gets its own transaction rather than the plain single-table update
    // every other status transition uses.
    const updatedOrder =
      targetStatus === OrderStatus.DELIVERED
        ? await this.prisma.$transaction(async (tx) => {
            if (order.paymentMethod === PaymentMethod.COD) {
              await tx.payment.update({
                where: { orderId: order.id },
                data: { status: PaymentStatus.PAID, paidAt: new Date() },
              });
              await this.financeService.recordSaleOnPaymentConfirmed(tx, order.id);
            }

            const result = await tx.order.update({
              where: { id },
              data: updateData,
              include: orderInclude,
            });

            await this.financeService.releaseEarningsOnDelivery(tx, order.id);

            return result;
          })
        : await this.prisma.order.update({
            where: { id },
            data: updateData,
            include: orderInclude,
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

    this.notificationsGateway.emitOrderUpdated(updatedOrder.id, {
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
            variant: true,
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

    // Restore stock — variant and base-product stock are separate pools,
    // see orders.service.ts create().
    for (const item of order.items) {
      if (item.variantId) {
        await this.prisma.productVariant.updateMany({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      } else {
        await this.productsService.updateStock(
          item.productId,
          item.quantity,
          'add',
          order.seller.userId,
        );
      }
    }

    const cancelledOrder = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        notes: reason ? `Cancelled: ${reason}` : order.notes,
      },
    });

    // If it was already paid, this isn't just a status flip anymore — it
    // goes through RefundsService so the seller's earnings ledger is
    // reversed correctly (auto-approved: cancelling before the seller has
    // shipped anything is unambiguous, see createAndApproveForCancellation).
    const payment = await this.prisma.payment.findUnique({
      where: { orderId: id },
    });

    if (payment && payment.status === PaymentStatus.PAID) {
      await this.refundsService.createAndApproveForCancellation(
        id,
        userId,
        reason || 'Order cancelled by customer',
        userId,
      );
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

  /**
   * System-triggered counterpart to cancelOrder() for an abandoned
   * bank-transfer order — no receipt ever uploaded, past
   * SystemSettings.paymentExpiryHours. Called by PaymentExpiryJob, not a
   * customer, so there's no ownership check. Payment was never confirmed
   * (still PENDING), so unlike cancelOrder() there's no seller-earnings
   * reversal to run through RefundsService — nothing was ever credited.
   */
  async expireUnpaidOrder(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        seller: { include: { user: true } },
        items: { include: { product: true, variant: true } },
        payment: true,
      },
    });

    if (!order || !order.payment) return;
    if (order.status !== OrderStatus.PENDING) return;
    if (order.payment.status !== PaymentStatus.PENDING) return;

    for (const item of order.items) {
      if (item.variantId) {
        await this.prisma.productVariant.updateMany({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      } else {
        await this.productsService.updateStock(item.productId, item.quantity, 'add', order.seller.userId);
      }
    }

    await this.prisma.payment.update({
      where: { id: order.payment.id },
      data: { status: PaymentStatus.FAILED, notes: 'Expired — no receipt uploaded within the payment window' },
    });

    const cancelledOrder = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED, cancelledAt: new Date(), notes: 'Cancelled: payment expired, no receipt uploaded' },
    });

    await this.mailService.sendOrderCancelledEmail(
      order.customer.email,
      order.customer.name,
      cancelledOrder,
      'Payment window expired — no receipt was uploaded in time',
    );

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

    const confirmedOrder = await this.prisma.$transaction(async (tx) => {
      if (order.paymentMethod === PaymentMethod.COD) {
        await tx.payment.update({
          where: { orderId: id },
          data: { status: PaymentStatus.PAID, paidAt: new Date() },
        });
        await this.financeService.recordSaleOnPaymentConfirmed(tx, id);
      }

      const result = await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.DELIVERED,
          deliveredAt: new Date(),
        },
      });

      await this.financeService.releaseEarningsOnDelivery(tx, id);

      return result;
    });

    await this.clearOrderCache(id);

    return confirmedOrder;
  }

  // Thin passthrough — RefundsService owns eligibility rules (DELIVERED +
  // 7-day window), the Refund record, and admin notification via the
  // pending-refunds queue. Kept on OrdersService so OrdersController's
  // existing :id/request-refund route doesn't need to change.
  async requestRefund(id: number, userId: number, reason: string, amount?: number) {
    const refund = await this.refundsService.requestRefund(id, userId, reason, amount);
    await this.clearOrderCache(id);
    return refund;
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
          couponUsage: { select: { coupon: { select: { code: true } } } },
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
                sku: true,
                thumbnail: true,
              },
            },
            variant: {
              select: {
                sku: true,
                attributes: true,
              },
            },
          },
        },
        address: true,
        payment: true,
        couponUsage: { select: { coupon: { select: { code: true } } } },
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

    // DELIVERED orders are completed, financially-realized transactions —
    // permanently deleting one would destroy the only record of that sale,
    // its payment, and its seller-earnings ledger entries, with no way to
    // reconcile afterward. Only CANCELLED is even a candidate.
    if (order.status !== OrderStatus.CANCELLED) {
      throw new BadRequestException('Only cancelled orders can be deleted. Delivered orders are financial records and cannot be removed.');
    }

    // A CANCELLED order can *also* carry real financial history now — a
    // customer cancelling a PAID order goes through RefundsService, which
    // leaves a Refund row and SellerLedgerEntry rows referencing this order
    // (see cancelOrder()). Those are financial records too, so a cancelled
    // order is only actually safe to erase if it never got that far: no
    // payment ever succeeded, meaning no ledger entry exists for it. This
    // also happens to be exactly what the FK constraints on Payment/Refund/
    // SellerLedgerEntry.orderId would enforce anyway — checking explicitly
    // here just turns that into a clean 400 instead of a raw constraint error.
    const hasFinancialHistory = await this.prisma.sellerLedgerEntry.findFirst({
      where: { orderId: id },
      select: { id: true },
    });
    if (hasFinancialHistory) {
      throw new BadRequestException(
        'This order has financial history (a completed payment, refund, or ledger entry) and cannot be deleted.',
      );
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