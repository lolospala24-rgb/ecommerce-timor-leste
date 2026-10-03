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
import { PromotionDiscountType, PriceSource } from '@prisma/client';
import { PRODUCT_CARD_INCLUDE } from '../products/product-card.include';

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

  // Quantity-tiered pricing for cart/order line items — the single place
  // this priority logic is decided; callers must never re-derive it.
  // Priority: Promotion > Wholesale > normal price.
  //
  // An active Promotion always wins — it's time-limited campaign pricing,
  // which should take priority over a seller's standing wholesale offer.
  // Only when no promotion applies AND the line's quantity meets the
  // product's own wholesaleMinQty does wholesalePrice replace the regular
  // price. wholesalePrice/wholesaleMinQty come straight from Product (the
  // same fields shown as reference pricing on Product Detail's "Bulk &
  // packaging options" block) — never fabricated, never quantity-tiered
  // for a variant (same "which variant would this even describe" reasoning
  // that already scopes the reference display to simple products only;
  // callers simply omit wholesalePrice/wholesaleMinQty for variant lines).
  //
  // `source` is NORMAL vs WHOLESALE only — it never becomes "PROMOTION".
  // Promotion already has its own dedicated signal (OrderItem.promotionId,
  // set independently by the caller from the same `promo` it passed in
  // here); a third source value would just duplicate that. When a
  // Promotion applies, the discount is computed off the normal base price
  // (never off wholesalePrice — see computeEffectivePrice), so `source`
  // is NORMAL in that case too, which is also the technically accurate
  // answer: wholesale tiering was never consulted.
  resolveUnitPrice(
    basePrice: number,
    promo: { discountType: PromotionDiscountType; discountValue: number } | null,
    quantity: number,
    wholesalePrice?: number | null,
    wholesaleMinQty?: number | null,
  ): { price: number; source: PriceSource } {
    if (promo) {
      return { price: this.computeEffectivePrice(basePrice, promo), source: PriceSource.NORMAL };
    }
    if (wholesalePrice != null && wholesaleMinQty != null && quantity >= wholesaleMinQty) {
      return { price: Math.round(wholesalePrice * 100) / 100, source: PriceSource.WHOLESALE };
    }
    return { price: this.computeEffectivePrice(basePrice, null), source: PriceSource.NORMAL };
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

  // ==========================================================================
  // Public Flash Sale listing — /flash-sale page's data source.
  //
  // There is no distinct "Flash Sale" entity in this schema: a flash sale IS
  // an active (or upcoming) seller Promotion, same as everywhere else in the
  // app (homepage's FLASH_SALE section, "Promo Toko" on a seller's store
  // page). Promotion also has no quota/allocation field — "remaining stock"
  // below is the product's real Product.stock (same number checkout/cart
  // already use), not a separate flash-sale-specific pool, because that
  // pool doesn't exist anywhere in the data model and inventing one would
  // need real seller-facing UI to set it, which is out of scope here.
  // "Terjual" is real, though: units actually sold while THIS promotion was
  // live, via OrderItem.promotionId — counting only DELIVERED lines, the
  // same "a completed sale, not just a placed order" standard
  // ProductsService.findBySlug already uses for a product's own salesCount.
  // ==========================================================================

  async getFlashSaleProducts(params: {
    page: number;
    limit: number;
    categorySlug?: string;
    upcoming: boolean;
  }) {
    const now = new Date();
    const promotionWhere = params.upcoming
      ? { isActive: true, startAt: { gt: now } }
      : { isActive: true, startAt: { lte: now }, endAt: { gte: now } };
    // Upcoming items aren't filtered by stock — a product scheduled for a
    // future campaign may well be restocked before it starts; an active
    // campaign item with 0 stock right now is just not purchasable, so it's
    // excluded the same way the homepage's own flash-sale shelf already does.
    const productBaseWhere: any = params.upcoming ? { isActive: true } : { isActive: true, stock: { gt: 0 } };

    // Category facets — derived from the FULL matching set (every category
    // actually represented in this tab), never the hardcoded marketplace
    // category list and never filtered by whichever category is currently
    // selected, so the pill row doesn't shrink/reshuffle as the customer
    // clicks around.
    const facetItems = await this.prisma.promotionItem.findMany({
      where: { promotion: promotionWhere, product: productBaseWhere },
      select: { product: { select: { category: { select: { id: true, name: true, slug: true } } } } },
      distinct: ['productId'],
    });
    const categoryMap = new Map<string, { id: number; name: string; slug: string }>();
    for (const item of facetItems) {
      const c = item.product.category;
      if (c && !categoryMap.has(c.slug)) categoryMap.set(c.slug, c);
    }
    const categories = Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    const where: any = {
      promotion: promotionWhere,
      product: {
        ...productBaseWhere,
        ...(params.categorySlug ? { category: { slug: params.categorySlug } } : {}),
      },
    };

    const [total, items] = await Promise.all([
      this.prisma.promotionItem.count({ where }),
      this.prisma.promotionItem.findMany({
        where,
        include: {
          product: { include: PRODUCT_CARD_INCLUDE },
          promotion: {
            select: { id: true, name: true, discountType: true, discountValue: true, startAt: true, endAt: true },
          },
        },
        // Soonest-ending first when active (urgency), soonest-starting
        // first when upcoming — same ordering idea as the homepage shelf.
        orderBy: { promotion: params.upcoming ? { startAt: 'asc' } : { endAt: 'asc' } },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
    ]);

    const promotionIds = [...new Set(items.map((item) => item.promotion.id))];
    const soldCounts = params.upcoming
      ? new Map<number, number>()
      : await this.getSoldCountsByPromotion(promotionIds);

    const products = items.map((item) => {
      const { reviews, ...productRest } = item.product as typeof item.product & {
        reviews: { rating: number }[];
      };
      const avgRating =
        reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
      return {
        ...productRest,
        rating: avgRating,
        totalReviews: reviews.length,
        promotion: item.promotion,
        effectivePrice: this.computeEffectivePrice(productRest.price, item.promotion),
        salesCount: soldCounts.get(item.promotion.id) ?? 0,
      };
    });

    // Soonest-relevant edge across the WHOLE matching set (not just this
    // page) — what the page-level countdown actually needs.
    const edgeAgg = params.upcoming
      ? await this.prisma.promotion.aggregate({ where: promotionWhere, _min: { startAt: true } })
      : await this.prisma.promotion.aggregate({ where: promotionWhere, _min: { endAt: true } });

    return {
      data: products,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(Math.ceil(total / params.limit), 1),
      },
      categories,
      endsAt: params.upcoming ? null : (edgeAgg._min as any).endAt ?? null,
      startsAt: params.upcoming ? (edgeAgg._min as any).startAt ?? null : null,
    };
  }

  // Scoped to one promotion — Product Detail's flash-sale info block uses
  // this directly rather than the batch version above.
  async getPromotionSoldCount(promotionId: number): Promise<number> {
    const result = await this.prisma.orderItem.aggregate({
      where: { promotionId, order: { status: 'DELIVERED' } },
      _sum: { quantity: true },
    });
    return result._sum.quantity ?? 0;
  }

  private async getSoldCountsByPromotion(promotionIds: number[]): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    if (promotionIds.length === 0) return map;
    const results = await this.prisma.orderItem.groupBy({
      by: ['promotionId'],
      where: { promotionId: { in: promotionIds }, order: { status: 'DELIVERED' } },
      _sum: { quantity: true },
    });
    for (const r of results) {
      if (r.promotionId != null) map.set(r.promotionId, r._sum.quantity ?? 0);
    }
    return map;
  }
}
