// placeholder for src/modules/categories/categories.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ResponseUtil } from '../../common/utils/response.util';
import { CategoryProductsQueryDto } from './dto/category-products-query.dto';
import { Prisma } from '@prisma/client';
import {
  CategoryFilterDefinition,
  CategoryFilterFacet,
  DEFAULT_CATEGORY_FILTERS,
} from './types/category-filter.types';

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    // Check if category with same name exists
    const existingCategory = await this.prisma.category.findFirst({
      where: {
        name: createCategoryDto.name,
      },
    });

    if (existingCategory) {
      throw new ConflictException('Category with this name already exists');
    }

    // Check if slug is unique or generate one
    let slug = createCategoryDto.slug;
    if (!slug) {
      slug = this.generateSlug(createCategoryDto.name);
    } else {
      const slugExists = await this.prisma.category.findFirst({
        where: { slug },
      });
      if (slugExists) {
        throw new ConflictException('Slug already exists');
      }
    }

    // Check if parent category exists
    if (createCategoryDto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: createCategoryDto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    // Get max order for sibling categories
    let order = createCategoryDto.order;
    if (!order) {
      const maxOrder = await this.prisma.category.aggregate({
        where: { parentId: createCategoryDto.parentId || null },
        _max: { order: true },
      });
      order = (maxOrder._max.order || 0) + 1;
    }

    const category = await this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        nameTetum: createCategoryDto.nameTetum,
        description: createCategoryDto.description,
        image: createCategoryDto.image,
        banner: createCategoryDto.banner,
        filterConfig: (createCategoryDto.filterConfig ?? []) as Prisma.InputJsonValue,
        parentId: createCategoryDto.parentId,
        isActive: createCategoryDto.isActive ?? true,
        isFeatured: createCategoryDto.isFeatured ?? false,
        order,
        slug,
      },
    });

    // Clear cache
    await this.clearCategoryCache();

    return category;
  }

  async findAll(filters: {
    page: number;
    limit: number;
    search?: string;
    parentId?: number;
    includeProducts?: boolean;
  }) {
    const { page, limit, search, parentId, includeProducts = false } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nameTetum: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (parentId !== undefined) {
      where.parentId = parentId;
    }

    const include: any = {
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      children: {
        where: { isActive: true },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          order: true,
          _count: {
            select: { products: true },
          },
        },
      },
    };

    if (includeProducts) {
      include.products = {
        where: { isActive: true },
        take: 5,
        select: {
          id: true,
          name: true,
          price: true,
          thumbnail: true,
        },
      };
      include._count = {
        select: { products: true },
      };
    }

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: limit,
        include,
        orderBy: { order: 'asc' },
      }),
      this.prisma.category.count({ where }),
    ]);

    return ResponseUtil.paginate(categories, total, page, limit);
  }

  async findOne(id: number, includeProducts: boolean = false) {
    const cacheKey = `category:${id}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const include: any = {
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      children: {
        where: { isActive: true },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          name: true,
          nameTetum: true,
          slug: true,
          image: true,
          order: true,
          _count: {
            select: { products: true },
          },
        },
      },
    };

    if (includeProducts) {
      include.products = {
        where: { isActive: true },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          price: true,
          thumbnail: true,
          stock: true,
        },
      };
      include._count = {
        select: { products: true },
      };
    }

    const category = await this.prisma.category.findUnique({
      where: { id },
      include,
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Cache for 10 minutes
    await this.redisService.set(cacheKey, JSON.stringify(category), 600);

    return category;
  }

  async findBySlug(slug: string) {
    const cacheKey = `category:slug:${slug}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true,
            image: true,
            _count: {
              select: { products: true },
            },
          },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug ${slug} not found`);
    }

    const ancestors = await this.getAncestors(category.id);
    const enriched = {
      ...category,
      banner: category.banner || category.image,
      ancestors,
      children: category.children.map((child) => ({
        ...child,
        productCount: child._count.products,
      })),
      productCount: category._count.products,
    };

    await this.redisService.set(cacheKey, JSON.stringify(enriched), 600);

    return enriched;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check name uniqueness if being updated
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingCategory = await this.prisma.category.findFirst({
        where: {
          name: updateCategoryDto.name,
          NOT: { id },
        },
      });
      if (existingCategory) {
        throw new ConflictException('Category with this name already exists');
      }
    }

    // Check slug uniqueness if being updated
    if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
      const slugExists = await this.prisma.category.findFirst({
        where: {
          slug: updateCategoryDto.slug,
          NOT: { id },
        },
      });
      if (slugExists) {
        throw new ConflictException('Slug already exists');
      }
    }

    // Prevent circular parent reference
    if (updateCategoryDto.parentId === id) {
      throw new BadRequestException('Category cannot be its own parent');
    }

    // Check if new parent exists
    if (updateCategoryDto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: updateCategoryDto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
      
      // Prevent circular reference (check if parent is a descendant)
      const isDescendant = await this.isDescendantOf(updateCategoryDto.parentId, id);
      if (isDescendant) {
        throw new BadRequestException('Cannot set a descendant as parent');
      }
    }

    const updatedCategory = await this.prisma.category.update({
      where: { id },
      data: {
        name: updateCategoryDto.name,
        nameTetum: updateCategoryDto.nameTetum,
        description: updateCategoryDto.description,
        image: updateCategoryDto.image,
        parentId: updateCategoryDto.parentId === undefined ? undefined : updateCategoryDto.parentId,
        isActive: updateCategoryDto.isActive,
        isFeatured: updateCategoryDto.isFeatured,
        order: updateCategoryDto.order,
        slug: updateCategoryDto.slug,
      },
    });

    // Clear cache
    await this.clearCategoryCache(id);
    if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
      await this.redisService.del(`category:slug:${category.slug}`);
    }

    return updatedCategory;
  }

  async remove(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        products: {
          where: { isActive: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if category has children
    if (category.children.length > 0) {
      throw new BadRequestException(
        'Cannot delete category with subcategories. Please delete or reassign subcategories first.',
      );
    }

    // Check if category has products
    if (category.products.length > 0) {
      throw new BadRequestException(
        'Cannot delete category with products. Please reassign products to another category first.',
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    // Clear cache
    await this.clearCategoryCache(id);

    return true;
  }

  async getCategoryTree() {
    const cacheKey = 'categories:tree';
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { order: 'asc' },
    });

    const buildTree = (parentId: number | null = null): any[] => {
      return categories
        .filter(cat => cat.parentId === parentId)
        .map(cat => ({
          id: cat.id,
          name: cat.name,
          nameTetum: cat.nameTetum,
          slug: cat.slug,
          image: cat.image,
          description: cat.description,
          productCount: cat._count.products,
          children: buildTree(cat.id),
        }));
    };

    const tree = buildTree();

    await this.redisService.set(cacheKey, JSON.stringify(tree), 3600); // 1 hour

    return tree;
  }

  async getFeaturedCategories() {
    const cacheKey = 'categories:featured';
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const categories = await this.prisma.category.findMany({
      where: {
        isActive: true,
        isFeatured: true,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { order: 'asc' },
      take: 8,
    });

    await this.redisService.set(cacheKey, JSON.stringify(categories), 1800); // 30 minutes

    return categories;
  }

  async getCategoriesWithProducts() {
    const cacheKey = 'categories:with-products';
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const categories = await this.prisma.category.findMany({
      where: {
        isActive: true,
        products: {
          some: { isActive: true },
        },
      },
      include: {
        _count: {
          select: { products: true },
        },
        products: {
          where: { isActive: true },
          take: 4,
          select: {
            id: true,
            name: true,
            price: true,
            thumbnail: true,
          },
        },
      },
      orderBy: { order: 'asc' },
      take: 10,
    });

    await this.redisService.set(cacheKey, JSON.stringify(categories), 1800);

    return categories;
  }

  async getMenuCategories() {
    const cacheKey = 'categories:menu';
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const categories = await this.prisma.category.findMany({
      where: {
        isActive: true,
        parentId: null, // Only top-level categories for menu
      },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true,
            _count: {
              select: { products: true },
            },
          },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { order: 'asc' },
      take: 12,
    });

    await this.redisService.set(cacheKey, JSON.stringify(categories), 3600);

    return categories;
  }

  async toggleFeatured(id: number, isFeatured: boolean) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const updatedCategory = await this.prisma.category.update({
      where: { id },
      data: { isFeatured },
    });

    await this.clearCategoryCache(id);

    return updatedCategory;
  }

  async reorderCategories(orders: { id: number; order: number }[]) {
    await this.prisma.$transaction(
      orders.map(({ id, order }) =>
        this.prisma.category.update({
          where: { id },
          data: { order },
        }),
      ),
    );

    await this.clearCategoryCache();
  }

  async getAncestors(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const ancestors: any[] = [];
    let current: any = category;

    while (current.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: current.parentId },
        select: {
          id: true,
          name: true,
          nameTetum: true,
          slug: true,
          parentId: true,
        },
      });
      if (parent) {
        ancestors.unshift(parent);
        current = parent;
      } else {
        break;
      }
    }

    return ancestors;
  }

  async getDescendants(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const descendants: any[] = [];
    const queue = [id];

    while (queue.length > 0) {
      const currentId = queue.shift();
      const children = await this.prisma.category.findMany({
        where: { parentId: currentId },
        select: {
          id: true,
          name: true,
          nameTetum: true,
          slug: true,
          parentId: true,
        },
      });
      
      for (const child of children) {
        descendants.push(child);
        queue.push(child.id);
      }
    }

    return descendants;
  }

  async getCategoryProducts(
    id: number,
    options: {
      page: number;
      limit: number;
      includeSubcategories?: boolean;
    },
  ) {
    const { page, limit, includeSubcategories = false } = options;
    const skip = (page - 1) * limit;

    let categoryIds = [id];

    if (includeSubcategories) {
      const descendants = await this.getDescendants(id);
      categoryIds = [id, ...descendants.map(d => d.id)];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          categoryId: { in: categoryIds },
          isActive: true,
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

    // Calculate average rating for each product
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

  async getCategoryFiltersBySlug(slug: string) {
    const cacheKey = `category:filters:${slug}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true,
            _count: { select: { products: true } },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug ${slug} not found`);
    }

    const categoryIds = await this.resolveCategoryScope(category.id, true);
    const definitions = this.resolveFilterDefinitions(category.filterConfig);
    const facets = await this.buildFilterFacets(definitions, category, categoryIds);

    const result = {
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
      },
      filters: facets,
      sortOptions: this.getSortOptions(),
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  async queryCategoryProductsBySlug(slug: string, query: CategoryProductsQueryDto) {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (!category) {
      throw new NotFoundException(`Category with slug ${slug} not found`);
    }

    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'newest',
      subcategoryId,
      minPrice,
      maxPrice,
      inStock,
      minRating,
      brand,
      attributes,
      includeSubcategories = true,
    } = query;

    const scopeIds = subcategoryId
      ? [subcategoryId]
      : await this.resolveCategoryScope(category.id, includeSubcategories);

    const where: any = {
      isActive: true,
      categoryId: { in: scopeIds },
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nameTetum: { contains: search } },
        { description: { contains: search } },
        { descriptionTetum: { contains: search } },
        { brand: { contains: search } },
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (inStock !== undefined) {
      where.stock = inStock ? { gt: 0 } : 0;
    }

    if (brand) {
      const brands = brand.split(',').map((b) => b.trim()).filter(Boolean);
      if (brands.length > 0) {
        where.brand = { in: brands };
      }
    }

    const attributeFilters = this.parseAttributeFilters(attributes);
    if (attributeFilters.length > 0) {
      where.AND = attributeFilters.map((filter) => ({
        attributes: {
          some: {
            key: filter.key,
            value: { in: filter.values },
          },
        },
      }));
    }

    const { orderBy, postSort } = this.mapCategorySort(sortBy);
    const skip = (page - 1) * limit;

    let products = await this.prisma.product.findMany({
      where,
      include: {
        seller: {
          select: { id: true, storeName: true, storeLogo: true },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
        reviews: {
          where: { isApproved: true },
          select: { rating: true },
        },
        ...(postSort === 'best_selling'
          ? { orderItems: { select: { quantity: true } } }
          : {}),
        ...(postSort === 'popularity'
          ? { wishlistItems: { select: { id: true } } }
          : {}),
      },
      orderBy,
    });

    let productsWithRating = products.map((product) => {
      const avgRating =
        product.reviews.length > 0
          ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
          : 0;
      const salesCount =
        product.orderItems?.reduce((sum: number, item: any) => sum + item.quantity, 0) ?? 0;
      const popularityScore =
        (product.wishlistItems?.length ?? 0) + product.reviews.length;

      const { reviews, orderItems, wishlistItems, ...rest } = product as any;
      return {
        ...rest,
        rating: avgRating,
        totalReviews: product.reviews.length,
        salesCount,
        popularityScore,
      };
    });

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

    const total = productsWithRating.length;
    const paginated = productsWithRating.slice(skip, skip + limit).map(
      ({ salesCount, ...product }) => product,
    );

    return ResponseUtil.paginate(paginated, total, page, limit);
  }

  private async resolveCategoryScope(categoryId: number, includeSubcategories: boolean) {
    if (!includeSubcategories) {
      return [categoryId];
    }
    const descendants = await this.getDescendants(categoryId);
    return [categoryId, ...descendants.map((d) => d.id)];
  }

  private resolveFilterDefinitions(filterConfig: unknown): CategoryFilterDefinition[] {
    let configured: CategoryFilterDefinition[] = [];

    if (Array.isArray(filterConfig)) {
      configured = filterConfig as CategoryFilterDefinition[];
    } else if (typeof filterConfig === 'string') {
      try {
        const parsed = JSON.parse(filterConfig);
        if (Array.isArray(parsed)) configured = parsed;
      } catch {
        configured = [];
      }
    }

    if (configured.length === 0) {
      return [...DEFAULT_CATEGORY_FILTERS];
    }

    return configured.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  private async buildFilterFacets(
    definitions: CategoryFilterDefinition[],
    category: any,
    categoryIds: number[],
  ): Promise<CategoryFilterFacet[]> {
    const productWhere = { categoryId: { in: categoryIds }, isActive: true };
    const facets: CategoryFilterFacet[] = [];

    const [priceAgg, brandGroups, attributeGroups] = await Promise.all([
      this.prisma.product.aggregate({
        where: productWhere,
        _min: { price: true },
        _max: { price: true },
      }),
      this.prisma.product.groupBy({
        by: ['brand'],
        where: { ...productWhere, brand: { not: null } },
        _count: { brand: true },
      }),
      this.prisma.productAttribute.groupBy({
        by: ['key', 'value'],
        where: { product: productWhere },
        _count: { value: true },
      }),
    ]);

    const attributeMap = new Map<string, Map<string, number>>();
    for (const row of attributeGroups) {
      if (!attributeMap.has(row.key)) attributeMap.set(row.key, new Map());
      attributeMap.get(row.key)!.set(row.value, row._count.value);
    }

    const definitionKeys = new Set(definitions.map((d) => d.key));

    for (const def of definitions) {
      const facet: CategoryFilterFacet = {
        key: def.key,
        label: def.label,
        type: def.type,
        source: def.source,
        field: def.field,
        order: def.order,
      };

      switch (def.source) {
        case 'subcategory':
          facet.options = (category.children || [])
            .filter((child: any) => child._count?.products > 0)
            .map((child: any) => ({
              value: String(child.id),
              label: child.name,
              count: child._count.products,
            }));
          break;
        case 'brand':
          facet.options = brandGroups
            .filter((b) => b.brand)
            .map((b) => ({
              value: b.brand!,
              label: b.brand!,
              count: b._count.brand,
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
          break;
        case 'product_field':
          if (def.type === 'range' && def.field === 'price') {
            facet.min = priceAgg._min.price ?? 0;
            facet.max = priceAgg._max.price ?? 1000;
          }
          break;
        case 'specification':
        case 'variant_attribute': {
          const field = def.field || def.key;
          const values = attributeMap.get(field);
          facet.options = values
            ? Array.from(values.entries())
                .map(([value, count]) => ({ value, label: value, count }))
                .sort((a, b) => a.label.localeCompare(b.label))
            : def.options?.map((value) => ({ value, label: value, count: 0 }));
          break;
        }
        case 'static':
          facet.options = (def.options || []).map((value) => ({
            value,
            label: value,
            count: 0,
          }));
          break;
        default:
          break;
      }

      facets.push(facet);
    }

    // Auto-discover attribute facets not explicitly configured
    for (const [key, values] of attributeMap.entries()) {
      if (definitionKeys.has(key)) continue;
      facets.push({
        key,
        label: key,
        type: 'multiselect',
        source: 'specification',
        field: key,
        options: Array.from(values.entries())
          .map(([value, count]) => ({ value, label: value, count }))
          .sort((a, b) => a.label.localeCompare(b.label)),
        order: 100,
      });
    }

    return facets.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  private parseAttributeFilters(attributes?: string): { key: string; values: string[] }[] {
    if (!attributes) return [];

    try {
      const parsed = JSON.parse(attributes);
      if (!parsed || typeof parsed !== 'object') return [];

      return Object.entries(parsed).map(([key, value]) => ({
        key,
        values: Array.isArray(value)
          ? value.map(String)
          : String(value)
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean),
      }));
    } catch {
      return [];
    }
  }

  private mapCategorySort(sortBy?: string): {
    orderBy: any;
    postSort?: 'rating' | 'best_selling' | 'popularity';
  } {
    switch (sortBy) {
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
        return {
          orderBy: [
            { reviews: { _count: 'desc' } },
            { wishlistItems: { _count: 'desc' } },
            { createdAt: 'desc' },
          ],
          postSort: 'popularity',
        };
      case 'newest':
      default:
        return { orderBy: { createdAt: 'desc' } };
    }
  }

  private getSortOptions() {
    return [
      { value: 'popularity', label: 'Populer' },
      { value: 'newest', label: 'Terbaru' },
    ];
  }

  private async isDescendantOf(descendantId: number, ancestorId: number): Promise<boolean> {
    let currentId = descendantId;
    while (currentId) {
      if (currentId === ancestorId) return true;
      const category = await this.prisma.category.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });
      if (!category || !category.parentId) break;
      currentId = category.parentId;
    }
    return false;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  }

  private async clearCategoryCache(categoryId?: number) {
    if (categoryId) {
      await this.redisService.del(`category:${categoryId}`);
    }
    await this.redisService.del('categories:tree');
    await this.redisService.del('categories:featured');
    await this.redisService.del('categories:with-products');
    await this.redisService.del('categories:menu');

    const slugKeys = await this.redisService.keys('category:slug:*');
    for (const key of slugKeys) {
      await this.redisService.del(key);
    }
    const filterKeys = await this.redisService.keys('category:filters:*');
    for (const key of filterKeys) {
      await this.redisService.del(key);
    }
    
    // Clear paginated lists
    const keys = await this.redisService.keys('categories:list:*');
    for (const key of keys) {
      await this.redisService.del(key);
    }
  }
}