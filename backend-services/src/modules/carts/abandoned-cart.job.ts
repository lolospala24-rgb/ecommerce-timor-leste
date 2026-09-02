import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';

// A cart is "abandoned" once it's been untouched for a full day — long
// enough that it's clearly not a customer still mid-checkout. The upper
// bound keeps the window from also matching carts abandoned weeks ago that
// were never converted (already reminded once, or just genuinely stale) —
// this job runs every 6h, so a 24h-wide window is comfortably covered by
// several passes before a cart ages out of it.
const ABANDONED_AFTER_HOURS = 24;
const REMINDER_WINDOW_HOURS = 24;

@Injectable()
export class AbandonedCartJob {
  private readonly logger = new Logger(AbandonedCartJob.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async sweepAbandonedCarts() {
    let carts: Awaited<ReturnType<typeof this.loadCandidateCarts>>;
    try {
      carts = await this.loadCandidateCarts();
    } catch (error) {
      this.logger.error(
        `AbandonedCartJob failed to load candidate carts: ${error instanceof Error ? error.message : error}`,
      );
      return;
    }

    const now = Date.now();
    let sent = 0;

    for (const cart of carts) {
      if (cart.items.length === 0) continue;

      // CartItem mutations never touch the parent Cart row (see
      // carts.service.ts), so Cart.updatedAt doesn't reflect real activity
      // — the latest CartItem.updatedAt across the cart does.
      const lastActivity = Math.max(...cart.items.map((item) => item.updatedAt.getTime()));
      const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60);

      if (
        hoursSinceActivity < ABANDONED_AFTER_HOURS ||
        hoursSinceActivity >= ABANDONED_AFTER_HOURS + REMINDER_WINDOW_HOURS
      ) {
        continue;
      }

      // Already reminded since this activity — a customer who comes back
      // and changes their cart becomes eligible again next window, but a
      // cart untouched since the last reminder should not be re-sent every
      // 6h for the rest of its time in the window.
      if (cart.reminderSentAt && cart.reminderSentAt.getTime() >= lastActivity) continue;

      const items = cart.items
        .filter((item) => item.product?.isActive !== false)
        .map((item) => ({
          name: item.product?.name ?? 'Item',
          quantity: item.quantity,
          price: item.variant?.price ?? item.product?.price ?? 0,
        }));

      // Every item was deactivated/deleted since it was added — nothing
      // left worth reminding about.
      if (items.length === 0) continue;

      try {
        const ok = await this.mailService.sendAbandonedCartEmail(cart.user.email, cart.user.name, items);
        if (ok) {
          await this.prisma.cart.update({
            where: { id: cart.id },
            data: { reminderSentAt: new Date() },
          });
          sent++;
        }
      } catch (error) {
        this.logger.error(
          `Failed to send abandoned-cart reminder for cart ${cart.id}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    if (sent > 0) {
      this.logger.log(`Sent ${sent} abandoned-cart reminder email(s)`);
    }
  }

  private loadCandidateCarts() {
    return this.prisma.cart.findMany({
      where: { items: { some: {} } },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: {
            product: { select: { name: true, price: true, isActive: true } },
            variant: { select: { price: true } },
          },
        },
      },
    });
  }
}
