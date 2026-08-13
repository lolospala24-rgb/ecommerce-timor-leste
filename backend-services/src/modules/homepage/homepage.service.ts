import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { HomepageSectionRule, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { ReorderSectionsDto } from './dto/reorder-sections.dto';

const HOMEPAGE_CACHE_KEY = 'homepage:sections:resolved';
const HOMEPAGE_CACHE_TTL = 300;
const DEFAULT_LIMITED_STOCK_THRESHOLD = 5;

// Rules that need real, existing data to back them. TRENDING, RECOMMENDED
// and CAMPAIGN are deliberately NOT here — this codebase has no view/time-
// decay tracking, no recommendation engine, and no Campaign entity, so
// faking those rules would silently show meaningless product lists. They
// become available the moment that underlying data/engine exists, by
// adding one more case to the switch below — not a new page or component.
const PRODUCT_CARD_INCLUDE = {
  seller: { select: { id: true, storeName: true } },
  category: { select: { id: true, name: true, slug: true } },
  reviews: { where: { isApproved: true }, select: { rating: true } },
} satisfies Prisma.ProductInclude;

@Injectable()
export class HomepageService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  // ==========================================================================
  // Public: resolved homepage (one call, every active section, products
  // already selected/limited/sorted server-side — see spec §14/§23).
  // ==========================================================================
  async getResolvedHomepage() {
    const cached = await this.redisService.get(HOMEPAGE_CACHE_KEY);
    if (cached) return JSON.parse(cached);

    const sections = await this.prisma.homepageSection.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    // Error isolation (spec §22): one rule failing (bad config, DB hiccup)
    // must not take the rest of the homepage down with it.
    const resolved = await Promise.all(
      sections.map(async (section) => {
        try {
          const products = await this.resolveSectionProducts(section);
          return { section, products, error: false };
        } catch (error) {
          return { section, products: [], error: true };
        }
      }),
    );

    // Empty/errored sections are hidden rather than shown as a blank
    // section (spec §21/§22) — a consistent, single rule applied here
    // rather than left for the frontend to guess.
    const result = resolved
      .filter((r) => !r.error && r.products.length > 0)
      .map(({ section, products }) => ({
        id: section.id,
        name: section.name,
        title: section.title,
        subtitle: section.subtitle,
        type: section.type,
        rule: section.rule,
        displayOrder: section.displayOrder,
        products,
      }));

    await this.redisService.set(HOMEPAGE_CACHE_KEY, JSON.stringify(result), HOMEPAGE_CACHE_TTL);
    return result;
  }

  // ==========================================================================
  // Admin: CRUD + reorder
  // ==========================================================================
  async listSectionsForAdmin() {
    const sections = await this.prisma.homepageSection.findMany({
      orderBy: { displayOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    return sections;
  }

  async getSectionForAdmin(id: number) {
    const section = await this.prisma.homepageSection.findUnique({
      where: { id },
      include: {
        products: {
          orderBy: { position: 'asc' },
          include: {
            product: {
              select: { id: true, name: true, slug: true, thumbnail: true, price: true, isActive: true },
            },
          },
        },
      },
    });
    if (!section) throw new NotFoundException(`Homepage section ${id} not found`);

    // Also resolve the actual product list, so the admin edit page doubles
    // as a live preview (spec §19) without a separate preview endpoint.
    const previewProducts = await this.resolveSectionProducts(section);
    return { ...section, previewProducts };
  }

  async createSection(dto: CreateSectionDto) {
    await this.validateConfigForRule(dto.rule, dto.config);
    if (dto.rule === HomepageSectionRule.MANUAL) {
      await this.validateManualProducts(dto.products);
    }

    const section = await this.prisma.homepageSection.create({
      data: {
        name: dto.name,
        title: dto.title,
        subtitle: dto.subtitle,
        rule: dto.rule,
        config: (dto.config ?? {}) as Prisma.InputJsonValue,
        sort: dto.sort,
        productLimit: dto.productLimit ?? 8,
        displayOrder: dto.displayOrder ?? (await this.getNextDisplayOrder()),
        isActive: dto.isActive ?? true,
        ...(dto.rule === HomepageSectionRule.MANUAL && dto.products?.length
          ? {
              products: {
                create: dto.products.map((p, i) => ({
                  productId: p.productId,
                  position: p.position ?? i,
                })),
              },
            }
          : {}),
      },
    });

    await this.invalidateHomepageCache();
    return section;
  }

  async updateSection(id: number, dto: UpdateSectionDto) {
    const existing = await this.prisma.homepageSection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Homepage section ${id} not found`);

    const effectiveRule = dto.rule ?? existing.rule;
    if (dto.config !== undefined || dto.rule !== undefined) {
      await this.validateConfigForRule(effectiveRule, dto.config ?? (existing.config as Record<string, unknown>));
    }
    if (effectiveRule === HomepageSectionRule.MANUAL && dto.products) {
      await this.validateManualProducts(dto.products);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.homepageSection.update({
        where: { id },
        data: {
          name: dto.name,
          title: dto.title,
          subtitle: dto.subtitle,
          rule: dto.rule,
          config: dto.config !== undefined ? (dto.config as Prisma.InputJsonValue) : undefined,
          sort: dto.sort,
          productLimit: dto.productLimit,
          displayOrder: dto.displayOrder,
          isActive: dto.isActive,
        },
      });

      // Manual product list is replaced wholesale on update — simpler and
      // safer than diffing individual add/remove/reorder calls, and this
      // endpoint is admin-only + low-frequency (not a hot path).
      if (dto.products) {
        await tx.homepageSectionProduct.deleteMany({ where: { sectionId: id } });
        if (dto.products.length > 0) {
          await tx.homepageSectionProduct.createMany({
            data: dto.products.map((p, i) => ({
              sectionId: id,
              productId: p.productId,
              position: p.position ?? i,
            })),
          });
        }
      }
    });

    await this.invalidateHomepageCache();
    return this.getSectionForAdmin(id);
  }

  async deleteSection(id: number) {
    const existing = await this.prisma.homepageSection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Homepage section ${id} not found`);

    await this.prisma.homepageSection.delete({ where: { id } });
    await this.invalidateHomepageCache();
    return { success: true };
  }

  async reorderSections(dto: ReorderSectionsDto) {
    await this.prisma.$transaction(
      dto.sections.map((s) =>
        this.prisma.homepageSection.update({
          where: { id: s.id },
          data: { displayOrder: s.displayOrder },
        }),
      ),
    );
    await this.invalidateHomepageCache();
    return this.listSectionsForAdmin();
  }

  private async getNextDisplayOrder(): Promise<number> {
    const last = await this.prisma.homepageSection.findFirst({ orderBy: { displayOrder: 'desc' } });
    return (last?.displayOrder ?? -1) + 1;
  }

  private async invalidateHomepageCache() {
    await this.redisService.del(HOMEPAGE_CACHE_KEY);
  }

  // ==========================================================================
  // Config validation — admin can only pick from developer-defined rules and
  // developer-defined config shapes (spec §31/§32); no arbitrary query input.
  // ==========================================================================
  private async validateConfigForRule(rule: HomepageSectionRule, config: unknown) {
    const cfg = (config ?? {}) as Record<string, unknown>;

    if (rule === HomepageSectionRule.LOCAL || rule === HomepageSectionRule.CATEGORY) {
      const categoryId = Number(cfg.categoryId);
      if (!categoryId || !Number.isInteger(categoryId)) {
        throw new BadRequestException(`Rule ${rule} requires config.categoryId`);
      }
      const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        throw new BadRequestException(`Category ${categoryId} does not exist`);
      }
    }

    if (rule === HomepageSectionRule.LIMITED_STOCK && cfg.stockThreshold !== undefined) {
      const threshold = Number(cfg.stockThreshold);
      if (!Number.isInteger(threshold) || threshold < 1 || threshold > 1000) {
        throw new BadRequestException('config.stockThreshold must be an integer between 1 and 1000');
      }
    }
  }

  private async validateManualProducts(products: { productId: number }[] | undefined) {
    if (!products || products.length === 0) return;
    const ids = products.map((p) => p.productId);
    const found = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (found.length !== new Set(ids).size) {
      const foundIds = new Set(found.map((f) => f.id));
      const missing = ids.filter((id) => !foundIds.has(id));
      throw new BadRequestException(`Product(s) not found: ${missing.join(', ')}`);
    }
  }

  // ==========================================================================
  // Rule Engine — the only place that decides which products a section
  // shows. Adding a new rule means adding one case here, not a new page.
  // ==========================================================================
  private async resolveSectionProducts(section: {
    id: number;
    rule: HomepageSectionRule;
    config: unknown;
    productLimit: number;
    sort?: string | null;
  }) {
    const limit = section.productLimit;
    const cfg = (section.config ?? {}) as Record<string, unknown>;

    switch (section.rule) {
      case HomepageSectionRule.MANUAL:
        return this.resolveManual(section.id, limit);
      case HomepageSectionRule.NEWEST:
        return this.resolveNewest(limit);
      case HomepageSectionRule.POPULAR:
        return this.resolvePopular(limit);
      case HomepageSectionRule.BEST_SELLING:
        return this.resolveBestSelling(limit);
      case HomepageSectionRule.LOCAL:
      case HomepageSectionRule.CATEGORY:
        return this.resolveCategory(Number(cfg.categoryId), limit, section.sort);
      case HomepageSectionRule.ON_SALE:
        return this.resolveOnSale(limit, section.sort);
      case HomepageSectionRule.LIMITED_STOCK:
        return this.resolveLimitedStock(
          limit,
          Number(cfg.stockThreshold) || DEFAULT_LIMITED_STOCK_THRESHOLD,
          section.sort,
        );
      default:
        return [];
    }
  }

  private withRatings<T extends { reviews: { rating: number }[] }>(product: T) {
    const avgRating =
      product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
        : 0;
    const { reviews, ...rest } = product;
    return { ...rest, rating: avgRating, totalReviews: reviews.length };
  }

  private sortToOrderBy(sort?: string | null): Prisma.ProductOrderByWithRelationInput {
    switch (sort) {
      case 'oldest':
        return { createdAt: 'asc' };
      case 'price_asc':
        return { price: 'asc' };
      case 'price_desc':
        return { price: 'desc' };
      case 'newest':
      default:
        return { createdAt: 'desc' };
    }
  }

  private async resolveManual(sectionId: number, limit: number) {
    const entries = await this.prisma.homepageSectionProduct.findMany({
      where: { sectionId, product: { isActive: true } },
      orderBy: { position: 'asc' },
      take: limit,
      include: { product: { include: PRODUCT_CARD_INCLUDE } },
    });
    return entries.map((e) => this.withRatings(e.product));
  }

  private async resolveNewest(limit: number) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0 } },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: PRODUCT_CARD_INCLUDE,
    });
    return products.map((p) => this.withRatings(p));
  }

  private async resolvePopular(limit: number) {
    // Same rationale as the legacy getPopularProducts: popularity is
    // computed (wishlist adds + approved review count), so the pool can't
    // be pre-limited by a DB `take` before ranking, or "popular" quietly
    // degrades into "newest".
    const products = await this.prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0 } },
      include: { ...PRODUCT_CARD_INCLUDE, wishlistItems: { select: { id: true } } },
    });

    return products
      .map((p) => {
        const withRatings = this.withRatings(p);
        const popularityScore = (p.wishlistItems?.length ?? 0) + p.reviews.length;
        const { wishlistItems, ...rest } = withRatings as typeof withRatings & {
          wishlistItems: unknown[];
        };
        return { ...rest, popularityScore };
      })
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, limit);
  }

  private async resolveBestSelling(limit: number) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, orderItems: { some: { order: { status: 'DELIVERED' } } } },
      take: limit,
      orderBy: { orderItems: { _count: 'desc' } },
      include: PRODUCT_CARD_INCLUDE,
    });
    return products.map((p) => this.withRatings(p));
  }

  private async resolveCategory(categoryId: number, limit: number, sort?: string | null) {
    if (!categoryId) return [];
    const products = await this.prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0 }, categoryId },
      take: limit,
      orderBy: this.sortToOrderBy(sort),
      include: PRODUCT_CARD_INCLUDE,
    });
    return products.map((p) => this.withRatings(p));
  }

  private async resolveOnSale(limit: number, sort?: string | null) {
    // Prisma can't compare two columns of the same row in a `where` filter,
    // so the comparePrice > price check runs in JS after a bounded fetch —
    // bounded by isActive+stock+comparePrice-not-null first, then capped
    // by `take` at a multiple of the display limit to keep the candidate
    // pool small without risking an unbounded full-table scan.
    const candidates = await this.prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0 }, comparePrice: { not: null } },
      take: limit * 10,
      orderBy: this.sortToOrderBy(sort),
      include: PRODUCT_CARD_INCLUDE,
    });
    return candidates
      .filter((p) => p.comparePrice != null && p.comparePrice > p.price)
      .slice(0, limit)
      .map((p) => this.withRatings(p));
  }

  private async resolveLimitedStock(limit: number, threshold: number, sort?: string | null) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0, lte: threshold } },
      take: limit,
      orderBy: sort ? this.sortToOrderBy(sort) : { stock: 'asc' },
      include: PRODUCT_CARD_INCLUDE,
    });
    return products.map((p) => this.withRatings(p));
  }
}
