// placeholder for src/modules/notifications/notifications.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MailService } from '../../mail/mail.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { ResponseUtil } from '../../common/utils/response.util';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationEvent, NOTIFICATION_DEFAULTS } from './notifications.constants';
import { NotificationCategory, NotificationPriority } from '@prisma/client';

function resolveClassification(
  type: string,
  category?: NotificationCategory,
  priority?: NotificationPriority,
): { category: NotificationCategory; priority: NotificationPriority } {
  const defaults = NOTIFICATION_DEFAULTS[type as NotificationEvent];
  return {
    category: category ?? defaults?.category ?? 'SYSTEM',
    priority: priority ?? defaults?.priority ?? 'INFO',
  };
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private mailService: MailService;

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private moduleRef: ModuleRef,
    private notificationsGateway: NotificationsGateway,
  ) {}

  onModuleInit() {
    this.mailService = this.moduleRef.get(MailService, { strict: false });
  }

  async sendNotification(sendNotificationDto: SendNotificationDto) {
    const { userId, title, message, type, data, sendEmail, entityType, entityId, actorId } =
      sendNotificationDto;
    const { category, priority } = resolveClassification(
      type,
      sendNotificationDto.category,
      sendNotificationDto.priority,
    );

    // Create notification in database
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        category,
        priority,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        actorId: actorId ?? null,
        data: data || null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Send email if requested
    if (sendEmail && notification.user.email) {
      await this.mailService.sendNotificationEmail(
        notification.user.email,
        notification.user.name,
        title,
        message,
        type,
      );
    }

    // Clear user's notification cache
    await this.clearNotificationCache(userId);

    this.notificationsGateway.emitNotification(userId, {
      type: 'created',
      notification,
      unreadCount: await this.getUnreadCount(userId),
    });

    return notification;
  }

  async broadcastNotification(params: {
    title: string;
    message: string;
    type: string;
    category?: NotificationCategory;
    priority?: NotificationPriority;
    entityType?: string;
    entityId?: number;
    actorId?: number;
    data?: any;
    // Defaults to false — broadcasting used to unconditionally email every
    // matched user (e.g. every active admin, on every single new order),
    // which floods inboxes for routine, already-in-app-visible events.
    // Callers opt in per event when email genuinely matters.
    sendEmail?: boolean;
    userFilter?: {
      role?: string;
      isActive?: boolean;
    };
  }) {
    const { title, message, type, data, userFilter, sendEmail = false } = params;
    const { category, priority } = resolveClassification(type, params.category, params.priority);

    // Build user query
    const userWhere: any = { isActive: true };
    if (userFilter?.role) {
      userWhere.role = userFilter.role;
    }

    // Get all users
    const users = await this.prisma.user.findMany({
      where: userWhere,
      select: { id: true, email: true, name: true },
    });

    // Create notifications for all users
    const notifications = await this.prisma.$transaction(
      users.map(user =>
        this.prisma.notification.create({
          data: {
            userId: user.id,
            title,
            message,
            type,
            category,
            priority,
            entityType: params.entityType ?? null,
            entityId: params.entityId ?? null,
            actorId: params.actorId ?? null,
            data: data || null,
          },
        })
      ),
    );

    if (sendEmail) {
      for (const user of users) {
        await this.mailService.sendNotificationEmail(
          user.email,
          user.name,
          title,
          message,
          type,
        ).catch(err => console.error(`Failed to send email to ${user.email}:`, err));
      }
    }

    // Clear cache and push realtime updates to every recipient — without
    // this, broadcast-created rows (e.g. "New Order Received" to all
    // admins) only ever surfaced via the separate, non-persisted
    // OrderEventsGateway push; a plain browser refresh of the bell dropdown
    // was the only way to see them otherwise.
    const unreadCounts = new Map<number, number>();
    for (const notification of notifications) {
      await this.clearNotificationCache(notification.userId);
      const unreadCount = await this.getUnreadCount(notification.userId);
      unreadCounts.set(notification.userId, unreadCount);
      this.notificationsGateway.emitNotification(notification.userId, {
        type: 'created',
        notification,
        unreadCount,
      });
    }

    return {
      total: notifications.length,
      message: `Broadcast sent to ${notifications.length} users`,
    };
  }

  async getUserNotifications(
    userId: number,
    filters: {
      page: number;
      limit: number;
      unreadOnly?: boolean;
      type?: string;
      category?: NotificationCategory;
    },
  ) {
    const { page, limit, unreadOnly, type, category } = filters;
    const skip = (page - 1) * limit;

    const cacheKey = `notifications:user:${userId}:${page}:${limit}:${unreadOnly}:${type}:${category}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const where: any = { userId };

    if (unreadOnly) {
      where.isRead = false;
    }

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    const result = ResponseUtil.paginate(notifications, total, page, limit);
    
    // Cache for 1 minute (notifications change frequently)
    await this.redisService.set(cacheKey, JSON.stringify(result), 60);

    return result;
  }

  async getUnreadCount(userId: number) {
    const cacheKey = `notifications:unread:${userId}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return parseInt(cached, 10);
    }

    const count = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    await this.redisService.set(cacheKey, count.toString(), 30);

    return count;
  }

  async getNotification(id: number, userId: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('You can only access your own notifications');
    }

    return notification;
  }

  async markAsRead(id: number, userId: number) {
    const notification = await this.getNotification(id, userId);

    if (notification.isRead) {
      return notification;
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    // Clear caches
    await this.clearNotificationCache(userId);

    this.notificationsGateway.emitNotification(userId, {
      type: 'updated',
      notification: updated,
      unreadCount: await this.getUnreadCount(userId),
    });

    return updated;
  }

  async markAllAsRead(userId: number) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Clear caches
    await this.clearNotificationCache(userId);

    this.notificationsGateway.emitNotification(userId, {
      type: 'updated',
      count: result.count,
      unreadCount: 0,
    });

    return result.count;
  }

  async deleteNotification(id: number, userId: number, userRole: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    if (notification.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You can only delete your own notifications');
    }

    await this.prisma.notification.delete({
      where: { id },
    });

    // Clear caches
    await this.clearNotificationCache(userId);
  }

  async clearAllNotifications(userId: number) {
    await this.prisma.notification.deleteMany({
      where: { userId },
    });

    // Clear caches
    await this.clearNotificationCache(userId);
  }

  async getAllNotifications(pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count(),
    ]);

    return ResponseUtil.paginate(notifications, total, page, limit);
  }

  async adminDeleteNotification(id: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    await this.prisma.notification.delete({
      where: { id },
    });

    // Clear user's cache
    await this.clearNotificationCache(notification.userId);
  }

  // Helper methods for creating specific notification types
  async sendOrderStatusNotification(orderId: number, userId: number, status: string) {
    return this.sendNotification({
      userId,
      title: `Order ${status}`,
      message: `Your order #${orderId} status has been updated to ${status}`,
      type: NotificationEvent.ORDER_STATUS_CHANGED,
      entityType: 'ORDER',
      entityId: orderId,
      data: { orderId, status },
      sendEmail: true,
    });
  }

  async sendPaymentConfirmationNotification(orderId: number, userId: number, amount: number) {
    return this.sendNotification({
      userId,
      title: 'Payment Confirmed',
      message: `Your payment of $${amount} for order #${orderId} has been confirmed`,
      type: 'PAYMENT',
      data: { orderId, amount },
      sendEmail: true,
    });
  }

  async sendProductBackInStockNotification(userId: number, productId: number, productName: string) {
    return this.sendNotification({
      userId,
      title: 'Back in Stock!',
      message: `${productName} is back in stock. Shop now before it runs out!`,
      type: 'PROMO',
      data: { productId },
      sendEmail: false,
    });
  }

  async sendSellerVerificationNotification(
    userId: number,
    storeName: string,
    isApproved: boolean,
    sellerId?: number,
    rejectionReason?: string,
  ) {
    const status = isApproved ? 'Approved' : 'Rejected';
    const message = isApproved
      ? `Congratulations! Your store "${storeName}" has been verified and is now active.`
      : `Your store "${storeName}" verification request has been rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ' Please contact support for more information.'}`;

    return this.sendNotification({
      userId,
      title: `Seller Verification ${status}`,
      message,
      type: isApproved ? NotificationEvent.SELLER_APPROVED : NotificationEvent.SELLER_REJECTED,
      entityType: 'SELLER',
      entityId: sellerId,
      data: { storeName, isApproved, sellerId, rejectionReason },
      sendEmail: false, // sellers.service.ts already sends a dedicated approval/rejection email
    });
  }

  // Admins have no per-seller room to target directly — this is the
  // "New Seller Registration" admin alert, so it goes out the same way
  // "New Order Received" does: one persisted, realtime-pushed row per
  // active admin.
  async notifySellerRegistered(sellerId: number, storeName: string, ownerName: string) {
    return this.broadcastNotification({
      title: 'New Seller Registration',
      message: `${ownerName} registered a new store "${storeName}" and is awaiting verification.`,
      type: NotificationEvent.SELLER_REGISTERED,
      entityType: 'SELLER',
      entityId: sellerId,
      data: { sellerId, storeName, ownerName },
      userFilter: { role: 'ADMIN', isActive: true },
    });
  }

  // The single most important admin alert in the bank-transfer flow — a
  // customer just uploaded a receipt and a payment is sitting unreviewed.
  // Previously nothing (not even email) fired here; see the audit report.
  async notifyPaymentReceiptUploaded(paymentId: number, orderId: number, orderNumber: string, amount: number) {
    return this.broadcastNotification({
      title: 'Payment Receipt Uploaded',
      message: `A bank transfer receipt was uploaded for order ${orderNumber} ($${amount.toFixed(2)}). Verification is required.`,
      type: NotificationEvent.PAYMENT_RECEIPT_UPLOADED,
      entityType: 'PAYMENT',
      entityId: paymentId,
      data: { paymentId, orderId, orderNumber, amount },
      userFilter: { role: 'ADMIN', isActive: true },
    });
  }

  async notifyPaymentApproved(userId: number, paymentId: number, orderId: number, orderNumber: string, amount: number) {
    return this.sendNotification({
      userId,
      title: 'Payment Approved',
      message: `Your payment of $${amount.toFixed(2)} for order ${orderNumber} has been approved.`,
      type: NotificationEvent.PAYMENT_APPROVED,
      entityType: 'PAYMENT',
      entityId: paymentId,
      data: { paymentId, orderId, orderNumber, amount },
      sendEmail: false, // payments.service.ts already sends a dedicated confirmation email
    });
  }

  async notifyPaymentRejected(userId: number, paymentId: number, orderId: number, orderNumber: string, reason: string) {
    return this.sendNotification({
      userId,
      title: 'Payment Rejected',
      message: `Your payment for order ${orderNumber} was rejected. Reason: ${reason}`,
      type: NotificationEvent.PAYMENT_REJECTED,
      entityType: 'PAYMENT',
      entityId: paymentId,
      data: { paymentId, orderId, orderNumber, reason },
      sendEmail: false,
    });
  }

  async notifyRefundRequested(refundId: number, orderId: number, orderNumber: string, amount: number) {
    return this.broadcastNotification({
      title: 'Refund Requested',
      message: `A refund of $${amount.toFixed(2)} was requested for order ${orderNumber}.`,
      type: NotificationEvent.REFUND_REQUESTED,
      entityType: 'PAYMENT',
      entityId: refundId,
      data: { refundId, orderId, orderNumber, amount },
      userFilter: { role: 'ADMIN', isActive: true },
    });
  }

  async notifyRefundDecision(
    userId: number,
    refundId: number,
    orderId: number,
    orderNumber: string,
    amount: number,
    isApproved: boolean,
    reason?: string,
  ) {
    return this.sendNotification({
      userId,
      title: isApproved ? 'Refund Approved' : 'Refund Rejected',
      message: isApproved
        ? `Your refund of $${amount.toFixed(2)} for order ${orderNumber} has been approved.`
        : `Your refund request for order ${orderNumber} was rejected.${reason ? ` Reason: ${reason}` : ''}`,
      type: isApproved ? NotificationEvent.REFUND_APPROVED : NotificationEvent.REFUND_REJECTED,
      entityType: 'PAYMENT',
      entityId: refundId,
      data: { refundId, orderId, orderNumber, amount, reason },
      sendEmail: false,
    });
  }

  async sendWelcomeNotification(userId: number, userName: string) {
    return this.sendNotification({
      userId,
      title: 'Welcome to E-commerce Timor-Leste!',
      message: `Hi ${userName}, welcome to our platform! Start exploring products and enjoy shopping.`,
      type: 'SYSTEM',
      data: null,
      sendEmail: false,
    });
  }

  async sendPromotionalNotification(userId: number, title: string, message: string, data?: any) {
    return this.sendNotification({
      userId,
      title,
      message,
      type: 'PROMO',
      data,
      sendEmail: false,
    });
  }

  async sendNewReviewNotification(productId: number, productName: string, sellerId: number) {
    // Notify seller about new review
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
      select: { userId: true },
    });

    if (seller) {
      return this.sendNotification({
        userId: seller.userId,
        title: 'New Review',
        message: `Your product "${productName}" has received a new review`,
        type: 'REVIEW',
        data: { productId, productName },
        sendEmail: true,
      });
    }
  }

  // Fires once when stock crosses the threshold (caller is responsible for
  // only calling this on the crossing, not on every decrement — see
  // ProductsService.decrementStockAndNotify) — notifies both the owning
  // seller and admins, matching Section 5's "Low Stock" / "Out of Stock"
  // event definitions.
  async sendLowStockAlert(productId: number, productName: string, sellerId: number, currentStock: number) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
      select: { userId: true },
    });

    const isOutOfStock = currentStock <= 0;
    const event = isOutOfStock ? NotificationEvent.PRODUCT_OUT_OF_STOCK : NotificationEvent.PRODUCT_LOW_STOCK;
    const title = isOutOfStock ? 'Out of Stock' : 'Low Stock Alert';
    const message = isOutOfStock
      ? `Product "${productName}" is now out of stock.`
      : `Product "${productName}" is running low — only ${currentStock} left.`;

    if (seller) {
      await this.sendNotification({
        userId: seller.userId,
        title,
        message,
        type: event,
        entityType: 'PRODUCT',
        entityId: productId,
        data: { productId, productName, currentStock },
        sendEmail: true,
      });
    }

    return this.broadcastNotification({
      title,
      message,
      type: event,
      entityType: 'PRODUCT',
      entityId: productId,
      data: { productId, productName, currentStock, sellerId },
      userFilter: { role: 'ADMIN', isActive: true },
    });
  }

  private async clearNotificationCache(userId: number) {
    // Clear paginated notification lists
    const keys = await this.redisService.keys(`notifications:user:${userId}:*`);
    for (const key of keys) {
      await this.redisService.del(key);
    }
    await this.redisService.del(`notifications:unread:${userId}`);
  }
}