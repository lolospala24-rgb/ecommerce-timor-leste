// placeholder for src/modules/products/products.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { SettingsService } from '../settings/settings.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { ResponseUtil } from '../../common/utils/response.util';
import { generateSlugBase, generateUniqueSlug } from '../../common/utils/slug.util';
import { StockNotificationsService } from '../stock-notifications/stock-notifications.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private cloudinaryService: CloudinaryService,
    private settingsService: SettingsService,
    private stockNotificationsService: StockNotificationsService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    userId: number,
    files: any[],
  ) {
    const seller = await this.resolveSellerForProductWrite(
      userId,
      createProductDto.sellerId,
    );

    // Check if category exists
    const category = await this.prisma.category.findUnique({
      where: { id: createProductDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check product type exists, if provided
    if (createProductDto.typeId) {
      const type = await this.prisma.productType.findUnique({
        where: { id: createProductDto.typeId },
      });
      if (!type) {
        throw new NotFoundException('Product type not found');
      }
    }

    // Generate slug. An explicit slug from the admin form must be exactly
    // what they typed (just sanitized) or rejected if taken — silently
    // rewriting a deliberate choice would be confusing. An auto-generated
    // one (from the name) has no such expectation, so collisions resolve
    // automatically with a -2, -3, ... suffix instead of failing the
    // whole product creation.
    const isSlugTaken = async (candidate: string) =>
      !!(await this.prisma.product.findFirst({ where: { slug: candidate } }));

    let slug: string;
    if (createProductDto.slug) {
      slug = generateSlugBase(createProductDto.slug);
      if (await isSlugTaken(slug)) {
        throw new ConflictException('Slug already exists');
      }
    } else {
      slug = await generateUniqueSlug(generateSlugBase(createProductDto.name), isSlugTaken);
    }

    // Upload images to Cloudinary and/or use pre-uploaded URLs
    const uploadedImages = Array.isArray(createProductDto.images)
      ? [...createProductDto.images]
      : [];

    if (files && files.length > 0) {
      for (const file of files) {
        const result = await this.cloudinaryService.uploadFile(file, {
          folder: 'ecommerce-timor/products',
          transformation: { width: 1200, height: 1200, crop: 'limit', quality: 85 },
        });
        uploadedImages.push(result.secure_url);
      }
    }

    const { maxProductImages } = await this.settingsService.getSettings();
    if (uploadedImages.length > maxProductImages) {
      throw new BadRequestException(`A product can have at most ${maxProductImages} images`);
    }

    // Validate the incoming variants array in-memory before opening a
    // transaction — this is a brand-new product with zero existing variants,
    // so duplicate-SKU/duplicate-combination checks only need to compare
    // entries against each other, not against the database.
    const variantDtos = createProductDto.variants ?? [];
    const explicitSkus = variantDtos
      .map((v) => v.sku?.trim())
      .filter((sku): sku is string => !!sku);
    if (new Set(explicitSkus.map((s) => s.toLowerCase())).size !== explicitSkus.length) {
      throw new ConflictException('Duplicate SKU across variants in this request');
    }
    const seenCombos = new Set<string>();
    for (const variantDto of variantDtos) {
      const canonical = this.canonicalizeVariantAttributes(variantDto.attributes);
      if (canonical) {
        if (seenCombos.has(canonical)) {
          throw new ConflictException(
            'Duplicate attribute combination across variants in this request',
          );
        }
        seenCombos.add(canonical);
      }
      await this.assertVariantImageLimit(variantDto.images);
    }

    // Create product, sync its specifications into the ProductAttribute EAV
    // table, and create any staged variants — all in one transaction, so a
    // failure partway through (e.g. a variant SKU colliding with another
    // product's variant) never leaves a half-saved product behind.
    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: createProductDto.name,
          nameTetum: createProductDto.nameTetum,
          description: createProductDto.description,
          descriptionTetum: createProductDto.descriptionTetum,
          price: createProductDto.price,
          comparePrice: createProductDto.comparePrice,
          cost: createProductDto.cost,
          stock: createProductDto.stock,
          sku: createProductDto.sku,
          barcode: createProductDto.barcode,
          videoUrl: createProductDto.videoUrl ?? null,
          images: uploadedImages,
          thumbnail: uploadedImages[0] || null,
          weight: createProductDto.weight,
          brand: createProductDto.brand,
          specifications: (createProductDto.specifications ?? {}) as any,
          sellerId: seller.id,
          categoryId: createProductDto.categoryId,
          typeId: createProductDto.typeId ?? null,
          isActive: createProductDto.isActive ?? true,
          isFeatured: createProductDto.isFeatured ?? false,
          slug,
          length: createProductDto.length,
          width: createProductDto.width,
          height: createProductDto.height,
          shippingClass: createProductDto.shippingClass,
          lowStockThreshold: createProductDto.lowStockThreshold,
          metaTitle: createProductDto.metaTitle,
          metaDescription: createProductDto.metaDescription,
          metaKeywords: (createProductDto.metaKeywords ?? []) as any,
          tags: (createProductDto.tags ?? []) as any,
          wholesalePrice: createProductDto.wholesalePrice,
          wholesaleMinQty: createProductDto.wholesaleMinQty,
          packagingName: createProductDto.packagingName,
          packagingUnitCount: createProductDto.packagingUnitCount,
          packagingPrice: createProductDto.packagingPrice,
          hasVariants: variantDtos.length > 0,
        },
      });

      await this.syncProductAttributes(tx, created.id, created.specifications);

      for (const variantDto of variantDtos) {
        await this.createVariantRecord(tx, created.id, variantDto);
      }

      return tx.product.findUnique({
        where: { id: created.id },
        include: {
          seller: { select: { id: true, storeName: true } },
          category: { select: { id: true, name: true, slug: true } },
          variants: true,
        },
      });
    });

    // Clear cache
    await this.clearProductCache();

    return product;
  }

  async findAll(filterDto: FilterProductDto) {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      sellerId,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      inStock,
      isActive = true,
      minRating,
    } = filterDto;

    const skip = (page - 1) * limit;

    const { orderBy, postSort } = this.mapProductSort(sortBy, sortOrder);

    // Build where clause
    const where: any = { isActive };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nameTetum: { contains: search } },
        { description: { contains: search } },
        { descriptionTetum: { contains: search } },
      ];
    }

    if (categoryId) {
      // Include subcategories
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
        include: {
          children: true,
        },
      });

      if (category) {
        const categoryIds = [categoryId];
        const getChildrenIds = (cat: any) => {
          if (cat.children) {
            for (const child of cat.children) {
              categoryIds.push(child.id);
              if (child.children) {
                getChildrenIds(child);
              }
            }
          }
        };
        getChildrenIds(category);
        where.categoryId = { in: categoryIds };
      } else {
        where.categoryId = categoryId;
      }
    }

    if (sellerId) {
      where.sellerId = sellerId;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (inStock !== undefined) {
      if (inStock) {
        where.stock = { gt: 0 };
      } else {
        where.stock = 0;
      }
    }

    const includeBase: any = {
      seller: {
        select: {
          id: true,
          storeName: true,
          storeLogo: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      reviews: {
        where: { isApproved: true },
        select: {
          rating: true,
        },
      },
      ...(postSort === 'best_selling'
        ? { orderItems: { select: { quantity: true } } }
        : {}),
      ...(postSort === 'popularity'
        ? { wishlistItems: { select: { id: true } } }
        : {}),
    };

    // Calculate average rating for each product
    const mapWithComputedFields = (products: any[]) =>
      products.map((product: any) => {
        const avgRating = product.reviews.length > 0
          ? product.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / product.reviews.length
          : 0;

        const salesCount =
          product.orderItems?.reduce((sum: number, item: any) => sum + item.quantity, 0) ?? 0;
        const popularityScore =
          (product.wishlistItems?.length ?? 0) + product.reviews.length;

        const { reviews, orderItems, wishlistItems, ...productWithoutReviews } = product;
        return {
          ...productWithoutReviews,
          rating: avgRating,
          totalReviews: product.reviews.length,
          salesCount,
          popularityScore,
        };
      }) as any[];

    if (postSort) {
      // rating/best_selling/popularity can't be expressed as a Prisma
      // orderBy (they're computed from related rows), so the whole matching
      // set is fetched and sorted in memory, then paginated — same
      // trade-off already accepted for this postSort path before this
      // change.
      const products = await this.prisma.product.findMany({ where, orderBy, include: includeBase } as any);
      let productsWithRating = mapWithComputedFields(products);

      if (minRating) {
        productsWithRating = productsWithRating.filter((p) => p.rating >= minRating);
      }

      if (postSort === 'rating') {
        productsWithRating.sort((a, b) => b.rating - a.rating);
      } else if (postSort === 'best_selling') {
        productsWithRating.sort((a, b) => b.salesCount - a.salesCount);
      } else if (postSort === 'popularity') {
        productsWithRating.sort((a, b) => b.popularityScore - a.popularityScore);
      }

      // Must run after the postSort re-sort above, otherwise that sort
      // would re-interleave in-stock and out-of-stock items.
      productsWithRating = this.sortInStockFirst(productsWithRating);

      const filteredTotal = productsWithRating.length;
      const paginatedProducts = productsWithRating.slice(skip, skip + limit);
      return ResponseUtil.paginate(paginatedProducts, filteredTotal, page, limit);
    }

    if (where.stock !== undefined) {
      // Caller already scoped to in-stock-only or out-of-stock-only
      // (inStock filter) — a single group, nothing to push to the bottom.
      const [products, total] = await Promise.all([
        this.prisma.product.findMany({ where, orderBy, include: includeBase, skip, take: limit } as any),
        this.prisma.product.count({ where }),
      ]);
      let productsWithRating = mapWithComputedFields(products);
      if (minRating) {
        productsWithRating = productsWithRating.filter((p) => p.rating >= minRating);
      }
      const filteredTotal = minRating ? productsWithRating.length : total;
      return ResponseUtil.paginate(productsWithRating, filteredTotal, page, limit);
    }

    // Default listing: out-of-stock products stay visible (so links,
    // reviews, and wishlists don't break) but must never rank ahead of
    // in-stock ones. Rather than fetching the whole catalog to sort/paginate
    // in memory, the in-stock and out-of-stock groups are counted and
    // queried separately, each with real DB-level skip/take, and stitched
    // together at whichever page straddles the boundary between the two
    // groups — so pagination stays correct and cheap at any catalog size.
    const inStockWhere = { ...where, stock: { gt: 0 } };
    const outOfStockWhere = { ...where, stock: 0 };

    const [inStockCount, outOfStockCount] = await Promise.all([
      this.prisma.product.count({ where: inStockWhere }),
      this.prisma.product.count({ where: outOfStockWhere }),
    ]);
    const total = inStockCount + outOfStockCount;

    let products: any[];
    if (skip >= inStockCount) {
      products = await this.prisma.product.findMany({
        where: outOfStockWhere,
        orderBy,
        include: includeBase,
        skip: skip - inStockCount,
        take: limit,
      } as any);
    } else {
      const takeInStock = Math.min(limit, inStockCount - skip);
      const inStockProducts = await this.prisma.product.findMany({
        where: inStockWhere,
        orderBy,
        include: includeBase,
        skip,
        take: takeInStock,
      } as any);
      const remaining = limit - takeInStock;
      const outOfStockProducts = remaining > 0
        ? await this.prisma.product.findMany({
            where: outOfStockWhere,
            orderBy,
            include: includeBase,
            skip: 0,
            take: remaining,
          } as any)
        : [];
      products = [...inStockProducts, ...outOfStockProducts];
    }

    let productsWithRating = mapWithComputedFields(products);
    if (minRating) {
      productsWithRating = productsWithRating.filter((p) => p.rating >= minRating);
    }
    const filteredTotal = minRating ? productsWithRating.length : total;
    return ResponseUtil.paginate(productsWithRating, filteredTotal, page, limit);
  }

  // Stable partition: keeps whatever relative order the list already has
  // within each group (the chosen sort, or a postSort re-sort) and only
  // moves out-of-stock products after in-stock ones.
  private sortInStockFirst<T extends { stock: number }>(products: T[]): T[] {
    const inStock: T[] = [];
    const outOfStock: T[] = [];
    for (const p of products) {
      (p.stock > 0 ? inStock : outOfStock).push(p);
    }
    return [...inStock, ...outOfStock];
  }

  private mapProductSort(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc'): {
    orderBy: any;
    postSort?: 'rating' | 'best_selling' | 'popularity';
  } {
    switch (sortBy) {
      case 'newest':
        return { orderBy: { createdAt: 'desc' } };
      case 'featured':
        return { orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }] };
      case 'price_asc':
        return { orderBy: { price: 'asc' } };
      case 'price_desc':
        return { orderBy: { price: 'desc' } };
      case 'name_asc':
        return { orderBy: { name: 'asc' } };
      case 'name_desc':
        return { orderBy: { name: 'desc' } };
      case 'rating':
        return { orderBy: { createdAt: 'desc' }, postSort: 'rating' };
      case 'best_selling':
        return { orderBy: { createdAt: 'desc' }, postSort: 'best_selling' };
      case 'popularity':
        return { orderBy: { createdAt: 'desc' }, postSort: 'popularity' };
      default:
        // sortBy is one of a fixed set of friendly option names above, not
        // a raw column — an unrecognized value must not reach Prisma's
        // orderBy key position unvalidated.
        return { orderBy: { createdAt: 'desc' } };
    }
  }

  async findOne(id: number) {
    const cacheKey = `product:${id}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            storeName: true,
            storePhone: true,
            storeEmail: true,
            storeAddress: true,
            storeLogo: true,
            isVerified: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            nameTetum: true,
            slug: true,
            parent: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        type: true,
        // findOne() is @Public() with no role check, so only ever expose
        // active variants here — the admin product-detail page fetches the
        // full (incl. inactive) list separately via GET /:id/variants,
        // which does have proper owner/admin access control.
        variants: {
          where: { isActive: true },
          orderBy: { id: 'asc' },
        },
        reviews: {
          where: { isApproved: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Calculate rating statistics
    const ratingStats = await this.prisma.review.aggregate({
      where: {
        productId: id,
        isApproved: true,
      },
      _avg: {
        rating: true,
      },
      _count: true,
      _sum: {
        rating: true,
      },
    });

    // Get rating distribution
    const ratingDistribution = await this.prisma.review.groupBy({
      by: ['rating'],
      where: {
        productId: id,
        isApproved: true,
      },
      _count: true,
    });

    const productWithStats = {
      ...product,
      rating: ratingStats._avg.rating || 0,
      totalReviews: ratingStats._count,
      ratingDistribution: ratingDistribution.map(r => ({
        rating: r.rating,
        count: r._count,
      })),
    };

    // Cache for 5 minutes
    await this.redisService.set(cacheKey, JSON.stringify(productWithStats), 300);

    return productWithStats;
  }

  async findBySlug(slug: string) {
    const cacheKey = `product:slug:${slug}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        seller: {
          select: {
            id: true,
            storeName: true,
            storePhone: true,
            storeEmail: true,
            storeAddress: true,
            storeLogo: true,
            isVerified: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            nameTetum: true,
            slug: true,
            parent: { select: { id: true, name: true, slug: true } },
          },
        },
        type: true,
        // Matches findOne()'s include — this is @Public() with no role
        // check, so only ever expose active variants here. Was previously
        // missing entirely, which silently dropped variant/attribute/image
        // data for the storefront's actual product-detail fetch (it
        // resolves products by slug, not id); the frontend papered over it
        // with an extra fallback request to GET /:id/variants.
        variants: {
          where: { isActive: true },
          orderBy: { id: 'asc' },
        },
        reviews: {
          where: { isApproved: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with slug ${slug} not found`);
    }

    // findOne() (fetched by numeric id) already computes these from
    // approved reviews — this path (fetched by slug) is what the storefront's
    // actual product-detail page calls and was missing them entirely, so
    // every product silently showed 0 stars / "0 reviews" regardless of how
    // many approved reviews it actually had.
    const [ratingStats, ratingDistribution, salesAgg] = await Promise.all([
      this.prisma.review.aggregate({
        where: { productId: product.id, isApproved: true },
        _avg: { rating: true },
        _count: true,
      }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { productId: product.id, isApproved: true },
        _count: true,
      }),
      // "Sold" only counts DELIVERED order lines — a completed sale, not
      // just an order someone placed and never received (same standard the
      // homepage's BEST_SELLING rule already uses, see homepage.service.ts).
      this.prisma.orderItem.aggregate({
        where: { productId: product.id, order: { status: 'DELIVERED' } },
        _sum: { quantity: true },
      }),
    ]);

    const productWithStats = {
      ...product,
      rating: ratingStats._avg.rating || 0,
      totalReviews: ratingStats._count,
      ratingDistribution: ratingDistribution.map((r) => ({
        rating: r.rating,
        count: r._count,
      })),
      salesCount: salesAgg._sum.quantity || 0,
    };

    await this.redisService.set(cacheKey, JSON.stringify(productWithStats), 300);
    return productWithStats;
  }

  async update(id: number, updateProductDto: UpdateProductDto, userId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        seller: true,
      },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check ownership
    await this.assertCanManageProduct(product, userId, 'You do not have permission to update this product');

    // Slug is only ever touched here if the admin explicitly changed it —
    // a name edit alone must never regenerate the slug, or every existing
    // /products/[slug] link and bookmark to this product would break.
    let nextSlug: string | undefined;
    if (updateProductDto.slug && updateProductDto.slug !== product.slug) {
      nextSlug = generateSlugBase(updateProductDto.slug);
      const slugExists = await this.prisma.product.findFirst({
        where: {
          slug: nextSlug,
          NOT: { id },
        },
      });
      if (slugExists) {
        throw new ConflictException('Slug already exists');
      }
    }

    // Check category exists if being updated
    if (updateProductDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateProductDto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    if (updateProductDto.images) {
      const { maxProductImages } = await this.settingsService.getSettings();
      if (updateProductDto.images.length > maxProductImages) {
        throw new BadRequestException(`A product can have at most ${maxProductImages} images`);
      }
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        name: updateProductDto.name,
        nameTetum: updateProductDto.nameTetum,
        description: updateProductDto.description,
        descriptionTetum: updateProductDto.descriptionTetum,
        price: updateProductDto.price,
        comparePrice: updateProductDto.comparePrice,
        cost: updateProductDto.cost,
        stock: updateProductDto.stock,
        sku: updateProductDto.sku,
        barcode: updateProductDto.barcode,
        videoUrl: updateProductDto.videoUrl ?? undefined,
        weight: updateProductDto.weight,
        brand: updateProductDto.brand,
        specifications: updateProductDto.specifications as any,
        categoryId: updateProductDto.categoryId,
        typeId: updateProductDto.typeId,
        isActive: updateProductDto.isActive,
        isFeatured: updateProductDto.isFeatured,
        slug: nextSlug,
        length: updateProductDto.length,
        width: updateProductDto.width,
        height: updateProductDto.height,
        shippingClass: updateProductDto.shippingClass,
        lowStockThreshold: updateProductDto.lowStockThreshold,
        metaTitle: updateProductDto.metaTitle,
        metaDescription: updateProductDto.metaDescription,
        ...(Array.isArray(updateProductDto.metaKeywords) && { metaKeywords: updateProductDto.metaKeywords as any }),
        ...(Array.isArray(updateProductDto.tags) && { tags: updateProductDto.tags as any }),
        wholesalePrice: updateProductDto.wholesalePrice,
        wholesaleMinQty: updateProductDto.wholesaleMinQty,
        packagingName: updateProductDto.packagingName,
        packagingUnitCount: updateProductDto.packagingUnitCount,
        packagingPrice: updateProductDto.packagingPrice,
        ...(Array.isArray(updateProductDto.images) && {
          images: updateProductDto.images,
          thumbnail: updateProductDto.images[0] || null,
        }),
      },
      include: {
        seller: {
          select: {
            id: true,
            storeName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await this.syncProductAttributes(this.prisma, id, updatedProduct.specifications);

    // Clear cache
    await this.clearProductCache(id);

    // Fire "back in stock" alerts only on the actual 0 -> positive crossing
    // (mirrors the low-stock-alert "fire once per crossing" convention in
    // orders.service.ts) — not on every edit of an already-in-stock product.
    if (product.stock === 0 && updatedProduct.stock > 0) {
      void this.stockNotificationsService.notifySubscribers(
        id,
        updatedProduct.name,
        updatedProduct.slug,
      );
    }

    return updatedProduct;
  }

  /**
   * Mirrors Product.specifications (the JSON key-value pairs admins edit in
   * ProductSpecifications) into the ProductAttribute EAV table, which is
   * what the category dynamic-filter facet builder (CategoriesService.
   * buildFilterFacets) actually reads. Without this, spec-based filters
   * (e.g. "Material", "RAM") never appear on category pages even though
   * the data exists.
   */
  private async syncProductAttributes(
    tx: Prisma.TransactionClient | PrismaService,
    productId: number,
    specifications: unknown,
  ) {
    const entries = Object.entries(
      (specifications as Record<string, unknown>) ?? {},
    )
      .map(([key, value]) => ({
        key: key.trim(),
        value: String(value ?? '').trim(),
      }))
      .filter((entry) => entry.key && entry.value);

    await tx.productAttribute.deleteMany({ where: { productId } });
    if (entries.length > 0) {
      await tx.productAttribute.createMany({
        data: entries.map((entry) => ({ productId, ...entry })),
      });
    }
  }

  async remove(id: number, userId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        seller: true,
        orderItems: {
          where: {
            order: {
              status: { notIn: ['DELIVERED', 'CANCELLED'] },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check ownership
    await this.assertCanManageProduct(product, userId, 'You do not have permission to delete this product');

    // Check if product has pending orders
    if (product.orderItems.length > 0) {
      throw new BadRequestException('Cannot delete product with pending orders');
    }

    // Delete images from Cloudinary
    const productImages = Array.isArray(product.images) ? (product.images as string[]) : [];
    if (productImages.length > 0) {
      for (const imageUrl of productImages) {
        await this.cloudinaryService.deleteFile(imageUrl);
      }
    }

    await this.prisma.product.delete({
      where: { id },
    });

    // Clear cache
    await this.clearProductCache(id);

    return true;
  }

  async addImages(id: number, files: any[], userId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { seller: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check ownership
    await this.assertCanManageProduct(product, userId, 'You do not have permission to modify this product');

    const currentImages = Array.isArray(product.images) ? (product.images as string[]) : [];

    // Upload new images
    const newImages = [];
    for (const file of files) {
      const result = await this.cloudinaryService.uploadFile(file, {
        folder: 'ecommerce-timor/products',
        transformation: { width: 1200, height: 1200, crop: 'limit', quality: 85 },
      });
      newImages.push(result.secure_url);
    }

    const allImages = [...currentImages, ...newImages];
    const thumbnail = allImages[0];

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        images: allImages,
        thumbnail,
      },
    });

    await this.clearProductCache(id);

    return {
      images: newImages,
      allImages: updatedProduct.images,
    };
  }

  async removeImage(id: number, imageIndex: number, userId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { seller: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check ownership
    await this.assertCanManageProduct(product, userId, 'You do not have permission to modify this product');

    const currentImages = Array.isArray(product.images) ? (product.images as string[]) : [];

    if (imageIndex < 0 || imageIndex >= currentImages.length) {
      throw new BadRequestException('Invalid image index');
    }

    // Delete image from Cloudinary
    const imageUrl = currentImages[imageIndex];
    await this.cloudinaryService.deleteFile(imageUrl);

    // Remove image from array
    currentImages.splice(imageIndex, 1);
    const thumbnail = currentImages.length > 0 ? currentImages[0] : null;

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        images: currentImages,
        thumbnail,
      },
    });

    await this.clearProductCache(id);

    return updatedProduct;
  }

  async updateStock(
    id: number,
    quantity: number,
    type: 'add' | 'subtract' | 'set',
    userId: number,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { seller: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check ownership
    await this.assertCanManageProduct(product, userId, 'You do not have permission to modify this product');

    let newStock: number;

    switch (type) {
      case 'add':
        newStock = product.stock + quantity;
        break;
      case 'subtract':
        newStock = product.stock - quantity;
        if (newStock < 0) newStock = 0;
        break;
      case 'set':
        newStock = quantity;
        if (newStock < 0) newStock = 0;
        break;
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: { stock: newStock },
    });

    await this.clearProductCache(id);

    // Same 0 -> positive crossing check as update() above — this is the
    // dedicated restock endpoint, so it's the path actually expected to
    // trigger these alerts in normal admin/seller usage.
    if (product.stock === 0 && updatedProduct.stock > 0) {
      void this.stockNotificationsService.notifySubscribers(
        id,
        updatedProduct.name,
        updatedProduct.slug,
      );
    }

    return updatedProduct;
  }

  async toggleStatus(id: number, userId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { seller: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check ownership
    await this.assertCanManageProduct(product, userId, 'You do not have permission to modify this product');

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: { isActive: !product.isActive },
    });

    await this.clearProductCache(id);

    return updatedProduct;
  }

  async cloneProduct(id: number, userId: number) {
    const originalProduct = await this.prisma.product.findUnique({
      where: { id },
      include: { seller: true },
    });

    if (!originalProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Get seller profile
    const seller = await this.prisma.seller.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!seller || seller.id !== originalProduct.sellerId) {
      throw new ForbiddenException('You can only clone your own products');
    }

    const newSlug = await generateUniqueSlug(
      generateSlugBase(`${originalProduct.name}-copy`),
      async (candidate) => !!(await this.prisma.product.findFirst({ where: { slug: candidate } })),
    );

    const clonedProduct = await this.prisma.product.create({
      data: {
        name: `${originalProduct.name} (Copy)`,
        nameTetum: originalProduct.nameTetum ? `${originalProduct.nameTetum} (Kopia)` : null,
        description: originalProduct.description,
        descriptionTetum: originalProduct.descriptionTetum,
        price: originalProduct.price,
        comparePrice: originalProduct.comparePrice,
        cost: originalProduct.cost,
        stock: 0, // Reset stock for cloned product
        sku: originalProduct.sku ? `${originalProduct.sku}-COPY` : null,
        barcode: originalProduct.barcode,
        images: originalProduct.images,
        thumbnail: originalProduct.thumbnail,
        weight: originalProduct.weight,
        sellerId: seller.id,
        categoryId: originalProduct.categoryId,
        isActive: false, // Clone as inactive by default
        isFeatured: false,
        slug: newSlug,
      },
    });

    await this.clearProductCache();

    return clonedProduct;
  }

  async getSellerProducts(
    userId: number,
    pagination: { page: number; limit: number; status?: string },
  ) {
    const { page, limit, status } = pagination;
    const skip = (page - 1) * limit;

    const seller = await this.prisma.seller.findUnique({
      where: { userId },
    });

    if (!seller) {
      throw new ForbiddenException('Seller profile not found');
    }

    const where: any = { sellerId: seller.id };

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    } else if (status === 'out-of-stock') {
      where.stock = 0;
      where.isActive = true;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              orderItems: true,
              reviews: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Calculate rating for each product
    const productsWithRating = await Promise.all(
      products.map(async (product) => {
        const rating = await this.prisma.review.aggregate({
          where: {
            productId: product.id,
            isApproved: true,
          },
          _avg: {
            rating: true,
          },
        });

        return {
          ...product,
          rating: rating._avg.rating || 0,
        };
      }),
    );

    return ResponseUtil.paginate(productsWithRating, total, page, limit);
  }

  async getFeaturedProducts(limit: number) {
    const cacheKey = `products:featured:${limit}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        isFeatured: true,
        stock: { gt: 0 },
      },
      take: limit,
      include: {
        seller: {
          select: {
            id: true,
            storeName: true,
          },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
        reviews: {
          where: { isApproved: true },
          select: {
            rating: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const productsWithRating = products.map(product => {
      const avgRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
        : 0;

      const { reviews, ...productWithoutReviews } = product;
      return {
        ...productWithoutReviews,
        rating: avgRating,
        totalReviews: product.reviews.length,
      };
    });

    await this.redisService.set(cacheKey, JSON.stringify(productsWithRating), 600);

    return productsWithRating;
  }

  async getNewArrivals(limit: number) {
    const cacheKey = `products:new-arrivals:${limit}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
      },
      take: limit,
      include: {
        seller: {
          select: {
            id: true,
            storeName: true,
          },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
        reviews: {
          where: { isApproved: true },
          select: {
            rating: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const productsWithRating = products.map(product => {
      const avgRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
        : 0;

      const { reviews, ...productWithoutReviews } = product;
      return {
        ...productWithoutReviews,
        rating: avgRating,
        totalReviews: product.reviews.length,
      };
    });

    await this.redisService.set(cacheKey, JSON.stringify(productsWithRating), 600);

    return productsWithRating;
  }

  async getPopularProducts(limit: number) {
    const cacheKey = `products:popular:${limit}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    // Popularity (wishlist adds + review count) can only be ranked after
    // it's computed, so the candidate pool can't be pre-limited by `take`
    // the way a plain sorted query would be — doing so (as this used to)
    // silently restricted "popular" to whatever happened to be newest.
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
      },
      include: {
        seller: {
          select: {
            id: true,
            storeName: true,
          },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
        reviews: {
          where: { isApproved: true },
          select: {
            rating: true,
          },
        },
        wishlistItems: {
          select: {
            id: true,
          },
        },
      },
    });

    const productsWithRating = products
      .map(product => {
        const avgRating = product.reviews.length > 0
          ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
          : 0;
        const popularityScore = (product.wishlistItems?.length ?? 0) + product.reviews.length;

        const { reviews, wishlistItems, ...productWithoutReviews } = product;
        return {
          ...productWithoutReviews,
          rating: avgRating,
          totalReviews: product.reviews.length,
          popularityScore,
        };
      })
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, limit);

    await this.redisService.set(cacheKey, JSON.stringify(productsWithRating), 600);

    return productsWithRating;
  }

  async getBestSellers(limit: number) {
    const cacheKey = `products:best-sellers:${limit}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        orderItems: {
          some: {
            order: {
              status: 'DELIVERED',
            },
          },
        },
      },
      take: limit,
      include: {
        seller: {
          select: {
            id: true,
            storeName: true,
          },
        },
        reviews: {
          where: { isApproved: true },
          select: {
            rating: true,
          },
        },
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
      orderBy: {
        orderItems: {
          _count: 'desc',
        },
      },
    });

    const productsWithRating = products.map(product => {
      const avgRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
        : 0;
      
      const { reviews, ...productWithoutReviews } = product;
      return {
        ...productWithoutReviews,
        rating: avgRating,
        totalReviews: product.reviews.length,
      };
    });

    await this.redisService.set(cacheKey, JSON.stringify(productsWithRating), 1800);

    return productsWithRating;
  }

  async searchProducts(query: string, limit: number) {
    if (!query || query.length < 2) {
      return [];
    }

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query } },
          { nameTetum: { contains: query } },
          { description: { contains: query } },
          { descriptionTetum: { contains: query } },
        ],
      },
      take: limit,
      include: {
        seller: {
          select: {
            id: true,
            storeName: true,
          },
        },
        reviews: {
          where: { isApproved: true },
          select: {
            rating: true,
          },
        },
      },
    });

    const productsWithRating = products.map(product => {
      const avgRating = product.reviews.length > 0        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
        : 0;
      
      const { reviews, ...productWithoutReviews } = product;
      return {
        ...productWithoutReviews,
        rating: avgRating,
        totalReviews: product.reviews.length,
      };
    });

    return productsWithRating;
  }

  async getProductsByCategory(
    categoryId: number,
    pagination: { page: number; limit: number },
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Get category and all subcategories
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        children: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    const categoryIds = [categoryId];
    const getChildrenIds = (cat: any) => {
      if (cat.children) {
        for (const child of cat.children) {
          categoryIds.push(child.id);
          if (child.children) {
            getChildrenIds(child);
          }
        }
      }
    };
    getChildrenIds(category);

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          categoryId: { in: categoryIds },
          isActive: true,
          stock: { gt: 0 },
        },
        skip,
        take: limit,
        include: {
          seller: {
            select: {
              id: true,
              storeName: true,
            },
          },
          reviews: {
            where: { isApproved: true },
            select: {
              rating: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({
        where: {
          categoryId: { in: categoryIds },
          isActive: true,
        },
      }),
    ]);

    const productsWithRating = products.map(product => {
      const avgRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
        : 0;
      
      const { reviews, ...productWithoutReviews } = product;
      return {
        ...productWithoutReviews,
        rating: avgRating,
        totalReviews: product.reviews.length,
      };
    });

    return ResponseUtil.paginate(productsWithRating, total, page, limit);
  }

  async getProductsBySeller(
    sellerId: number,
    pagination: { page: number; limit: number },
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new NotFoundException(`Seller with ID ${sellerId} not found`);
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          sellerId,
          isActive: true,
        },
        skip,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          reviews: {
            where: { isApproved: true },
            select: {
              rating: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({
        where: {
          sellerId,
          isActive: true,
        },
      }),
    ]);

    const productsWithRating = products.map(product => {
      const avgRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
        : 0;
      
      const { reviews, ...productWithoutReviews } = product;
      return {
        ...productWithoutReviews,
        rating: avgRating,
        totalReviews: product.reviews.length,
      };
    });

    return ResponseUtil.paginate(productsWithRating, total, page, limit);
  }

  async getProductReviews(
    productId: number,
    pagination: { page: number; limit: number },
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: {
          productId,
          isApproved: true,
        },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({
        where: {
          productId,
          isApproved: true,
        },
      }),
    ]);

    return ResponseUtil.paginate(reviews, total, page, limit);
  }

  async getRelatedProducts(id: number, limit: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { categoryId: true, sellerId: true },
    });

    if (!product) {
      return [];
    }

    const relatedProducts = await this.prisma.product.findMany({
      where: {
        id: { not: id },
        isActive: true,
        stock: { gt: 0 },
        OR: [
          { categoryId: product.categoryId },
          { sellerId: product.sellerId },
        ],
      },
      take: limit,
      include: {
        seller: {
          select: {
            id: true,
            storeName: true,
          },
        },
        reviews: {
          where: { isApproved: true },
          select: {
            rating: true,
          },
        },
      },
    });

    const productsWithRating = relatedProducts.map(product => {
      const avgRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
        : 0;
      
      const { reviews, ...productWithoutReviews } = product;
      return {
        ...productWithoutReviews,
        rating: avgRating,
        totalReviews: product.reviews.length,
      };
    });

    return productsWithRating;
  }

  async getLocalProducts(limit: number) {
    const cacheKey = `products:local:${limit}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (
          parsed &&
          (parsed.category || (Array.isArray(parsed.products) && parsed.products.length > 0))
        ) {
          return parsed;
        }
      } catch {
        // fallback to fresh DB query if cache is malformed
      }
    }

    const categories = await this.prisma.category.findMany({
      where: {
        isActive: true,
        products: { some: {} },
        OR: [
          { slug: 'local-products' },
          { slug: 'Produtu-Local' },
          { name: 'Local Products' },
          { name: 'Produtu Local' },
          { nameTetum: 'Local Products' },
          { nameTetum: 'Produtu Local' },
          { slug: { contains: 'Produtu' } },
          { slug: { contains: 'Local' } },
          { name: { contains: 'Produtu' } },
          { name: { contains: 'Local' } },
          { nameTetum: { contains: 'Produtu' } },
          { nameTetum: { contains: 'Local' } },
        ],
      },
      orderBy: [
        { isFeatured: 'desc' },
        { order: 'asc' },
      ],
      take: 1,
    });

    const category = categories[0] ?? null;

    if (!category) {
      return { category: null, products: [] };
    }

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
        categoryId: category.id,
      },
      take: limit,
      include: {
        seller: {
          select: {
            id: true,
            storeName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            nameTetum: true,
            description: true,
            slug: true,
          },
        },
        reviews: {
          where: { isApproved: true },
          select: { rating: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const productsWithRating = products.map(product => {
      const avgRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
        : 0;

      const { reviews, ...productWithoutReviews } = product;
      return {
        ...productWithoutReviews,
        rating: avgRating,
        totalReviews: product.reviews.length,
      };
    });

    const result = {
      category: {
        id: category.id,
        name: category.name,
        nameTetum: category.nameTetum,
        description: category.description,
        slug: category.slug,
      },
      products: productsWithRating,
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 600);
    return result;
  }

  async forceRemove(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    await this.clearProductCache(id);
    return true;
  }

  async createVariant(
    productId: number,
    createVariantDto: CreateVariantDto,
    userId: number,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { seller: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    await this.assertCanManageProduct(product, userId, 'You do not have permission to add variants to this product');

    await this.assertVariantImageLimit(createVariantDto.images);

    const variant = await this.prisma.$transaction(async (tx) => {
      await this.assertNoDuplicateVariantAttributes(tx, productId, createVariantDto.attributes);
      return this.createVariantRecord(tx, productId, createVariantDto);
    });

    if (!product.hasVariants) {
      await this.prisma.product.update({
        where: { id: productId },
        data: { hasVariants: true },
      });
    }

    await this.clearProductCache(productId);
    return variant;
  }

  // ProductVariant.sku is a required, unique column, but CreateVariantDto
  // allows omitting it (matching Product.sku, which is optional) — generate
  // one rather than let Prisma reject the insert with a raw constraint
  // error. The random suffix (on top of the millisecond timestamp) avoids
  // collisions when several variants are generated in the same tick, as
  // happens when Product.create()'s variants loop runs synchronously.
  private generateVariantSku(productId: number): string {
    return `VAR-${productId}-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;
  }

  private async createVariantRecord(
    tx: Prisma.TransactionClient,
    productId: number,
    dto: CreateVariantDto,
  ) {
    const sku = dto.sku?.trim() || this.generateVariantSku(productId);
    return tx.productVariant.create({
      data: {
        productId,
        sku,
        price: dto.price,
        comparePrice: dto.comparePrice,
        cost: dto.cost,
        stock: dto.stock,
        images: dto.images ?? [],
        attributes: dto.attributes ?? {},
        isActive: dto.isActive ?? true,
      },
    });
  }

  async getVariants(productId: number, userId?: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { sellerId: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const showInactive = await this.isSellerOwnerOrAdmin(product.sellerId, userId);

    return await this.prisma.productVariant.findMany({
      where: {
        productId,
        ...(showInactive ? {} : { isActive: true }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getVariant(variantId: number, userId?: number) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: {
            sellerId: true,
          },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException(`Variant with ID ${variantId} not found`);
    }

    if (!variant.isActive) {
      const canView = await this.isSellerOwnerOrAdmin(variant.product.sellerId, userId);
      if (!canView) {
        throw new NotFoundException(`Variant with ID ${variantId} not found`);
      }
    }

    return variant;
  }

  async updateVariant(
    productId: number,
    variantId: number,
    updateVariantDto: UpdateVariantDto,
    userId: number,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { seller: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant || variant.productId !== productId) {
      throw new NotFoundException(`Variant with ID ${variantId} not found`);
    }

    await this.assertCanManageProduct(product, userId, 'You do not have permission to update this variant');

    if (updateVariantDto.attributes !== undefined) {
      await this.assertNoDuplicateVariantAttributes(this.prisma, productId, updateVariantDto.attributes, variantId);
    }
    if (updateVariantDto.images !== undefined) {
      await this.assertVariantImageLimit(updateVariantDto.images);
    }

    const updatedVariant = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        sku: updateVariantDto.sku,
        price: updateVariantDto.price,
        comparePrice: updateVariantDto.comparePrice,
        cost: updateVariantDto.cost,
        stock: updateVariantDto.stock,
        images: updateVariantDto.images,
        attributes: updateVariantDto.attributes,
        isActive: updateVariantDto.isActive,
      },
    });

    await this.clearProductCache(productId);
    return updatedVariant;
  }

  async deleteVariant(productId: number, variantId: number, userId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { seller: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant || variant.productId !== productId) {
      throw new NotFoundException(`Variant with ID ${variantId} not found`);
    }

    await this.assertCanManageProduct(product, userId, 'You do not have permission to delete this variant');

    const orderCount = await this.prisma.orderItem.count({ where: { variantId } });
    if (orderCount > 0) {
      throw new BadRequestException(
        `Cannot delete this variant — it has been purchased in ${orderCount} order(s). Deactivate it instead to keep it out of new purchases while preserving order history.`,
      );
    }

    await this.prisma.productVariant.delete({ where: { id: variantId } });

    const remainingVariants = await this.prisma.productVariant.count({
      where: { productId },
    });
    if (remainingVariants === 0) {
      await this.prisma.product.update({
        where: { id: productId },
        data: { hasVariants: false },
      });
    }

    await this.clearProductCache(productId);
    return true;
  }

  async toggleVariantStatus(productId: number, variantId: number, userId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { seller: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant || variant.productId !== productId) {
      throw new NotFoundException(`Variant with ID ${variantId} not found`);
    }

    await this.assertCanManageProduct(product, userId, 'You do not have permission to toggle this variant');

    const updatedVariant = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { isActive: !variant.isActive },
    });

    await this.clearProductCache(productId);
    return updatedVariant;
  }

  async createProductType(createProductTypeDto: CreateProductTypeDto) {
    const slug = createProductTypeDto.slug || generateSlugBase(createProductTypeDto.name);
    const existingType = await this.prisma.productType.findFirst({
      where: {
        OR: [
          { name: createProductTypeDto.name },
          { slug },
        ],
      },
    });

    if (existingType) {
      throw new ConflictException('Product type name or slug already exists');
    }

    return await this.prisma.productType.create({
      data: {
        name: createProductTypeDto.name,
        nameTetum: createProductTypeDto.nameTetum,
        description: createProductTypeDto.description,
        slug,
        fields: createProductTypeDto.fields ?? {},
        specFields: createProductTypeDto.specFields ?? {},
        isActive: createProductTypeDto.isActive ?? true,
      },
    });
  }

  async getAllProductTypes() {
    return await this.prisma.productType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getProductType(id: number) {
    const type = await this.prisma.productType.findUnique({
      where: { id },
    });

    if (!type) {
      throw new NotFoundException(`Product type with ID ${id} not found`);
    }

    return type;
  }

  async updateProductType(id: number, updateProductTypeDto: UpdateProductTypeDto) {
    const type = await this.prisma.productType.findUnique({
      where: { id },
    });

    if (!type) {
      throw new NotFoundException(`Product type with ID ${id} not found`);
    }

    if (updateProductTypeDto.slug && updateProductTypeDto.slug !== type.slug) {
      const slugExists = await this.prisma.productType.findUnique({
        where: { slug: updateProductTypeDto.slug },
      });
      if (slugExists) {
        throw new ConflictException('Product type slug already exists');
      }
    }

    return await this.prisma.productType.update({
      where: { id },
      data: {
        name: updateProductTypeDto.name,
        nameTetum: updateProductTypeDto.nameTetum,
        description: updateProductTypeDto.description,
        slug: updateProductTypeDto.slug,
        fields: updateProductTypeDto.fields,
        specFields: updateProductTypeDto.specFields,
        isActive: updateProductTypeDto.isActive,
      },
    });
  }

  async deleteProductType(id: number) {
    const type = await this.prisma.productType.findUnique({
      where: { id },
    });

    if (!type) {
      throw new NotFoundException(`Product type with ID ${id} not found`);
    }

    await this.prisma.productType.delete({
      where: { id },
    });

    return true;
  }

  async toggleProductTypeStatus(id: number) {
    const type = await this.prisma.productType.findUnique({
      where: { id },
    });

    if (!type) {
      throw new NotFoundException(`Product type with ID ${id} not found`);
    }

    return await this.prisma.productType.update({
      where: { id },
      data: { isActive: !type.isActive },
    });
  }

  private async resolveSellerForProductWrite(
    userId: number,
    sellerId?: number,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { seller: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (user.role === 'ADMIN') {
      if (!sellerId) {
        throw new BadRequestException('Seller is required');
      }

      const seller = await this.prisma.seller.findUnique({
        where: { id: sellerId },
      });

      if (!seller) {
        throw new NotFoundException('Seller not found');
      }

      if (!seller.isVerified) {
        throw new BadRequestException('Selected seller is not verified yet');
      }

      return seller;
    }

    const seller =
      user.seller ??
      (await this.prisma.seller.findUnique({
        where: { userId },
      }));

    if (!seller) {
      throw new ForbiddenException('Seller profile not found');
    }

    if (!seller.isVerified) {
      throw new ForbiddenException('Your seller account is not verified yet');
    }

    if (sellerId && sellerId !== seller.id) {
      throw new ForbiddenException(
        'You cannot create products for another seller',
      );
    }

    return seller;
  }

  // Sellers manage their own products; admins manage any product. An admin
  // account has no Seller row of its own, so deriving "is this an admin"
  // by joining through Seller (as every call site here used to) always came
  // back null and rejected every admin request — checked directly against
  // User.role instead, which exists for every authenticated user.
  private async assertCanManageProduct(product: { sellerId: number }, userId: number, message: string) {
    if (!(await this.isSellerOwnerOrAdmin(product.sellerId, userId))) {
      throw new ForbiddenException(message);
    }
  }

  private async isSellerOwnerOrAdmin(sellerId: number, userId?: number): Promise<boolean> {
    if (!userId) return false;
    const [seller, user] = await Promise.all([
      this.prisma.seller.findUnique({ where: { userId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    ]);
    return seller?.id === sellerId || user?.role === 'ADMIN';
  }

  // Order-independent, case-insensitive comparison key so {color:"Black",
  // size:"M"} and {size:"M", color:"black"} are recognized as the same
  // combination regardless of key order or casing.
  private canonicalizeVariantAttributes(attributes: unknown): string {
    const record =
      attributes && typeof attributes === 'object' && !Array.isArray(attributes)
        ? (attributes as Record<string, unknown>)
        : {};
    return Object.keys(record)
      .sort()
      .map((key) => `${key.trim().toLowerCase()}=${String(record[key]).trim().toLowerCase()}`)
      .join('|');
  }

  private async assertNoDuplicateVariantAttributes(
    tx: Prisma.TransactionClient | PrismaService,
    productId: number,
    attributes: Record<string, string> | undefined,
    excludeVariantId?: number,
  ) {
    const canonical = this.canonicalizeVariantAttributes(attributes);
    // A variant with no attributes at all (e.g. a single default variant
    // on a product that otherwise has none) isn't a "combination" to
    // dedupe against — nothing to compare.
    if (!canonical) return;

    const existingVariants = await tx.productVariant.findMany({
      where: {
        productId,
        ...(excludeVariantId ? { id: { not: excludeVariantId } } : {}),
      },
      select: { attributes: true },
    });

    const isDuplicate = existingVariants.some(
      (v) => this.canonicalizeVariantAttributes(v.attributes) === canonical,
    );
    if (isDuplicate) {
      throw new ConflictException(
        'A variant with this exact combination of options already exists for this product.',
      );
    }
  }

  private async assertVariantImageLimit(images: string[] | undefined) {
    if (!images || images.length === 0) return;
    const { maxProductImages } = await this.settingsService.getSettings();
    if (images.length > maxProductImages) {
      throw new BadRequestException(`A variant can have at most ${maxProductImages} images`);
    }
  }

  private async clearProductCache(productId?: number) {
    if (productId) {
      await this.redisService.del(`product:${productId}`);
    }
    
    // Clear paginated lists
    const keys = await this.redisService.keys('products:*');
    for (const key of keys) {
      await this.redisService.del(key);
    }
  }
}