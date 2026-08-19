// placeholder for src/modules/sellers/sellers.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MailService } from '../../mail/mail.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterSellerDto } from './dto/register-seller.dto';
import { UpdateSellerDto } from './dto/update-seller.dto';
import { SellerFilterDto } from './dto/seller-filter.dto';
import { hashPassword } from '../../common/utils/bcrypt.util';
import { Role } from '@prisma/client';
import { ResponseUtil } from '../../common/utils/response.util';

@Injectable()
export class SellersService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private mailService: MailService,
    private cloudinaryService: CloudinaryService,
    private settingsService: SettingsService,
    private notificationsService: NotificationsService,
  ) {}

  async register(registerSellerDto: RegisterSellerDto) {
    const settings = await this.settingsService.getSettings();
    if (!settings.registrationOpen) {
      throw new BadRequestException('New registrations are currently closed');
    }

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerSellerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Check if store name is taken
    const existingSeller = await this.prisma.seller.findFirst({
      where: { storeName: registerSellerDto.storeName },
    });

    if (existingSeller) {
      throw new ConflictException('Store name already taken');
    }

    // Hash password
    const hashedPassword = await hashPassword(registerSellerDto.password);

    // Create user and seller in transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      // Create user
      const user = await prisma.user.create({
        data: {
          email: registerSellerDto.email,
          password: hashedPassword,
          name: registerSellerDto.name,
          phone: registerSellerDto.phone,
          role: Role.SELLER,
          emailVerified: false, // Will need to verify email
        },
      });

      // Create seller profile
      const seller = await prisma.seller.create({
        data: {
          userId: user.id,
          storeName: registerSellerDto.storeName,
          storePhone: registerSellerDto.storePhone,
          storeEmail: registerSellerDto.storeEmail,
          storeAddress: registerSellerDto.storeAddress,
          description: registerSellerDto.description,
          isVerified: !settings.sellerVerificationRequired,
          verifiedAt: settings.sellerVerificationRequired ? null : new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
            },
          },
        },
      });

      return seller;
    });

    // Send verification email
    await this.mailService.sendSellerVerificationEmail(
      result.user.email,
      result.user.name,
      result.storeName,
    );

    // Only alert admins when there's actually something to review — if
    // sellerVerificationRequired is off, the seller above was already
    // created isVerified: true and there's no pending action for an admin.
    if (!result.isVerified) {
      await this.notificationsService
        .notifySellerRegistered(result.id, result.storeName, result.user.name)
        .catch((err) => console.error('Failed to send seller-registered notification:', err));
    }

    // Clear cache
    await this.clearSellerCache();

    return result;
  }

  async findAll(filterDto: SellerFilterDto) {
    const {
      page = 1,
      limit = 10,
      search,
      isVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filterDto;

    const skip = (page - 1) * limit;
    const take = limit;

    // Build where clause
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

    // Get sellers with pagination
    const [sellers, total] = await Promise.all([
      this.prisma.seller.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              isActive: true,
              createdAt: true,
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

    return ResponseUtil.paginate(sellers, total, page, limit);
  }

  // Public storefront profile — deliberately a narrow projection. This used
  // to reuse the same full admin projection (bank details, live balance,
  // real order rows with customer names), which meant anyone could pull a
  // seller's bank account number and recent customers off GET /sellers/:id
  // with no auth at all. Admin's detail view now calls findOneAdmin instead.
  async findOne(id: number) {
    const cacheKey = `seller:${id}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const seller = await this.prisma.seller.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        storeName: true,
        storePhone: true,
        storeEmail: true,
        storeAddress: true,
        storeLogo: true,
        storeBanner: true,
        description: true,
        isVerified: true,
        createdAt: true,
        user: {
          select: {
            name: true,
          },
        },
        products: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
            thumbnail: true,
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
    });

    if (!seller) {
      throw new NotFoundException(`Seller with ID ${id} not found`);
    }

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

    const sellerWithRating = {
      ...seller,
      rating: reviews._avg.rating || 0,
      totalReviews: reviews._count,
    };

    // Cache for 5 minutes
    await this.redisService.set(cacheKey, JSON.stringify(sellerWithRating), 300);

    return sellerWithRating;
  }

  // Admin-only full detail — everything findOne intentionally omits
  // (bank details, live balance, real recent orders with customer names,
  // total revenue). Only reachable via the @Roles(ADMIN) :id/admin route.
  async findOneAdmin(id: number) {
    const cacheKey = `seller:admin:${id}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

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
          },
        },
        products: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
            thumbnail: true,
            isActive: true,
          },
        },
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { name: true } },
          },
        },
        balance: true,
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

    const [reviews, revenueAgg] = await Promise.all([
      this.prisma.review.aggregate({
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
      }),
      this.prisma.order.aggregate({
        where: { sellerId: id, status: 'DELIVERED' },
        _sum: { total: true },
      }),
    ]);

    const sellerWithRating = {
      ...seller,
      rating: reviews._avg.rating || 0,
      totalReviews: reviews._count,
      totalRevenue: revenueAgg._sum.total || 0,
      balance: seller.balance || {
        pendingAmount: 0,
        availableAmount: 0,
        processingAmount: 0,
        paidOutAmount: 0,
        refundedAmount: 0,
      },
    };

    // Cache for 5 minutes
    await this.redisService.set(cacheKey, JSON.stringify(sellerWithRating), 300);

    return sellerWithRating;
  }

  async findByUserId(userId: number) {
    const seller = await this.prisma.seller.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!seller) {
      throw new NotFoundException('Store not found for this user');
    }

    return seller;
  }

  async findPending() {
    const pendingSellers = await this.prisma.seller.findMany({
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

    return pendingSellers;
  }

  async findVerified(pagination: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = pagination;
    const skip = (page - 1) * limit;

    const where: any = { isVerified: true };

    if (search) {
      where.OR = [
        { storeName: { contains: search } },
        { description: { contains: search } },
        { user: { name: { contains: search } } },
      ];
    }

    const [sellers, total] = await Promise.all([
      this.prisma.seller.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              products: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.seller.count({ where }),
    ]);

    // Calculate ratings for each seller
    const sellersWithRatings = await Promise.all(
      sellers.map(async (seller) => {
        const reviews = await this.prisma.review.aggregate({
          where: {
            product: {
              sellerId: seller.id,
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
      }),
    );

    return ResponseUtil.paginate(sellersWithRatings, total, page, limit);
  }

  async update(id: number, updateSellerDto: UpdateSellerDto) {
    const seller = await this.prisma.seller.findUnique({
      where: { id },
    });

    if (!seller) {
      throw new NotFoundException(`Seller with ID ${id} not found`);
    }

    // Check store name uniqueness if being updated
    if (updateSellerDto.storeName && updateSellerDto.storeName !== seller.storeName) {
      const existingSeller = await this.prisma.seller.findFirst({
        where: { storeName: updateSellerDto.storeName },
      });
      if (existingSeller) {
        throw new ConflictException('Store name already taken');
      }
    }

    const updatedSeller = await this.prisma.seller.update({
      where: { id },
      data: {
        storeName: updateSellerDto.storeName,
        storePhone: updateSellerDto.storePhone,
        storeEmail: updateSellerDto.storeEmail,
        storeAddress: updateSellerDto.storeAddress,
        description: updateSellerDto.description,
        bankName: updateSellerDto.bankName,
        bankAccountName: updateSellerDto.bankAccountName,
        bankAccountNumber: updateSellerDto.bankAccountNumber,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    // Clear cache
    await this.clearSellerCache(id);

    return updatedSeller;
  }

  async updateByUserId(userId: number, updateSellerDto: UpdateSellerDto) {
    const seller = await this.findByUserId(userId);
    return this.update(seller.id, updateSellerDto);
  }

  async verify(id: number, isApproved: boolean, adminId: number, rejectionReason?: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!seller) {
      throw new NotFoundException(`Seller with ID ${id} not found`);
    }

    if (seller.isVerified && isApproved) {
      throw new BadRequestException('Seller already verified');
    }

    const updatedSeller = await this.prisma.$transaction(async (prisma) => {
      // Update seller verification status
      const updated = await prisma.seller.update({
        where: { id },
        data: {
          isVerified: isApproved,
          verifiedAt: isApproved ? new Date() : null,
          verifiedBy: isApproved ? adminId : null,
          rejectionReason: !isApproved ? rejectionReason : null,
        },
        include: {
          user: true,
        },
      });

      // Log admin action
      await prisma.adminLog.create({
        data: {
          adminId,
          action: isApproved ? 'APPROVE_SELLER' : 'REJECT_SELLER',
          targetType: 'SELLER',
          targetId: id,
          details: {
            storeName: seller.storeName,
            reason: rejectionReason,
          },
        },
      });

      return updated;
    });

    // Send email notification
    if (isApproved) {
      await this.mailService.sendSellerApprovedEmail(
        seller.user.email,
        seller.user.name,
        seller.storeName,
      );
    } else {
      await this.mailService.sendSellerRejectedEmail(
        seller.user.email,
        seller.user.name,
        seller.storeName,
        rejectionReason,
      );
    }

    await this.notificationsService
      .sendSellerVerificationNotification(seller.user.id, seller.storeName, isApproved, id, rejectionReason)
      .catch((err) => console.error('Failed to send seller-verification notification:', err));

    // Clear cache
    await this.clearSellerCache(id);

    return updatedSeller;
  }

  async reject(id: number, reason: string, adminId: number) {
    return this.verify(id, false, adminId, reason);
  }

  async remove(id: number) {
    const seller = await this.prisma.seller.findUnique({
      where: { id },
      include: {
        products: {
          where: {
            isActive: true,
          },
        },
        orders: {
          where: {
            status: { notIn: ['DELIVERED', 'CANCELLED'] },
          },
        },
      },
    });

    if (!seller) {
      throw new NotFoundException(`Seller with ID ${id} not found`);
    }

    // Check if seller has active products or pending orders
    if (seller.products.length > 0) {
      throw new BadRequestException(
        'Cannot delete seller with active products. Please deactivate products first.',
      );
    }

    if (seller.orders.length > 0) {
      throw new BadRequestException(
        'Cannot delete seller with pending orders.',
      );
    }

    await this.prisma.$transaction(async (prisma) => {
      // Delete seller
      await prisma.seller.delete({
        where: { id },
      });

      // Delete associated user
      await prisma.user.delete({
        where: { id: seller.userId },
      });
    });

    // Clear cache
    await this.clearSellerCache(id);

    return true;
  }

  async uploadLogo(userId: number, file: Express.Multer.File) {
    const seller = await this.findByUserId(userId);
    
    // Delete old logo if exists
    if (seller.storeLogo) {
      await this.cloudinaryService.deleteFile(seller.storeLogo);
    }

    const result = await this.cloudinaryService.uploadFile(file, {
      folder: 'ecommerce-timor/stores/logos',
      transformation: { width: 200, height: 200, crop: 'thumb', gravity: 'face' },
    });

    await this.prisma.seller.update({
      where: { id: seller.id },
      data: { storeLogo: result.secure_url },
    });

    await this.clearSellerCache(seller.id);

    return result.secure_url;
  }

  async uploadBanner(userId: number, file: Express.Multer.File) {
    const seller = await this.findByUserId(userId);
    
    // Delete old banner if exists
    if (seller.storeBanner) {
      await this.cloudinaryService.deleteFile(seller.storeBanner);
    }

    const result = await this.cloudinaryService.uploadFile(file, {
      folder: 'ecommerce-timor/stores/banners',
      transformation: { width: 1920, height: 400, crop: 'fill' },
    });

    await this.prisma.seller.update({
      where: { id: seller.id },
      data: { storeBanner: result.secure_url },
    });

    await this.clearSellerCache(seller.id);

    return result.secure_url;
  }

  async getSellerProducts(
    sellerId: number,
    pagination: { page: number; limit: number },
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { sellerId, isActive: true },
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
      this.prisma.product.count({ where: { sellerId, isActive: true } }),
    ]);

    // Calculate average rating for each product
    const productsWithRating = products.map((product) => {
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

  async getSellerOrders(
    sellerId: number,
    pagination: { page: number; limit: number },
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { sellerId },
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
      this.prisma.order.count({ where: { sellerId } }),
    ]);

    return ResponseUtil.paginate(orders, total, page, limit);
  }

  async getStats() {
    const cacheKey = 'sellers:stats';
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const [
      totalSellers,
      verifiedSellers,
      pendingSellers,
      totalProducts,
      totalOrders,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.seller.count(),
      this.prisma.seller.count({ where: { isVerified: true } }),
      this.prisma.seller.count({ where: { isVerified: false } }),
      this.prisma.product.count({
        where: {
          seller: { isVerified: true },
          isActive: true,
        },
      }),
      this.prisma.order.count({
        where: {
          seller: { isVerified: true },
          status: { notIn: ['CANCELLED'] },
        },
      }),
      this.prisma.order.aggregate({
        where: {
          seller: { isVerified: true },
          status: 'DELIVERED',
        },
        _sum: {
          total: true,
        },
      }),
    ]);

    const stats = {
      total: totalSellers,
      verified: verifiedSellers,
      pending: pendingSellers,
      products: totalProducts,
      orders: totalOrders,
      revenue: totalRevenue._sum.total || 0,
      verificationRate: totalSellers > 0 ? (verifiedSellers / totalSellers) * 100 : 0,
    };

    // Cache for 5 minutes
    await this.redisService.set(cacheKey, JSON.stringify(stats), 300);

    return stats;
  }

  // ==================== Follow (video-shopping creator header) ====================
  // Deliberately not routed through `findOne`'s 5-minute Redis cache — that
  // cache is keyed by sellerId only and shared across all viewers, so a
  // per-user isFollowing flag must never be written into it.

  async follow(sellerId: number, userId: number) {
    const seller = await this.prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException(`Seller with ID ${sellerId} not found`);

    await this.prisma.sellerFollow.upsert({
      where: { sellerId_userId: { sellerId, userId } },
      create: { sellerId, userId },
      update: {},
    });

    const followersCount = await this.prisma.sellerFollow.count({ where: { sellerId } });
    return { isFollowing: true, followersCount };
  }

  async unfollow(sellerId: number, userId: number) {
    await this.prisma.sellerFollow.deleteMany({ where: { sellerId, userId } });
    const followersCount = await this.prisma.sellerFollow.count({ where: { sellerId } });
    return { isFollowing: false, followersCount };
  }

  async getFollowStatus(sellerId: number, userId?: number) {
    const [followersCount, isFollowing] = await Promise.all([
      this.prisma.sellerFollow.count({ where: { sellerId } }),
      userId
        ? this.prisma.sellerFollow
            .findUnique({ where: { sellerId_userId: { sellerId, userId } } })
            .then((row) => !!row)
        : Promise.resolve(false),
    ]);
    return { isFollowing, followersCount };
  }

  private async clearSellerCache(sellerId?: number) {
    if (sellerId) {
      await this.redisService.del(`seller:${sellerId}`);
      await this.redisService.del(`seller:admin:${sellerId}`);
    }
    await this.redisService.del('sellers:stats');
    // Clear paginated lists
    const keys = await this.redisService.keys('sellers:list:*');
    for (const key of keys) {
      await this.redisService.del(key);
    }
  }
}