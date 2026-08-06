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
    const { userId, title, message, type, data, sendEmail } = sendNotificationDto;

    // Create notification in database
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
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
    data?: any;
    userFilter?: {
      role?: string;
      isActive?: boolean;
    };
  }) {
    const { title, message, type, data, userFilter } = params;

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
            data: data || null,
          },
        })
      ),
    );

    // Send emails to all users (optional - could be async)
    // This could be moved to a background job
    for (const user of users) {
      await this.mailService.sendNotificationEmail(
        user.email,
        user.name,
        title,
        message,
        type,
      ).catch(err => console.error(`Failed to send email to ${user.email}:`, err));
    }

    // Clear cache for all users
    for (const user of users) {
      await this.clearNotificationCache(user.id);
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
    },
  ) {
    const { page, limit, unreadOnly, type } = filters;
    const skip = (page - 1) * limit;

    const cacheKey = `notifications:user:${userId}:${page}:${limit}:${unreadOnly}:${type}`;
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
      type: 'ORDER',
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

  async sendSellerVerificationNotification(userId: number, storeName: string, isApproved: boolean) {
    const status = isApproved ? 'Approved' : 'Rejected';
    const message = isApproved
      ? `Congratulations! Your store "${storeName}" has been verified and is now active.`
      : `Your store "${storeName}" verification request has been rejected. Please contact support for more information.`;

    return this.sendNotification({
      userId,
      title: `Seller Verification ${status}`,
      message,
      type: 'SYSTEM',
      data: { storeName, isApproved },
      sendEmail: true,
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

  async sendLowStockAlert(productId: number, productName: string, sellerId: number, currentStock: number) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
      select: { userId: true },
    });

    if (seller) {
      return this.sendNotification({
        userId: seller.userId,
        title: 'Low Stock Alert',
        message: `Your product "${productName}" is running low! Only ${currentStock} items left.`,
        type: 'SYSTEM',
        data: { productId, productName, currentStock },
        sendEmail: true,
      });
    }
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