import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CouponDiscountType, Prisma } from '@prisma/client';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private assertValidDiscountValue(discountType: CouponDiscountType, discountValue: number) {
    if (discountType === CouponDiscountType.PERCENTAGE && discountValue > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100');
    }
  }

  // ==========================================================================
  // Admin CRUD
  // ==========================================================================

  async create(dto: CreateCouponDto) {
    this.assertValidDiscountValue(dto.discountType, dto.discountValue);
    const code = this.normalizeCode(dto.code);

    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      throw new BadRequestException(`Coupon code "${code}" already exists`);
    }

    return this.prisma.coupon.create({
      data: {
        code,
        description: dto.description,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        maxDiscountAmount: dto.maxDiscountAmount,
        minPurchaseAmount: dto.minPurchaseAmount,
        usageLimit: dto.usageLimit,
        usageLimitPerUser: dto.usageLimitPerUser ?? 1,
        isActive: dto.isActive ?? true,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  async update(id: number, dto: UpdateCouponDto) {
    const existing = await this.getForAdmin(id);

    const discountType = dto.discountType ?? existing.discountType;
    const discountValue = dto.discountValue ?? existing.discountValue;
    this.assertValidDiscountValue(discountType, discountValue);

    let code: string | undefined;
    if (dto.code) {
      code = this.normalizeCode(dto.code);
      if (code !== existing.code) {
        const clash = await this.prisma.coupon.findUnique({ where: { code } });
        if (clash) throw new BadRequestException(`Coupon code "${code}" already exists`);
      }
    }

    return this.prisma.coupon.update({
      where: { id },
      data: {
        code,
        description: dto.description,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        maxDiscountAmount: dto.maxDiscountAmount,
        minPurchaseAmount: dto.minPurchaseAmount,
        usageLimit: dto.usageLimit,
        usageLimitPerUser: dto.usageLimitPerUser,
        isActive: dto.isActive,
        startDate: dto.startDate !== undefined ? (dto.startDate ? new Date(dto.startDate) : null) : undefined,
        endDate: dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : undefined,
      },
    });
  }

  async remove(id: number) {
    await this.getForAdmin(id);
    try {
      await this.prisma.coupon.delete({ where: { id } });
    } catch (error) {
      // Usage history (CouponUsage) references this coupon with a Restrict
      // FK — deleting a coupon that's ever been redeemed fails at the DB
      // level rather than silently orphaning order records that show a
      // discount from a coupon that no longer exists.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException(
          'This coupon has already been used by customers and cannot be deleted — deactivate it instead.',
        );
      }
      throw error;
    }
    return { success: true };
  }

  async listForAdmin() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getForAdmin(id: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException(`Coupon ${id} not found`);
    return coupon;
  }

  // ==========================================================================
  // Customer-facing validation + redemption
  // ==========================================================================

  computeDiscountAmount(
    coupon: { discountType: CouponDiscountType; discountValue: number; maxDiscountAmount: number | null },
    subtotal: number,
  ): number {
    let discount =
      coupon.discountType === CouponDiscountType.PERCENTAGE
        ? (subtotal * coupon.discountValue) / 100
        : coupon.discountValue;

    if (coupon.maxDiscountAmount != null) {
      discount = Math.min(discount, coupon.maxDiscountAmount);
    }
    // Never discount more than the order itself.
    discount = Math.min(discount, subtotal);
    return Math.round(Math.max(discount, 0) * 100) / 100;
  }

  // Validates a coupon for a given customer + cart subtotal without
  // reserving/recording anything — used for the cart-page "Apply" preview,
  // and re-run again (inside a transaction, via recordUsage) at actual
  // checkout, since cart contents and coupon state can both change between
  // the two moments.
  async validateForCustomer(code: string, userId: number, subtotal: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: this.normalizeCode(code) } });

    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('Invalid or inactive coupon code');
    }

    const now = new Date();
    if (coupon.startDate && coupon.startDate > now) {
      throw new BadRequestException('This coupon is not active yet');
    }
    if (coupon.endDate && coupon.endDate < now) {
      throw new BadRequestException('This coupon has expired');
    }
    if (coupon.minPurchaseAmount && subtotal < coupon.minPurchaseAmount) {
      throw new BadRequestException(
        `This coupon requires a minimum purchase of $${coupon.minPurchaseAmount.toFixed(2)}`,
      );
    }
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }

    const userUsageCount = await this.prisma.couponUsage.count({
      where: { couponId: coupon.id, userId },
    });
    if (userUsageCount >= coupon.usageLimitPerUser) {
      throw new BadRequestException('You have already used this coupon the maximum number of times');
    }

    const discountAmount = this.computeDiscountAmount(coupon, subtotal);
    return { coupon, discountAmount };
  }

  // Powers the "Available Coupons" list on the cart page — every coupon the
  // customer could plausibly use, not just one specific code. Coupons the
  // customer hasn't hit their subtotal minimum for yet are still included
  // (with meetsMinimum: false) rather than hidden, so the UI can show
  // "spend $X more to unlock this" instead of the coupon just not existing.
  async listAvailableForCustomer(userId: number, subtotal: number) {
    const now = new Date();
    const coupons = await this.prisma.coupon.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    const available: Array<{
      code: string;
      description: string | null;
      discountType: CouponDiscountType;
      discountValue: number;
      minPurchaseAmount: number | null;
      maxDiscountAmount: number | null;
      meetsMinimum: boolean;
      discountAmount: number;
    }> = [];

    for (const coupon of coupons) {
      if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) continue;

      const userUsageCount = await this.prisma.couponUsage.count({
        where: { couponId: coupon.id, userId },
      });
      if (userUsageCount >= coupon.usageLimitPerUser) continue;

      const meetsMinimum = !coupon.minPurchaseAmount || subtotal >= coupon.minPurchaseAmount;

      available.push({
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minPurchaseAmount: coupon.minPurchaseAmount,
        maxDiscountAmount: coupon.maxDiscountAmount,
        meetsMinimum,
        discountAmount: meetsMinimum ? this.computeDiscountAmount(coupon, subtotal) : 0,
      });
    }

    return available;
  }

  // Atomically records one redemption — called from inside
  // OrdersService.create's transaction, right after validateForCustomer is
  // re-run against the customer's real, final cart subtotal. The
  // conditional `usedCount: { lt: ... }` guard mirrors the stock-decrement
  // pattern OrdersService already uses for order line items: if two
  // checkouts race for the last redemption, only one succeeds and the
  // other gets a clear "just ran out" error instead of silently
  // over-redeeming the coupon.
  async recordUsage(
    tx: Prisma.TransactionClient,
    coupon: { id: number; usageLimit: number | null },
    userId: number,
    discountAmount: number,
  ) {
    const updateResult = await tx.coupon.updateMany({
      where: {
        id: coupon.id,
        isActive: true,
        ...(coupon.usageLimit != null ? { usedCount: { lt: coupon.usageLimit } } : {}),
      },
      data: { usedCount: { increment: 1 } },
    });

    if (updateResult.count === 0) {
      throw new BadRequestException('This coupon just reached its usage limit. Please remove it and try again.');
    }

    return tx.couponUsage.create({
      data: { couponId: coupon.id, userId, discountAmount },
    });
  }
}
