import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class StockNotificationsService {
  private readonly logger = new Logger(StockNotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async subscribe(userId: number, productId: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (product.stock > 0) {
      throw new BadRequestException('This product is already in stock');
    }

    const existing = await this.prisma.stockNotification.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) {
      throw new ConflictException('You are already subscribed to this product');
    }

    await this.prisma.stockNotification.create({ data: { userId, productId } });
    return { subscribed: true };
  }

  async unsubscribe(userId: number, productId: number) {
    const existing = await this.prisma.stockNotification.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (!existing) {
      throw new NotFoundException('Subscription not found');
    }
    await this.prisma.stockNotification.delete({ where: { id: existing.id } });
    return { subscribed: false };
  }

  async getStatus(userId: number, productId: number) {
    const existing = await this.prisma.stockNotification.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    return { subscribed: !!existing };
  }

  // Called from ProductsService whenever a product's stock crosses from 0
  // to a positive number (see update()/updateStock()). Deliberately never
  // throws — a notification-delivery failure must never block the stock
  // update itself, which is the real business operation this hangs off of.
  async notifySubscribers(productId: number, productName: string, productSlug: string) {
    try {
      const subscriptions = await this.prisma.stockNotification.findMany({
        where: { productId },
        select: { userId: true },
      });

      if (subscriptions.length === 0) return;

      await Promise.all(
        subscriptions.map((sub) =>
          this.notificationsService
            .sendProductBackInStockNotification(sub.userId, productId, productName, productSlug)
            .catch((error) =>
              this.logger.error(
                `Failed to notify user ${sub.userId} for product ${productId}`,
                error as Error,
              ),
            ),
        ),
      );

      // Fulfilled — cleared so a future out-of-stock period starts fresh
      // (see the model comment in schema.prisma for why there's no
      // isActive/notifiedAt flag instead).
      await this.prisma.stockNotification.deleteMany({ where: { productId } });
    } catch (error) {
      this.logger.error(`notifySubscribers failed for product ${productId}`, error as Error);
    }
  }
}
