// placeholder for src/modules/admin/admin.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MailService } from '../../mail/mail.service';
import { UsersService } from '../users/users.service';
import { SellersService } from '../sellers/sellers.service';
import { ApproveSellerDto } from './dto/approve-seller.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { SystemSettingsDto } from './dto/system-settings.dto';
import { AdminStatsQueryDto } from './dto/admin-stats.dto';
import { Role } from '@prisma/client';
import { ResponseUtil } from '../../common/utils/response.util';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private mailService: MailService,
    private usersService: UsersService,
    private sellersService: SellersService,
  ) {}

  // Dashboard Stats
  async getDashboardStats(query: AdminStatsQueryDto) {
    const cacheKey = `admin:dashboard:${JSON.stringify(query)}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const { startDate, endDate } = query;
    const dateFilter = startDate && endDate ? {
      gte: new Date(startDate),
      lte: new Date(endDate),
    } : undefined;

    // User Stats
    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
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
    ]);

    // Seller Stats
    const [
      totalSellers,
      verifiedSellers,
      pendingSellers,
    ] = await Promise.all([
      this.prisma.seller.count(),
      this.prisma.seller.count({ where: { isVerified: true } }),
      this.prisma.seller.count({ where: { isVerified: false } }),
    ]);

    // Product Stats
    const [
      totalProducts,
      activeProducts,
      outOfStockProducts,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.product.count({ where: { stock: 0, isActive: true } }),
    ]);

    // Order Stats
    const orderWhere = dateFilter ? { createdAt: dateFilter } : {};
    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      shippingOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.order.count({ where: orderWhere }),
      this.prisma.order.count({ where: { ...orderWhere, status: 'PENDING' } }),
      this.prisma.order.count({ where: { ...orderWhere, status: 'PROCESSING' } }),
      this.prisma.order.count({ where: { ...orderWhere, status: 'SHIPPING' } }),
      this.prisma.order.count({ where: { ...orderWhere, status: 'DELIVERED' } }),
      this.prisma.order.count({ where: { ...orderWhere, status: 'CANCELLED' } }),
      this.prisma.order.aggregate({
        where: { ...orderWhere, status: 'DELIVERED' },
        _sum: { total: true },
      }),
    ]);

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        newToday: newUsersToday,
        newThisWeek: newUsersThisWeek,
        newThisMonth: newUsersThisMonth,
      },
      sellers: {
        total: totalSellers,
        verified: verifiedSellers,
        pending: pendingSellers,
        verificationRate: totalSellers > 0 ? (verifiedSellers / totalSellers) * 100 : 0,
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        outOfStock: outOfStockProducts,
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
      timestamp: new Date().toISOString(),
    };

    // Cache for 2 minutes
    await this.redisService.set(cacheKey, JSON.stringify(stats), 120);

    return stats;
  }

  async getRevenueStats(period: string = 'month') {
    const cacheKey = `admin:revenue:${period}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    let startDate: Date;
    const today = new Date();
    
    switch (period) {
      case 'week':
        startDate = new Date(today.setDate(today.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(today.setMonth(today.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(today.setFullYear(today.getFullYear() - 1));
        break;
      default:
        startDate = new Date(today.setMonth(today.getMonth() - 1));
    }

    const revenueData = await this.prisma.order.groupBy({
      by: ['createdAt'],
      where: {
        status: 'DELIVERED',
        createdAt: { gte: startDate },
      },
      _sum: {
        total: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Format data for chart
    const formattedData = revenueData.map(item => ({
      date: item.createdAt.toISOString().split('T')[0],
      revenue: item._sum.total || 0,
    }));

    const totalRevenue = formattedData.reduce((sum, item) => sum + item.revenue, 0);
    const averageDailyRevenue = formattedData.length > 0 ? totalRevenue / formattedData.length : 0;

    const result = {
      period,
      total: totalRevenue,
      average: averageDailyRevenue,
      data: formattedData,
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  async getOrderStats(period: string = 'month') {
    const cacheKey = `admin:orders:${period}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    let startDate: Date;
    const today = new Date();
    
    switch (period) {
      case 'week':
        startDate = new Date(today.setDate(today.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(today.setMonth(today.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(today.setFullYear(today.getFullYear() - 1));
        break;
      default:
        startDate = new Date(today.setMonth(today.getMonth() - 1));
    }

    const orderStats = await this.prisma.order.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: true,
      _sum: {
        total: true,
      },
    });

    const result = {
      period,
      data: orderStats.map(stat => ({
        status: stat.status,
        count: stat._count,
        revenue: stat._sum.total || 0,
      })),
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  // Seller Management
  async getPendingSellers() {
    return this.prisma.seller.findMany({
      where: { isVerified: false },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getAllSellers(filters: {
    page: number;
    limit: number;
    search?: string;
    isVerified?: boolean;
  }) {
    const { page, limit, search, isVerified } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { storeName: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
      ];
    }
    
    if (isVerified !== undefined) {
      where.isVerified = isVerified;
    }

    const [sellers, total] = await Promise.all([
      this.prisma.seller.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              products: true,
              orders: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.seller.count({ where }),
    ]);

    return ResponseUtil.paginate(sellers, total, page, limit);
  }

  async getSellerDetail(id: number) {
    const seller = await this.prisma.seller.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            isActive: true,
            createdAt: true,
            lastLoginAt: true,
          },
        },
        products: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            category: true,
          },
        },
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
    });

    if (!seller) {
      throw new NotFoundException(`Seller with ID ${id} not found`);
    }

    // Calculate seller rating
    const reviews = await this.prisma.review.aggregate({
      where: {
        product: {
          sellerId: id,
        },
        isApproved: true,
      },
      _avg: {
        rating: true,
      },
      _count: true,
    });

    return {
      ...seller,
      rating: reviews._avg.rating || 0,
      totalReviews: reviews._count,
    };
  }

  async approveSeller(id: number, dto: ApproveSellerDto, adminId: number) {
    const seller = await this.prisma.seller.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!seller) {
      throw new NotFoundException(`Seller with ID ${id} not found`);
    }

    if (seller.isVerified) {
      throw new BadRequestException('Seller already verified');
    }

    const updatedSeller = await this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.seller.update({
        where: { id },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: adminId,
        },
        include: { user: true },
      });

      await prisma.adminLog.create({
        data: {
          adminId,
          action: 'APPROVE_SELLER',
          targetType: 'SELLER',
          targetId: id,
          details: {
            storeName: seller.storeName,
            approvedAt: new Date(),
          },
        },
      });

      return updated;
    });

    // Send approval email
    await this.mailService.sendSellerApprovedEmail(
      seller.user.email,
      seller.user.name,
      seller.storeName,
    );

    // Clear cache
    await this.clearAdminCache();

    return updatedSeller;
  }

  async rejectSeller(id: number, reason: string, adminId: number) {
    const seller = await this.prisma.seller.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!seller) {
      throw new NotFoundException(`Seller with ID ${id} not found`);
    }

    const updatedSeller = await this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.seller.update({
        where: { id },
        data: {
          isVerified: false,
          rejectionReason: reason,
        },
        include: { user: true },
      });

      await prisma.adminLog.create({
        data: {
          adminId,
          action: 'REJECT_SELLER',
          targetType: 'SELLER',
          targetId: id,
          details: {
            storeName: seller.storeName,
            reason,
          },
        },
      });

      return updated;
    });

    // Send rejection email
    await this.mailService.sendSellerRejectedEmail(
      seller.user.email,
      seller.user.name,
      seller.storeName,
      reason,
    );

    // Clear cache
    await this.clearAdminCache();

    return updatedSeller;
  }

  async deleteSeller(id: number) {
    const seller = await this.prisma.seller.findUnique({
      where: { id },
      include: {
        products: { where: { isActive: true } },
        orders: { where: { status: { notIn: ['DELIVERED', 'CANCELLED'] } } },
      },
    });

    if (!seller) {
      throw new NotFoundException(`Seller with ID ${id} not found`);
    }

    if (seller.products.length > 0) {
      throw new BadRequestException('Cannot delete seller with active products');
    }

    if (seller.orders.length > 0) {
      throw new BadRequestException('Cannot delete seller with pending orders');
    }

    await this.prisma.$transaction(async (prisma) => {
      await prisma.seller.delete({ where: { id } });
      await prisma.user.delete({ where: { id: seller.userId } });
    });

    await this.clearAdminCache();

    return true;
  }

  // User Management
  async getAllUsers(filters: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  }) {
    const { page, limit, search, role, isActive } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

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
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          seller: {
            select: {
              id: true,
              storeName: true,
              isVerified: true,
            },
          },
          _count: {
            select: {
              orders: true,
              reviews: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return ResponseUtil.paginate(users, total, page, limit);
  }

  async getUserDetail(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        seller: true,
        customerAddress: true,
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    thumbnail: true,
                  },
                },
              },
            },
          },
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            orders: true,
            reviews: true,
            notifications: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { password, resetToken, resetExpiry, emailVerificationToken, emailVerificationExpiry, ...userData } = user;
    return userData;
  }

  async blockUser(id: number, dto: BlockUserDto, adminId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.role === Role.ADMIN) {
      throw new ForbiddenException('Cannot block an admin user');
    }

    const updatedUser = await this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.user.update({
        where: { id },
        data: {
          isActive: false,
        },
      });

      await prisma.adminLog.create({
        data: {
          adminId,
          action: 'BLOCK_USER',
          targetType: 'USER',
          targetId: id,
          details: {
            email: user.email,
            reason: dto.reason,
          },
        },
      });

      return updated;
    });

    // Invalidate user sessions
    await this.redisService.del(`refresh_token:${id}`);
    await this.clearAdminCache();

    const { password, ...result } = updatedUser;
    return result;
  }

  async unblockUser(id: number, adminId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updatedUser = await this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.user.update({
        where: { id },
        data: {
          isActive: true,
        },
      });

      await prisma.adminLog.create({
        data: {
          adminId,
          action: 'UNBLOCK_USER',
          targetType: 'USER',
          targetId: id,
          details: {
            email: user.email,
          },
        },
      });

      return updated;
    });

    await this.clearAdminCache();

    const { password, ...result } = updatedUser;
    return result;
  }

  async changeUserRole(id: number, role: Role, adminId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.id === adminId) {
      throw new ForbiddenException('Cannot change your own role');
    }

    const updatedUser = await this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.user.update({
        where: { id },
        data: { role },
      });

      await prisma.adminLog.create({
        data: {
          adminId,
          action: 'CHANGE_ROLE',
          targetType: 'USER',
          targetId: id,
          details: {
            email: user.email,
            oldRole: user.role,
            newRole: role,
          },
        },
      });

      return updated;
    });

    await this.clearAdminCache();

    const { password, ...result } = updatedUser;
    return result;
  }

  async deleteUser(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        orders: {
          where: {
            status: { notIn: ['DELIVERED', 'CANCELLED'] },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.role === Role.ADMIN) {
      throw new ForbiddenException('Cannot delete an admin user');
    }

    if (user.orders.length > 0) {
      throw new BadRequestException('Cannot delete user with pending orders');
    }

    await this.prisma.user.delete({ where: { id } });
    await this.clearAdminCache();

    return true;
  }

  // Product Management
  async getAllProducts(filters: {
    page: number;
    limit: number;
    search?: string;
    sellerId?: number;
  }) {
    const { page, limit, search, sellerId } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (sellerId) {
      where.sellerId = sellerId;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          seller: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          category: true,
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

    return ResponseUtil.paginate(products, total, page, limit);
  }

  async deleteProduct(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
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

    if (product.orderItems.length > 0) {
      throw new BadRequestException('Cannot delete product with pending orders');
    }

    await this.prisma.product.delete({ where: { id } });
    await this.clearAdminCache();

    return true;
  }

  async toggleFeatured(id: number, isFeatured: boolean) {
    const product = await this.prisma.product.update({
      where: { id },
      data: { isFeatured },
      include: {
        seller: {
          select: {
            storeName: true,
          },
        },
      },
    });

    await this.clearAdminCache();

    return product;
  }

  // Order Management
  async getAllOrders(filters: {
    page: number;
    limit: number;
    status?: string;
  }) {
    const { page, limit, status } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          seller: {
            select: {
              id: true,
              storeName: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  thumbnail: true,
                },
              },
            },
          },
          payment: true,
          address: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return ResponseUtil.paginate(orders, total, page, limit);
  }

  async getOrderDetail(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        seller: {
          select: {
            id: true,
            storeName: true,
            storePhone: true,
            storeEmail: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                thumbnail: true,
                price: true,
              },
            },
          },
        },
        payment: true,
        address: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  // System Settings
  async getSystemSettings() {
    const cacheKey = 'admin:settings';
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        await this.redisService.del(cacheKey);
      }
    }

    const settings = {
      siteName: 'E-commerce Timor-Leste',
      siteDescription: 'Online marketplace for Timor-Leste',
      contactEmail: 'support@ecommercetimor.com',
      contactPhone: '+670 1234 5678',
      address: 'Dili, Timor-Leste',
      currency: 'USD',
      taxRate: 8,
      serviceFee: 4.5,
      shippingCost: 2.50,
      freeShippingThreshold: 50,
      maintenanceMode: false,
      registrationOpen: true,
      sellerVerificationRequired: true,
      maxProductImages: 5,
      allowedImageTypes: ['jpg', 'png', 'webp', 'jpeg'],
      maxFileSize: 5, // MB
    };

    await this.redisService.set(cacheKey, JSON.stringify(settings), 3600);
    return settings;
  }

  async updateSystemSettings(dto: SystemSettingsDto) {
    const existing = await this.getSystemSettings();
    const updated = {
      ...existing,
      ...dto,
      taxRate: dto.taxRate ?? existing.taxRate,
      serviceFee: dto.serviceFee ?? existing.serviceFee,
    };

    await this.redisService.set('admin:settings', JSON.stringify(updated), 3600);
    return updated;
  }

  // Admin Logs
  async getAdminLogs(filters: {
    page: number;
    limit: number;
    action?: string;
  }) {
    const { page, limit, action } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (action) {
      where.action = action;
    }

    const [logs, total] = await Promise.all([
      this.prisma.adminLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          admin: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminLog.count({ where }),
    ]);

    return ResponseUtil.paginate(logs, total, page, limit);
  }

  async getDistinctActions() {
    const actions = await this.prisma.adminLog.groupBy({
      by: ['action'],
    });
    return actions.map(a => a.action);
  }

  // Reports
  async getSalesReport(params: {
    startDate: Date;
    endDate: Date;
    groupBy?: 'day' | 'month' | 'year';
  }) {
    const { startDate, endDate, groupBy = 'day' } = params;

    const orders = await this.prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                seller: true,
              },
            },
          },
        },
      },
    });

    // Group by date
    const groupedData = new Map();
    
    orders.forEach(order => {
      let key: string;
      if (groupBy === 'day') {
        key = order.createdAt.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        key = `${order.createdAt.getFullYear()}-${order.createdAt.getMonth() + 1}`;
      } else {
        key = order.createdAt.getFullYear().toString();
      }

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          period: key,
          revenue: 0,
          orders: 0,
          items: 0,
        });
      }

      const data = groupedData.get(key);
      data.revenue += order.total;
      data.orders += 1;
      data.items += order.items.length;
    });

    const result = {
      startDate,
      endDate,
      groupBy,
      totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
      totalOrders: orders.length,
      data: Array.from(groupedData.values()),
    };

    return result;
  }

  async getTopSellers(limit: number = 10) {
    const sellers = await this.prisma.seller.findMany({
      where: { isVerified: true },
      take: limit,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            orders: true,
            products: true,
          },
        },
      },
      orderBy: {
        orders: {
          _count: 'desc',
        },
      },
    });

    // Calculate revenue for each seller
    const sellersWithRevenue = await Promise.all(
      sellers.map(async (seller) => {
        const revenue = await this.prisma.order.aggregate({
          where: {
            sellerId: seller.id,
            status: 'DELIVERED',
          },
          _sum: {
            total: true,
          },
        });

        return {
          ...seller,
          totalRevenue: revenue._sum.total || 0,
        };
      }),
    );

    return sellersWithRevenue;
  }

  async getTopProducts(limit: number = 10) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      take: limit,
      include: {
        seller: {
          select: {
            storeName: true,
          },
        },
        category: true,
        _count: {
          select: {
            orderItems: true,
            reviews: true,
          },
        },
      },
      orderBy: {
        orderItems: {
          _count: 'desc',
        },
      },
    });

    // Calculate revenue for each product
    const productsWithRevenue = await Promise.all(
      products.map(async (product) => {
        const revenue = await this.prisma.orderItem.aggregate({
          where: {
            productId: product.id,
            order: {
              status: 'DELIVERED',
            },
          },
          _sum: {
            total: true,
          },
        });

        // Calculate average rating
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
          totalRevenue: revenue._sum.total || 0,
          averageRating: rating._avg.rating || 0,
        };
      }),
    );

    return productsWithRevenue;
  }

  async getCategoryReport() {
    const categories = await this.prisma.category.findMany({
      include: {
        products: {
          where: { isActive: true },
          include: {
            orderItems: {
              where: {
                order: {
                  status: 'DELIVERED',
                },
              },
            },
          },
        },
      },
    });

    const report = categories.map(category => {
      const totalSales = category.products.reduce(
        (sum, product) => sum + product.orderItems.length,
        0,
      );
      const totalRevenue = category.products.reduce(
        (sum, product) =>
          sum + product.orderItems.reduce((s, item) => s + item.total, 0),
        0,
      );

      return {
        id: category.id,
        name: category.name,
        productCount: category.products.length,
        totalSales,
        totalRevenue,
      };
    });

    return report.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  // Export Data
  async exportUsers(format: 'csv' | 'excel') {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (format === 'csv') {
      const headers = ['ID', 'Email', 'Name', 'Phone', 'Role', 'Active', 'Email Verified', 'Created At', 'Last Login'];
      const rows = users.map(user => [
        user.id,
        user.email,
        user.name,
        user.phone || '',
        user.role,
        user.isActive ? 'Yes' : 'No',
        user.emailVerified ? 'Yes' : 'No',
        user.createdAt.toISOString(),
        user.lastLoginAt?.toISOString() || '',
      ]);
      
      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      return { format, content: csvContent, filename: `users_export_${Date.now()}.csv` };
    }

    return { format, data: users, filename: `users_export_${Date.now()}.json` };
  }

  async exportOrders(params: {
    startDate: Date;
    endDate: Date;
    format: 'csv' | 'excel';
  }) {
    const { startDate, endDate, format } = params;

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
        seller: {
          select: {
            storeName: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (format === 'csv') {
      const headers = ['Order ID', 'Customer', 'Email', 'Store', 'Total', 'Status', 'Payment Method', 'Created At'];
      const rows = orders.map(order => [
        order.orderNumber,
        order.customer.name,
        order.customer.email,
        order.seller.storeName,
        order.total,
        order.status,
        order.paymentMethod,
        order.createdAt.toISOString(),
      ]);
      
      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      return { format, content: csvContent, filename: `orders_export_${Date.now()}.csv` };
    }

    return { format, data: orders, filename: `orders_export_${Date.now()}.json` };
  }

  private async clearAdminCache() {
    const keys = await this.redisService.keys('admin:*');
    for (const key of keys) {
      await this.redisService.del(key);
    }
  }
}