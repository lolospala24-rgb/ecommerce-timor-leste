import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ResponseUtil } from '../../common/utils/response.util';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionDiscountType } from '@prisma/client';

export type PromotionStatus = 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'DEACTIVATED';

export interface ActivePromotionSummary {
  id: number;
  name: string;
  discountType: PromotionDiscountType;
  discountValue: number;
  endAt: Date;
}

// Single trusted source for Promotion pricing/status logic, used both by
// this module's own CRUD and — via getActivePromotionMap/computeEffectivePrice
// /attachPricing — by ProductsService, CartsService, SellersService and
// OrdersService so every surface (listing, detail, seller store, cart,
// checkout) resolves the exact same number. Promotion never writes to
// Product.price/ProductVariant.price; it's a read-time overlay only.
@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  private async requireSeller(userId: number) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found for this account');
    return seller;
  }

  private validateDiscount(discountType: PromotionDiscountType, discountValue: number) {
    if (!Number.isFinite(discountValue)) {
      throw new BadRequestException('Discount value is invalid');
    }
    if (discountType === PromotionDiscountType.PERCENTAGE) {
      if (discountValue <= 0 || discountValue > 100) {
        throw new BadRequestException('Percentage discount must be greater than 0 and at most 100');
      }
    } else {
      if (discountValue <= 0) {
        throw new BadRequestException('Fixed amount discount must be greater than 0');
      }
    }
  }

  deriveStatus(promotion: { isActive: boolean; startAt: Date; endAt: Date }, now: Date = new Date()): PromotionStatus {
    if (!promotion.isActive) return 'DEACTIVATED';
    if (now < promotion.startAt) return 'SCHEDULED';
    if (now > promotion.endAt) return 'EXPIRED';
    return 'ACTIVE';
  }

  private readonly listInclude = {
    _count: { select: { items: true } },
  } as const;

  private readonly detailInclude = {
    _count: { select: { items: true } },
    items: {
      include: {
        product: { select: { id: true, name: true, thumbnail: true, price: true, stock: true, slug: true } },
      },
    },
  } as const;

  private toListDto(promotion: any, now: Date) {
    return {
      id: promotion.id,
      name: promotion.name,
      description: promotion.description,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      startAt: promotion.startAt,
      endAt: promotion.endAt,
      isActive: promotion.isActive,
      status: this.deriveStatus(promotion, now),
      productCount: promotion._count?.items ?? 0,
      createdAt: promotion.createdAt,
      updatedAt: promotion.updatedAt,
    };
  }

  private toDetailDto(promotion: any) {
    const now = new Date();
    return {
      ...this.toListDto(promotion, now),
      products: (promotion.items ?? []).map((item: any) => ({
        productId: item.productId,
        name: item.product.name,
        thumbnail: item.product.thumbnail,
        price: item.product.price,
        stock: item.product.stock,
        slug: item.product.slug,
      })),
    };
  }

  // Finds every OTHER isActive promotion (excludeId lets an edit ignore
  // itself) belonging to this seller whose [startAt,endAt] window genuinely
  // overlaps the proposed one, for any of the given products — regardless
  // of whether that other promotion is currently Scheduled or Active. This
  // is what keeps a product from ever having two live discounts at once.
  private async findConflicts(
    sellerId: number,
    params: { productIds: number[]; startAt: Date; endAt: Date; excludeId?: number },
  ) {
    if (params.productIds.length === 0) return [];
    const items = await this.prisma.promotionItem.findMany({
      where: {
        productId: { in: params.productIds },
        promotion: {
          sellerId,
          isActive: true,
          ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
          startAt: { lte: params.endAt },
          endAt: { gte: params.startAt },
        },
      },
      include: {
        product: { select: { id: true, name: true } },
        promotion: { select: { id: true, name: true } },
      },
    });
    return items.map((item) => ({
      productId: item.productId,
      productName: item.product.name,
      promotionId: item.promotion.id,
      promotionName: item.promotion.name,
    }));
  }

  private conflictError(conflicts: Array<{ productName: string; promotionName: string }>) {
    const first = conflicts[0];
    return new ConflictException({
      message: `"${first.productName}" is already included in an active promotion ("${first.promotionName}"). Remove it from this promotion or end the other one first.`,
      conflicts,
    });
  }

  async create(userId: number, dto: CreatePromotionDto) {
    const seller = await this.requireSeller(userId);
    this.validateDiscount(dto.discountType, dto.discountValue);

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (!(startAt.getTime() < endAt.getTime())) {
      throw new BadRequestException('Start date/time must be before end date/time');
    }

    const productIds = [...new Set(dto.productIds)];
    const ownedCount = await this.prisma.product.count({
      where: { id: { in: productIds }, sellerId: seller.id },
    });
    if (ownedCount !== productIds.length) {
      throw new ForbiddenException('One or more selected products do not belong to your store');
    }

    const conflicts = await this.findConflicts(seller.id, { productIds, startAt, endAt });
    if (conflicts.length > 0) throw this.conflictError(conflicts);

    const promotion = await this.prisma.promotion.create({
      data: {
        sellerId: seller.id,
        name: dto.name.trim(),
        description: dto.description?.trim() || undefined,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        startAt,
        endAt,
        isActive: dto.isActive ?? true,
        items: { create: productIds.map((productId) => ({ productId })) },
      },
      include: this.detailInclude,
    });

    return this.toDetailDto(promotion);
  }

  async update(userId: number, id: number, dto: UpdatePromotionDto) {
    const seller = await this.requireSeller(userId);
    const existing = await this.prisma.promotion.findFirst({ where: { id, sellerId: seller.id } });
    if (!existing) throw new NotFoundException('Promotion not found');

    const discountType = dto.discountType ?? existing.discountType;
    const discountValue = dto.discountValue ?? existing.discountValue;
    this.validateDiscount(discountType, discountValue);

    const startAt = dto.startAt ? new Date(dto.startAt) : existing.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : existing.endAt;
    if (!(startAt.getTime() < endAt.getTime())) {
      throw new BadRequestException('Start date/time must be before end date/time');
    }

    let productIds: number[] | undefined;
    if (dto.productIds) {
      productIds = [...new Set(dto.productIds)];
      const ownedCount = await this.prisma.product.count({
        where: { id: { in: productIds }, sellerId: seller.id },
      });
      if (ownedCount !== productIds.length) {
        throw new ForbiddenException('One or more selected products do not belong to your store');
      }
    }

    const conflictProductIds =
      productIds ??
      (await this.prisma.promotionItem.findMany({ where: { promotionId: id }, select: { productId: true } })).map(
        (i) => i.productId,
      );
    const conflicts = await this.findConflicts(seller.id, {
      productIds: conflictProductIds,
      startAt,
      endAt,
      excludeId: id,
    });
    if (conflicts.length > 0) throw this.conflictError(conflicts);

    const promotion = await this.prisma.$transaction(async (tx) => {
      if (productIds) {
        await tx.promotionItem.deleteMany({ where: { promotionId: id } });
        await tx.promotionItem.createMany({
          data: productIds.map((productId) => ({ promotionId: id, productId })),
        });
      }
      return tx.promotion.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
          discountType: dto.discountType,
          discountValue: dto.discountValue,
          startAt: dto.startAt ? startAt : undefined,
          endAt: dto.endAt ? endAt : undefined,
          isActive: dto.isActive,
        },
        include: this.detailInclude,
      });
    });

    return this.toDetailDto(promotion);
  }

  async findMine(userId: number, filters: { page: number; limit: number; status?: PromotionStatus }) {
    const seller = await this.requireSeller(userId);
    const promotions = await this.prisma.promotion.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
      include: this.listInclude,
    });

    const now = new Date();
    let mapped = promotions.map((p) => this.toListDto(p, now));
    if (filters.status) {
      mapped = mapped.filter((p) => p.status === filters.status);
    }

    const { page, limit } = filters;
    const total = mapped.length;
    const start = (page - 1) * limit;
    return ResponseUtil.paginate(mapped.slice(start, start + limit), total, page, limit);
  }

  async findOne(userId: number, id: number) {
    const seller = await this.requireSeller(userId);
    const promotion = await this.prisma.promotion.findFirst({
      where: { id, sellerId: seller.id },
      include: this.detailInclude,
    });
    if (!promotion) throw new NotFoundException('Promotion not found');
    return this.toDetailDto(promotion);
  }

  async deactivate(userId: number, id: number) {
    const seller = await this.requireSeller(userId);
    const result = await this.prisma.promotion.updateMany({
      where: { id, sellerId: seller.id },
      data: { isActive: false },
    });
    if (result.count === 0) throw new NotFoundException('Promotion not found');
    return { success: true };
  }

  async remove(userId: number, id: number) {
    const seller = await this.requireSeller(userId);
    // PromotionItem rows cascade-delete; any historical OrderItem that
    // referenced this promotion keeps its already-snapshotted price/
    // originalPrice and just has promotionId set to null (see schema).
    const result = await this.prisma.promotion.deleteMany({ where: { id, sellerId: seller.id } });
    if (result.count === 0) throw new NotFoundException('Promotion not found');
    return { success: true };
  }

  // Live conflict preview for the seller's create/edit form — lets the UI
  // warn before the user even submits.
  async checkConflicts(
    userId: number,
    params: { productIds: number[]; startAt: string; endAt: string; excludeId?: number },
  ) {
    const seller = await this.requireSeller(userId);
    const startAt = new Date(params.startAt);
    const endAt = new Date(params.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('Invalid start/end date');
    }
    const conflicts = await this.findConflicts(seller.id, {
      productIds: params.productIds,
      startAt,
      endAt,
      excludeId: params.excludeId,
    });
    return { hasConflicts: conflicts.length > 0, conflicts };
  }

  // ==========================================================================
  // Admin — view-only + deactivate, no create/edit (matches the "no complex
  // approval workflow" requirement; sellers own the create/edit lifecycle).
  // ==========================================================================

  async findAllForAdmin(filters: { page: number; limit: number; status?: PromotionStatus; sellerId?: number }) {
    const where: any = {};
    if (filters.sellerId) where.sellerId = filters.sellerId;

    const promotions = await this.prisma.promotion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { ...this.listInclude, seller: { select: { id: true, storeName: true } } },
    });

    const now = new Date();
    let mapped = promotions.map((p) => ({
      ...this.toListDto(p, now),
      seller: { id: p.seller.id, storeName: p.seller.storeName },
    }));
    if (filters.status) {
      mapped = mapped.filter((p) => p.status === filters.status);
    }

    const { page, limit } = filters;
    const total = mapped.length;
    const start = (page - 1) * limit;
    return ResponseUtil.paginate(mapped.slice(start, start + limit), total, page, limit);
  }

  async deactivateForAdmin(id: number) {
    const result = await this.prisma.promotion.updateMany({ where: { id }, data: { isActive: false } });
    if (result.count === 0) throw new NotFoundException('Promotion not found');
    return { success: true };
  }

  // ==========================================================================
  // Pricing overlay — consumed by ProductsService, CartsService,
  // SellersService and OrdersService. Never called per-item in a loop by
  // consumers: callers fetch the map once for every product id they need,
  // then call computeEffectivePrice per item, to keep this at one query per
  // request regardless of list size.
  // ==========================================================================

  async getActivePromotionMap(
    productIds: number[],
    now: Date = new Date(),
  ): Promise<Map<number, ActivePromotionSummary>> {
    const map = new Map<number, ActivePromotionSummary>();
    if (productIds.length === 0) return map;

    const items = await this.prisma.promotionItem.findMany({
      where: {
        productId: { in: [...new Set(productIds)] },
        promotion: { isActive: true, startAt: { lte: now }, endAt: { gte: now } },
      },
      include: {
        promotion: { select: { id: true, name: true, discountType: true, discountValue: true, endAt: true } },
      },
    });

    for (const item of items) {
      // A product can have at most one active promotion by construction
      // (findConflicts blocks overlapping windows) — first match wins if
      // that invariant is ever violated.
      if (!map.has(item.productId)) {
        map.set(item.productId, item.promotion);
      }
    }
    return map;
  }

  computeEffectivePrice(basePrice: number, promo: { discountType: PromotionDiscountType; discountValue: number } | null): number {
    if (!promo) return Math.round(basePrice * 100) / 100;
    const raw =
      promo.discountType === PromotionDiscountType.PERCENTAGE
        ? basePrice - (basePrice * promo.discountValue) / 100
        : basePrice - promo.discountValue;
    return Math.round(Math.max(raw, 0) * 100) / 100;
  }

  // Enriches a list of products (as returned by ProductsService) with a
  // `promotion` summary (or null) and an `effectivePrice` — and, when a
  // product has variants, the same `effectivePrice` added to each variant
  // (computed off that variant's own price, not the parent product's).
  // Never mutates Product.price/ProductVariant.price.
  async attachPricing<T extends { id: number; price: number; variants?: Array<{ id: number; price: number }> }>(
    products: T[],
    now: Date = new Date(),
  ): Promise<Array<T & { promotion: ActivePromotionSummary | null; effectivePrice: number }>> {
    const map = await this.getActivePromotionMap(
      products.map((p) => p.id),
      now,
    );
    return products.map((product) => {
      const promo = map.get(product.id) ?? null;
      const effectivePrice = this.computeEffectivePrice(product.price, promo);
      const variants = product.variants
        ? product.variants.map((v) => ({ ...v, effectivePrice: this.computeEffectivePrice(v.price, promo) }))
        : undefined;
      return {
        ...product,
        promotion: promo,
        effectivePrice,
        ...(variants ? { variants: variants as any } : {}),
      };
    });
  }

  async attachPricingToOne<T extends { id: number; price: number; variants?: Array<{ id: number; price: number }> }>(
    product: T,
    now: Date = new Date(),
  ) {
    const [enriched] = await this.attachPricing([product], now);
    return enriched;
  }

  // For SellersService's store-page header — a single boolean so the
  // frontend knows whether to render the "Promo Toko" tab at all, without
  // an extra round trip.
  async sellerHasActivePromotion(sellerId: number, now: Date = new Date()): Promise<boolean> {
    const count = await this.prisma.promotion.count({
      where: { sellerId, isActive: true, startAt: { lte: now }, endAt: { gte: now } },
    });
    return count > 0;
  }
}
