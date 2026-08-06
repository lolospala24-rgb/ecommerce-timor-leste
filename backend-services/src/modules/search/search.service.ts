// placeholder for src/modules/search/search.service.ts
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { SearchQueryDto, AdvancedSearchDto } from './dto/search-query.dto';
import { ResponseUtil } from '../../common/utils/response.util';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class SearchService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async search(searchQuery: SearchQueryDto) {
    const { q, type, page = 1, limit = 20 } = searchQuery;

    if (!q || q.length < 2) {
      return {
        query: q,
        total: 0,
        page,
        limit,
        results: {},
      };
    }

    const cacheKey = `search:${q}:${type}:${page}:${limit}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const results: any = {};

    // Search products
    if (!type || type === 'products') {
      results.products = await this.searchProducts({
        query: q,
        page,
        limit,
      });
    }

    // Search sellers
    if (!type || type === 'sellers') {
      results.sellers = await this.searchSellers({
        query: q,
        page: 1,
        limit: 5,
      });
    }

    // Search categories
    if (!type || type === 'categories') {
      results.categories = await this.searchCategories({
        query: q,
        page: 1,
        limit: 5,
      });
    }

    const response = {
      query: q,
      total: (results.products?.pagination?.total || 0) +
             (results.sellers?.pagination?.total || 0) +
             (results.categories?.pagination?.total || 0),
      page,
      limit,
      results,
    };

    // Track search for analytics
    await this.trackSearch(q);

    // Cache for 5 minutes
    await this.redisService.set(cacheKey, JSON.stringify(response), 300);

    return response;
  }

  async searchProducts(params: {
    query: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    minPrice?: number;
    maxPrice?: number;
    categoryId?: number;
    sellerId?: number;
    inStock?: boolean;
    minRating?: number;
  }) {
    const {
      query,
      page,
      limit,
      sortBy = 'relevance',
      sortOrder = 'desc',
      minPrice,
      maxPrice,
      categoryId,
      sellerId,
      inStock,
      minRating,
    } = params;

    const skip = (page - 1) * limit;

    // Build search conditions
    const where: any = {
      isActive: true,
      OR: [
        { name: { contains: query } },
        { nameTetum: { contains: query } },
        { description: { contains: query } },
        { descriptionTetum: { contains: query } },
      ],
    };

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (sellerId) {
      where.sellerId = sellerId;
    }

    if (inStock !== undefined) {
      where.stock = inStock ? { gt: 0 } : 0;
    }

    // Get products
    let products = await this.prisma.product.findMany({
      where,
      skip,
      take: limit,
      include: {
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
          select: { rating: true },
        },
      },
    });

    // Calculate ratings
    const productsWithRating = products.map(product => {
      const avgRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
        : 0;
      
      // Filter by min rating
      if (minRating && avgRating < minRating) {
        return null;
      }

      const { reviews, ...productWithoutReviews } = product;
      return {
        ...productWithoutReviews,
        rating: avgRating,
        totalReviews: product.reviews.length,
      };
    }).filter(p => p !== null);

    // Sort products
    const sortedProducts = this.sortProducts(productsWithRating, sortBy, sortOrder);

    const total = await this.prisma.product.count({ where });

    // Adjust total for rating filter
    const filteredTotal = minRating ? sortedProducts.length : total;

    return ResponseUtil.paginate(sortedProducts, filteredTotal, page, limit);
  }

  async searchSellers(params: {
    query: string;
    page: number;
    limit: number;
  }) {
    const { query, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      isVerified: true,
      OR: [
        { storeName: { contains: query } },
        { description: { contains: query } },
        { user: { name: { contains: query } } },
      ],
    };

    const [sellers, total] = await Promise.all([
      this.prisma.seller.findMany({
        where,
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
          _count: {
            select: {
              products: true,
              orders: true,
            },
          },
        },
      }),
      this.prisma.seller.count({ where }),
    ]);

    // Calculate ratings for sellers
    const sellersWithRating = await Promise.all(
      sellers.map(async (seller) => {
        const reviews = await this.prisma.review.aggregate({
          where: {
            product: { sellerId: seller.id },
            isApproved: true,
          },
          _avg: { rating: true },
          _count: true,
        });

        return {
          ...seller,
          rating: reviews._avg.rating || 0,
          totalReviews: reviews._count,
        };
      }),
    );

    return ResponseUtil.paginate(sellersWithRating, total, page, limit);
  }

  async searchCategories(params: {
    query: string;
    page: number;
    limit: number;
  }) {
    const { query, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
      OR: [
        { name: { contains: query } },
        { nameTetum: { contains: query } },
        { description: { contains: query } },
      ],
    };

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      }),
      this.prisma.category.count({ where }),
    ]);

    return ResponseUtil.paginate(categories, total, page, limit);
  }

  async searchOrders(params: {
    userId: number;
    userRole: string;
    query: string;
    page: number;
    limit: number;
  }) {
    const { userId, userRole, query, page, limit } = params;
    const skip = (page - 1) * limit;

    let where: any = {};

    // Build search conditions based on user role
    if (userRole === 'ADMIN') {
      where = {
        OR: [
          { orderNumber: { contains: query } },
          { customer: { name: { contains: query } } },
          { customer: { email: { contains: query } } },
          { seller: { storeName: { contains: query } } },
          { trackingNumber: { contains: query } },
        ],
      };
    } else if (userRole === 'SELLER') {
      const seller = await this.prisma.seller.findUnique({
        where: { userId },
        select: { id: true },
      });

      where = {
        sellerId: seller?.id,
        OR: [
          { orderNumber: { contains: query } },
          { customer: { name: { contains: query } } },
          { customer: { email: { contains: query } } },
          { trackingNumber: { contains: query } },
        ],
      };
    } else {
      where = {
        customerId: userId,
        OR: [
          { orderNumber: { contains: query } },
          { trackingNumber: { contains: query } },
        ],
      };
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: {
            select: { id: true, name: true, email: true },
          },
          seller: {
            select: { id: true, storeName: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, thumbnail: true },
              },
            },
            take: 3,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return ResponseUtil.paginate(orders, total, page, limit);
  }

  async searchUsers(params: {
    query: string;
    page: number;
    limit: number;
  }) {
    const { query, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [
        { name: { contains: query } },
        { email: { contains: query } },
        { phone: { contains: query } },
      ],
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          seller: {
            select: {
              id: true,
              storeName: true,
              isVerified: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return ResponseUtil.paginate(users, total, page, limit);
  }

  async advancedSearch(advancedSearchDto: AdvancedSearchDto) {
    const {
      query,
      categoryId,
      minPrice,
      maxPrice,
      sellerId,
      inStock,
      minRating,
      sortBy = 'relevance',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = advancedSearchDto;

    return this.searchProducts({
      query: query || '',
      page,
      limit,
      sortBy,
      sortOrder,
      minPrice,
      maxPrice,
      categoryId,
      sellerId,
      inStock,
      minRating,
    });
  }

  async autocomplete(query: string, limit: number) {
    if (!query || query.length < 2) {
      return [];
    }

    const cacheKey = `search:autocomplete:${query}:${limit}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const [products, categories, sellers] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query } },
            { nameTetum: { contains: query } },
          ],
        },
        take: limit,
        select: {
          id: true,
          name: true,
          nameTetum: true,
          thumbnail: true,
          price: true,
        },
      }),
      this.prisma.category.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query } },
            { nameTetum: { contains: query } },
          ],
        },
        take: limit,
        select: {
          id: true,
          name: true,
          nameTetum: true,
        },
      }),
      this.prisma.seller.findMany({
        where: {
          isVerified: true,
          storeName: { contains: query },
        },
        take: limit,
        select: {
          id: true,
          storeName: true,
          storeLogo: true,
        },
      }),
    ]);

    const suggestions = {
      products: products.map(p => ({
        type: 'product',
        id: p.id,
        name: p.name,
        nameTetum: p.nameTetum,
        image: p.thumbnail,
        price: p.price,
      })),
      categories: categories.map(c => ({
        type: 'category',
        id: c.id,
        name: c.name,
        nameTetum: c.nameTetum,
      })),
      sellers: sellers.map(s => ({
        type: 'seller',
        id: s.id,
        name: s.storeName,
        image: s.storeLogo,
      })),
    };

    await this.redisService.set(cacheKey, JSON.stringify(suggestions), 3600);

    return suggestions;
  }

  async getSuggestions(query: string, limit: number) {
    const autocomplete = await this.autocomplete(query, limit);
    
    // Flatten and return top suggestions
    const allSuggestions = [
      ...autocomplete.products.map(p => ({ text: p.name, type: 'product', id: p.id })),
      ...autocomplete.categories.map(c => ({ text: c.name, type: 'category', id: c.id })),
      ...autocomplete.sellers.map(s => ({ text: s.name, type: 'seller', id: s.id })),
    ];

    return allSuggestions.slice(0, limit);
  }

  async getTrendingSearches(limit: number) {
    const cacheKey = 'search:trending';
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    // Get trending searches from Redis sorted set
    const trending = await this.redisService.zrevrange('search:trending', 0, limit - 1);
    
    const trendingSearches = trending.map((term, index) => ({
      rank: index + 1,
      term,
    }));

    await this.redisService.set(cacheKey, JSON.stringify(trendingSearches), 3600);

    return trendingSearches;
  }

  async getRecentSearches(userId: number, limit: number) {
    const key = `search:recent:${userId}`;
    const recent = await this.redisService.lrange(key, 0, limit - 1);
    
    return recent.map(term => ({
      term,
      timestamp: new Date().toISOString(),
    }));
  }

  async saveSearch(userId: number, query: string) {
    if (!query || query.length < 2) return;

    const key = `search:recent:${userId}`;
    
    // Add to recent searches (push to front)
    await this.redisService.lrem(key, 0, query);
    await this.redisService.lpush(key, query);
    await this.redisService.ltrim(key, 0, 19); // Keep last 20
    await this.redisService.expire(key, 7 * 24 * 3600); // Expire after 7 days
  }

  async clearRecentSearches(userId: number) {
    const key = `search:recent:${userId}`;
    await this.redisService.del(key);
  }

  async trackSearch(query: string) {
    if (!query || query.length < 2) return;

    // Increment search count in Redis sorted set
    await this.redisService.zincrby('search:trending', 1, query.toLowerCase());
    await this.redisService.expire('search:trending', 7 * 24 * 3600); // Expire after 7 days
  }

  async getSearchFilters() {
    const cacheKey = 'search:filters';
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const [categories, priceRange, sellers] = await Promise.all([
      this.prisma.category.findMany({
        where: { isActive: true },
        select: { id: true, name: true, nameTetum: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.aggregate({
        where: { isActive: true },
        _min: { price: true },
        _max: { price: true },
      }),
      this.prisma.seller.findMany({
        where: { isVerified: true },
        select: { id: true, storeName: true },
        orderBy: { storeName: 'asc' },
        take: 50,
      }),
    ]);

    const filters = {
      categories,
      priceRange: {
        min: priceRange._min.price || 0,
        max: priceRange._max.price || 1000,
      },
      sellers,
      sortOptions: [
        { value: 'relevance', label: 'Relevance' },
        { value: 'price_asc', label: 'Price: Low to High' },
        { value: 'price_desc', label: 'Price: High to Low' },
        { value: 'newest', label: 'Newest First' },
        { value: 'rating', label: 'Top Rated' },
        { value: 'popularity', label: 'Most Popular' },
      ],
    };

    await this.redisService.set(cacheKey, JSON.stringify(filters), 3600);

    return filters;
  }

  private sortProducts(products: any[], sortBy: string, sortOrder: 'asc' | 'desc') {
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    switch (sortBy) {
      case 'price_asc':
        return [...products].sort((a, b) => (a.price - b.price) * multiplier);
      case 'price_desc':
        return [...products].sort((a, b) => (b.price - a.price) * multiplier);
      case 'newest':
        return [...products].sort((a, b) => 
          (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) * multiplier
        );
      case 'rating':
        return [...products].sort((a, b) => (b.rating - a.rating) * multiplier);
      case 'popularity':
        return [...products].sort((a, b) => (b.totalReviews - a.totalReviews) * multiplier);
      case 'relevance':
      default:
        return products;
    }
  }
}