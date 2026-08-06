// placeholder for src/modules/dashboard/dashboard.service.ts
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  // ==================== ADMIN DASHBOARD ====================

  async getAdminDashboard(filters: {
    startDate?: Date;
    endDate?: Date;
    period?: 'day' | 'week' | 'month' | 'year';
  }) {
    const cacheKey = `dashboard:admin:${JSON.stringify(filters)}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const { startDate, endDate, period } = filters;
    const dateFilter = startDate && endDate ? {
      gte: startDate,
      lte: endDate,
    } : undefined;

    // User Statistics
    const [
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      activeUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.user.count({
        where: {
          createdAt: { gte: new Date(new Date().setDate(new Date().getDate() - 7)) },
        },
      }),
      this.prisma.user.count({
        where: {
          createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
        },
      }),
      this.prisma.user.count({ where: { isActive: true } }),
    ]);

    // Seller Statistics
    const [
      totalSellers,
      verifiedSellers,
      pendingSellers,
      newSellersThisMonth,
    ] = await Promise.all([
      this.prisma.seller.count(),
      this.prisma.seller.count({ where: { isVerified: true } }),
      this.prisma.seller.count({ where: { isVerified: false } }),
      this.prisma.seller.count({
        where: {
          createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
        },
      }),
    ]);

    // Product Statistics
    const [
      totalProducts,
      activeProducts,
      outOfStockProducts,
      lowStockProducts,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.product.count({ where: { stock: 0, isActive: true } }),
      this.prisma.product.count({ where: { stock: { gt: 0, lt: 10 }, isActive: true } }),
    ]);

    // Order Statistics
    const orderWhere = dateFilter ? { createdAt: dateFilter } : {};
    const [
      totalOrders,
      totalRevenue,
      pendingOrders,
      processingOrders,
      shippingOrders,
      deliveredOrders,
      cancelledOrders,
    ] = await Promise.all([
      this.prisma.order.count({ where: orderWhere }),
      this.prisma.order.aggregate({
        where: { ...orderWhere, status: OrderStatus.DELIVERED },
        _sum: { total: true },
      }),
      this.prisma.order.count({ where: { ...orderWhere, status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { ...orderWhere, status: OrderStatus.PROCESSING } }),
      this.prisma.order.count({ where: { ...orderWhere, status: OrderStatus.SHIPPING } }),
      this.prisma.order.count({ where: { ...orderWhere, status: OrderStatus.DELIVERED } }),
      this.prisma.order.count({ where: { ...orderWhere, status: OrderStatus.CANCELLED } }),
    ]);

    // Payment Statistics
    const pendingPayments = await this.prisma.payment.count({
      where: { status: PaymentStatus.PENDING },
    });

    // Review Statistics
    const [
      totalReviews,
      pendingReviews,
      averageRating,
    ] = await Promise.all([
      this.prisma.review.count(),
      this.prisma.review.count({ where: { isApproved: false } }),
      this.prisma.review.aggregate({
        where: { isApproved: true },
        _avg: { rating: true },
      }),
    ]);

    // Recent Orders (last 10)
    const recentOrders = await this.prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { name: true, email: true },
        },
        seller: {
          select: { storeName: true },
        },
      },
    });

    const dashboardData = {
      overview: {
        users: {
          total: totalUsers,
          newToday: newUsersToday,
          newThisWeek: newUsersThisWeek,
          newThisMonth: newUsersThisMonth,
          active: activeUsers,
        },
        sellers: {
          total: totalSellers,
          verified: verifiedSellers,
          pending: pendingSellers,
          newThisMonth: newSellersThisMonth,
          verificationRate: totalSellers > 0 ? (verifiedSellers / totalSellers) * 100 : 0,
        },
        products: {
          total: totalProducts,
          active: activeProducts,
          outOfStock: outOfStockProducts,
          lowStock: lowStockProducts,
          activeRate: totalProducts > 0 ? (activeProducts / totalProducts) * 100 : 0,
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          processing: processingOrders,
          shipping: shippingOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
          revenue: totalRevenue._sum.total || 0,
        },
        payments: {
          pending: pendingPayments,
        },
        reviews: {
          total: totalReviews,
          pending: pendingReviews,
          averageRating: averageRating._avg.rating || 0,
        },
      },
      recentOrders,
      timestamp: new Date().toISOString(),
    };

    // Cache for 5 minutes
    await this.redisService.set(cacheKey, JSON.stringify(dashboardData), 300);

    return dashboardData;
  }

  async getAdminRevenue(period: 'day' | 'week' | 'month' | 'year') {
    const cacheKey = `dashboard:admin:revenue:${period}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const now = new Date();
    let startDate: Date;
    let groupFormat: any;

    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        groupFormat = { hour: true };
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        groupFormat = { day: true };
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        groupFormat = { day: true };
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        groupFormat = { month: true };
        break;
    }

    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        total: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group data by time period
    const groupedData = new Map();
    
    orders.forEach(order => {
      let key: string;
      if (period === 'day') {
        key = `${order.createdAt.getHours()}:00`;
      } else if (period === 'week' || period === 'month') {
        key = order.createdAt.toISOString().split('T')[0];
      } else {
        key = `${order.createdAt.getFullYear()}-${order.createdAt.getMonth() + 1}`;
      }

      if (!groupedData.has(key)) {
        groupedData.set(key, { period: key, revenue: 0, orders: 0 });
      }
      const data = groupedData.get(key);
      data.revenue += order.total;
      data.orders += 1;
    });

    const result = {
      period,
      totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
      totalOrders: orders.length,
      data: Array.from(groupedData.values()),
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }

  async getAdminOrders(period: 'day' | 'week' | 'month' | 'year') {
    const cacheKey = `dashboard:admin:orders:${period}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
    }

    const orderStats = await this.prisma.order.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    const result = {
      period,
      data: orderStats.map(stat => ({
        status: stat.status,
        count: stat._count,
      })),
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }

  async getTopProducts(limit: number, period?: 'week' | 'month' | 'year') {
    const cacheKey = `dashboard:admin:top-products:${limit}:${period}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    let dateFilter = {};
    if (period) {
      const now = new Date();
      switch (period) {
        case 'week':
          dateFilter = { gte: new Date(now.setDate(now.getDate() - 7)) };
          break;
        case 'month':
          dateFilter = { gte: new Date(now.setMonth(now.getMonth() - 1)) };
          break;
        case 'year':
          dateFilter = { gte: new Date(now.setFullYear(now.getFullYear() - 1)) };
          break;
      }
    }

    const products = await this.prisma.product.findMany({
      take: limit,
      include: {
        seller: {
          select: { storeName: true },
        },
        category: {
          select: { name: true },
        },
        orderItems: {
          where: period ? { order: { createdAt: dateFilter } } : {},
          include: {
            order: true,
          },
        },
      },
      orderBy: {
        orderItems: {
          _count: 'desc',
        },
      },
    });

    const topProducts = products.map(product => {
      const totalSold = product.orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalRevenue = product.orderItems.reduce((sum, item) => sum + item.total, 0);
      
      return {
        id: product.id,
        name: product.name,
        thumbnail: product.thumbnail,
        price: product.price,
        storeName: product.seller.storeName,
        category: product.category.name,
        totalSold,
        totalRevenue,
      };
    });

    await this.redisService.set(cacheKey, JSON.stringify(topProducts), 300);

    return topProducts;
  }

  async getTopSellers(limit: number) {
    const cacheKey = `dashboard:admin:top-sellers:${limit}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const sellers = await this.prisma.seller.findMany({
      take: limit,
      include: {
        user: {
          select: { name: true, email: true },
        },
        orders: {
          where: { status: OrderStatus.DELIVERED },
        },
        products: true,
      },
      orderBy: {
        orders: {
          _count: 'desc',
        },
      },
    });

    const topSellers = sellers.map(seller => {
      const totalRevenue = seller.orders.reduce((sum, order) => sum + order.total, 0);
      const totalOrders = seller.orders.length;
      
      return {
        id: seller.id,
        storeName: seller.storeName,
        ownerName: seller.user.name,
        email: seller.user.email,
        totalProducts: seller.products.length,
        totalOrders,
        totalRevenue,
        isVerified: seller.isVerified,
      };
    });

    await this.redisService.set(cacheKey, JSON.stringify(topSellers), 300);

    return topSellers;
  }

  async getRecentActivity(limit: number) {
    const cacheKey = `dashboard:admin:recent-activity:${limit}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const [recentOrders, newUsers, newReviews] = await Promise.all([
      this.prisma.order.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true } },
          seller: { select: { storeName: true } },
        },
      }),
      this.prisma.user.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, createdAt: true, role: true },
      }),
      this.prisma.review.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true } },
          product: { select: { name: true } },
        },
      }),
    ]);

    const activities = [
      ...recentOrders.map(order => ({
        type: 'order',
        action: 'New Order',
        description: `Order #${order.orderNumber} placed by ${order.customer.name}`,
        timestamp: order.createdAt,
        data: order,
      })),
      ...newUsers.map(user => ({
        type: 'user',
        action: 'New User',
        description: `${user.name} (${user.email}) registered as ${user.role}`,
        timestamp: user.createdAt,
        data: user,
      })),
      ...newReviews.map(review => ({
        type: 'review',
        action: 'New Review',
        description: `${review.user.name} reviewed ${review.product.name}`,
        timestamp: review.createdAt,
        data: review,
      })),
    ];

    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const recentActivities = activities.slice(0, limit);

    await this.redisService.set(cacheKey, JSON.stringify(recentActivities), 300);

    return recentActivities;
  }

  // ==================== SELLER DASHBOARD ====================

  async getSellerDashboard(userId: number, filters?: { startDate?: Date; endDate?: Date }) {
    const cacheKey = `dashboard:seller:${userId}:${JSON.stringify(filters)}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const seller = await this.prisma.seller.findUnique({
      where: { userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const dateFilter = filters?.startDate && filters?.endDate ? {
      createdAt: {
        gte: filters.startDate,
        lte: filters.endDate,
      },
    } : {};

    // Order Statistics
    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      shippingOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.order.count({ where: { sellerId: seller.id } }),
      this.prisma.order.count({ where: { sellerId: seller.id, status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { sellerId: seller.id, status: OrderStatus.PROCESSING } }),
      this.prisma.order.count({ where: { sellerId: seller.id, status: OrderStatus.SHIPPING } }),
      this.prisma.order.count({ where: { sellerId: seller.id, status: OrderStatus.DELIVERED } }),
      this.prisma.order.count({ where: { sellerId: seller.id, status: OrderStatus.CANCELLED } }),
      this.prisma.order.aggregate({
        where: { sellerId: seller.id, status: OrderStatus.DELIVERED, ...dateFilter },
        _sum: { total: true },
      }),
    ]);

    // Product Statistics
    const [
      totalProducts,
      activeProducts,
      outOfStockProducts,
      lowStockProducts,
    ] = await Promise.all([
      this.prisma.product.count({ where: { sellerId: seller.id } }),
      this.prisma.product.count({ where: { sellerId: seller.id, isActive: true } }),
      this.prisma.product.count({ where: { sellerId: seller.id, stock: 0, isActive: true } }),
      this.prisma.product.count({ where: { sellerId: seller.id, stock: { gt: 0, lt: 10 }, isActive: true } }),
    ]);

    // Review Statistics
    const [
      totalReviews,
      averageRating,
    ] = await Promise.all([
      this.prisma.review.count({
        where: { product: { sellerId: seller.id }, isApproved: true },
      }),
      this.prisma.review.aggregate({
        where: { product: { sellerId: seller.id }, isApproved: true },
        _avg: { rating: true },
      }),
    ]);

    // Recent Orders
    const recentOrders = await this.prisma.order.findMany({
      where: { sellerId: seller.id },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        items: {
          include: {
            product: { select: { name: true, thumbnail: true } },
          },
        },
      },
    });

    // Monthly Sales (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlySales = await this.prisma.order.groupBy({
      by: ['createdAt'],
      where: {
        sellerId: seller.id,
        status: OrderStatus.DELIVERED,
        createdAt: { gte: sixMonthsAgo },
      },
      _sum: { total: true },
      _count: true,
    });

    const dashboardData = {
      storeInfo: {
        id: seller.id,
        name: seller.storeName,
        isVerified: seller.isVerified,
        logo: seller.storeLogo,
      },
      overview: {
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          processing: processingOrders,
          shipping: shippingOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
        },
        revenue: {
          total: totalRevenue._sum.total || 0,
          thisPeriod: totalRevenue._sum.total || 0,
        },
        products: {
          total: totalProducts,
          active: activeProducts,
          outOfStock: outOfStockProducts,
          lowStock: lowStockProducts,
        },
        reviews: {
          total: totalReviews,
          averageRating: averageRating._avg.rating || 0,
        },
      },
      recentOrders,
      monthlySales: monthlySales.map(sale => ({
        month: sale.createdAt.toLocaleString('default', { month: 'short' }),
        revenue: sale._sum.total || 0,
        orders: sale._count,
      })),
      timestamp: new Date().toISOString(),
    };

    await this.redisService.set(cacheKey, JSON.stringify(dashboardData), 300);

    return dashboardData;
  }

  async getSellerSales(userId: number, period: 'day' | 'week' | 'month' | 'year') {
    const cacheKey = `dashboard:seller:sales:${userId}:${period}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const seller = await this.prisma.seller.findUnique({
      where: { userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
    }

    const orders = await this.prisma.order.findMany({
      where: {
        sellerId: seller.id,
        status: OrderStatus.DELIVERED,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        total: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day/month
    const groupedData = new Map();
    
    orders.forEach(order => {
      let key: string;
      if (period === 'day') {
        key = `${order.createdAt.getHours()}:00`;
      } else if (period === 'week' || period === 'month') {
        key = order.createdAt.toISOString().split('T')[0];
      } else {
        key = `${order.createdAt.getFullYear()}-${order.createdAt.getMonth() + 1}`;
      }

      if (!groupedData.has(key)) {
        groupedData.set(key, { period: key, revenue: 0, orders: 0 });
      }
      const data = groupedData.get(key);
      data.revenue += order.total;
      data.orders += 1;
    });

    const result = {
      period,
      totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
      totalOrders: orders.length,
      data: Array.from(groupedData.values()),
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }

  async getSellerProductsStats(userId: number) {
    const cacheKey = `dashboard:seller:products:${userId}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const seller = await this.prisma.seller.findUnique({
      where: { userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const products = await this.prisma.product.findMany({
      where: { sellerId: seller.id },
      include: {
        orderItems: {
          include: {
            order: true,
          },
        },
        reviews: {
          where: { isApproved: true },
        },
      },
    });

    const productStats = products.map(product => {
      const totalSold = product.orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalRevenue = product.orderItems.reduce((sum, item) => sum + item.total, 0);
      const averageRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
        : 0;

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        stock: product.stock,
        isActive: product.isActive,
        totalSold,
        totalRevenue,
        totalReviews: product.reviews.length,
        averageRating,
      };
    });

    const summary = {
      totalProducts: products.length,
      totalValue: products.reduce((sum, p) => sum + (p.price * p.stock), 0),
      totalSold: productStats.reduce((sum, p) => sum + p.totalSold, 0),
      totalRevenue: productStats.reduce((sum, p) => sum + p.totalRevenue, 0),
      averageRating: productStats.reduce((sum, p) => sum + p.averageRating, 0) / (productStats.length || 1),
    };

    const result = {
      summary,
      products: productStats,
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }

  async getSellerOrdersStats(userId: number) {
    const cacheKey = `dashboard:seller:orders:${userId}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const seller = await this.prisma.seller.findUnique({
      where: { userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const orderStats = await this.prisma.order.groupBy({
      by: ['status'],
      where: { sellerId: seller.id },
      _count: true,
      _sum: { total: true },
    });

    const result = {
      total: orderStats.reduce((sum, stat) => sum + stat._count, 0),
      totalRevenue: orderStats.reduce((sum, stat) => sum + (stat._sum.total || 0), 0),
      byStatus: orderStats.map(stat => ({
        status: stat.status,
        count: stat._count,
        revenue: stat._sum.total || 0,
      })),
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }

  async getSellerReviewsStats(userId: number) {
    const cacheKey = `dashboard:seller:reviews:${userId}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const seller = await this.prisma.seller.findUnique({
      where: { userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const [totalReviews, averageRating, ratingDistribution] = await Promise.all([
      this.prisma.review.count({
        where: { product: { sellerId: seller.id }, isApproved: true },
      }),
      this.prisma.review.aggregate({
        where: { product: { sellerId: seller.id }, isApproved: true },
        _avg: { rating: true },
      }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { product: { sellerId: seller.id }, isApproved: true },
        _count: true,
      }),
    ]);

    const distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    for (const item of ratingDistribution) {
      distribution[item.rating] = item._count;
    }

    const result = {
      total: totalReviews,
      averageRating: averageRating._avg.rating || 0,
      ratingDistribution: distribution,
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }

  // ==================== CUSTOMER DASHBOARD ====================

  async getCustomerDashboard(userId: number) {
    const cacheKey = `dashboard:customer:${userId}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    // Order Statistics
    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      shippingOrders,
      deliveredOrders,
      cancelledOrders,
      totalSpent,
    ] = await Promise.all([
      this.prisma.order.count({ where: { customerId: userId } }),
      this.prisma.order.count({ where: { customerId: userId, status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { customerId: userId, status: OrderStatus.PROCESSING } }),
      this.prisma.order.count({ where: { customerId: userId, status: OrderStatus.SHIPPING } }),
      this.prisma.order.count({ where: { customerId: userId, status: OrderStatus.DELIVERED } }),
      this.prisma.order.count({ where: { customerId: userId, status: OrderStatus.CANCELLED } }),
      this.prisma.order.aggregate({
        where: { customerId: userId, status: OrderStatus.DELIVERED },
        _sum: { total: true },
      }),
    ]);

    // Review Statistics
    const totalReviews = await this.prisma.review.count({
      where: { userId, isApproved: true },
    });

    // Address Statistics
    const totalAddresses = await this.prisma.address.count({
      where: { userId, isActive: true },
    });

    // Recent Orders
    const recentOrders = await this.prisma.order.findMany({
      where: { customerId: userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        seller: { select: { storeName: true } },
        items: {
          include: {
            product: { select: { name: true, thumbnail: true } },
          },
          take: 3,
        },
      },
    });

    const dashboardData = {
      overview: {
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          processing: processingOrders,
          shipping: shippingOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
        },
        spending: {
          total: totalSpent._sum.total || 0,
          averageOrder: totalOrders > 0 ? (totalSpent._sum.total || 0) / totalOrders : 0,
        },
        reviews: {
          total: totalReviews,
        },
        addresses: {
          total: totalAddresses,
        },
      },
      recentOrders,
      timestamp: new Date().toISOString(),
    };

    await this.redisService.set(cacheKey, JSON.stringify(dashboardData), 300);

    return dashboardData;
  }

  async getCustomerOrdersStats(userId: number) {
    const cacheKey = `dashboard:customer:orders:${userId}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const orderStats = await this.prisma.order.groupBy({
      by: ['status'],
      where: { customerId: userId },
      _count: true,
      _sum: { total: true },
    });

    const result = {
      total: orderStats.reduce((sum, stat) => sum + stat._count, 0),
      totalSpent: orderStats.reduce((sum, stat) => sum + (stat._sum.total || 0), 0),
      byStatus: orderStats.map(stat => ({
        status: stat.status,
        count: stat._count,
        amount: stat._sum.total || 0,
      })),
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }

  async getCustomerWishlist(userId: number) {
    const wishlist = await this.prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            thumbnail: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return wishlist.map((item) => ({
      id: item.product.id,
      name: item.product.name,
      slug: item.product.slug,
      price: item.product.price,
      thumbnail: item.product.thumbnail,
    }));
  }

  async getRecentProducts(userId: number) {
    const cacheKey = `dashboard:customer:recent:${userId}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    // Get recently viewed products (would need a view tracking table)
    // For now, get recently ordered products
    const recentOrderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          customerId: userId,
        },
      },
      take: 10,
      orderBy: { order: { createdAt: 'desc' } },
      include: {
        product: {
          include: {
            seller: { select: { storeName: true } },
          },
        },
      },
      distinct: ['productId'],
    });

    const recentProducts = recentOrderItems.map(item => ({
      id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      thumbnail: item.product.thumbnail,
      storeName: item.product.seller.storeName,
    }));

    await this.redisService.set(cacheKey, JSON.stringify(recentProducts), 3600);

    return recentProducts;
  }

  // ==================== PUBLIC STATS ====================

  async getPublicStats() {
    const cacheKey = 'dashboard:public:stats';
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const [
      totalProducts,
      totalSellers,
      totalOrders,
      averageRating,
    ] = await Promise.all([
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.seller.count({ where: { isVerified: true } }),
      this.prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      this.prisma.review.aggregate({
        where: { isApproved: true },
        _avg: { rating: true },
      }),
    ]);

    const result = {
      totalProducts,
      totalSellers,
      totalOrders,
      averageRating: averageRating._avg.rating || 0,
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 3600);

    return result;
  }
}