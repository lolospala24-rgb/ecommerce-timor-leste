// placeholder for src/modules/users/users.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { hashPassword } from '../../common/utils/bcrypt.util';
import { Role, OrderStatus } from '@prisma/client';
import { ResponseUtil } from '../../common/utils/response.util';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await hashPassword(createUserDto.password);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password: hashedPassword,
        name: createUserDto.name,
        phone: createUserDto.phone,
        role: createUserDto.role || 'CUSTOMER',
        emailVerified: createUserDto.emailVerified || false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Clear cache
    await this.clearUserCache();

    return user;
  }

  async findAll(filterDto: UserFilterDto) {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      isActive,
      emailVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filterDto;

    const skip = (page - 1) * limit;
    const take = limit;

    // Build where clause
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

    if (emailVerified !== undefined) {
      where.emailVerified = emailVerified;
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
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
          updatedAt: true,
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
      }),
      this.prisma.user.count({ where }),
    ]);

    return ResponseUtil.paginate(users, total, page, limit);
  }

  async findOne(id: number) {
    // Try to get from cache
    const cacheKey = `user:${id}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
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
        updatedAt: true,
        seller: {
          select: {
            id: true,
            storeName: true,
            storePhone: true,
            storeAddress: true,
            isVerified: true,
            verifiedAt: true,
            storeLogo: true,
            _count: {
              select: { products: true },
            },
          },
        },
        customerAddress: {
          where: { isActive: true },
          orderBy: { isPrimary: 'desc' },
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

    const spentAggregate = await this.prisma.order.aggregate({
      where: { customerId: id, status: OrderStatus.DELIVERED },
      _sum: { total: true },
    });

    const result = { ...user, totalSpent: spentAggregate._sum.total || 0 };

    // Cache for 5 minutes
    await this.redisService.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        seller: {
          select: {
            id: true,
            storeName: true,
            isVerified: true,
          },
        },
      },
    });

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // If email is being changed, check for conflicts
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    // Prepare update data
    const updateData: any = {
      name: updateUserDto.name,
      phone: updateUserDto.phone,
      email: updateUserDto.email,
      avatar: updateUserDto.avatar,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(
      key => updateData[key] === undefined && delete updateData[key],
    );

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Clear cache
    await this.clearUserCache(id);

    return updatedUser;
  }

  async remove(id: number) {
    // Check if user exists
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

    // Check if user has pending orders
    if (user.orders.length > 0) {
      throw new BadRequestException(
        'Cannot delete user with pending orders. Please cancel orders first.',
      );
    }

    // Soft delete or hard delete?
    // For GDPR compliance, we'll hard delete but check dependencies first
    
    await this.prisma.user.delete({
      where: { id },
    });

    // Clear cache
    await this.clearUserCache(id);

    return true;
  }

  async blockUser(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.role === Role.ADMIN) {
      throw new ForbiddenException('Cannot block an admin user');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    // Clear cache and invalidate sessions
    await this.clearUserCache(id);
    await this.redisService.del(`refresh_token:${id}`);

    return updatedUser;
  }

  async unblockUser(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    // Clear cache
    await this.clearUserCache(id);

    return updatedUser;
  }

  async changeRole(id: number, role: Role) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Prevent changing own role if it would lock out
    // This check should be done in controller with current user context

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    // Clear cache
    await this.clearUserCache(id);

    return updatedUser;
  }

  async getStats() {
    const cacheKey = 'users:stats';
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const [
      totalUsers,
      activeUsers,
      verifiedUsers,
      adminCount,
      sellerCount,
      customerCount,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { emailVerified: true } }),
      this.prisma.user.count({ where: { role: Role.ADMIN } }),
      this.prisma.user.count({ where: { role: Role.SELLER } }),
      this.prisma.user.count({ where: { role: Role.CUSTOMER } }),
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

    const stats = {
      total: totalUsers,
      active: activeUsers,
      verified: verifiedUsers,
      byRole: {
        admin: adminCount,
        seller: sellerCount,
        customer: customerCount,
      },
      newUsers: {
        today: newUsersToday,
        thisWeek: newUsersThisWeek,
        thisMonth: newUsersThisMonth,
      },
    };

    // Cache for 5 minutes
    await this.redisService.set(cacheKey, JSON.stringify(stats), 300);

    return stats;
  }

  private async clearUserCache(userId?: number) {
    if (userId) {
      await this.redisService.del(`user:${userId}`);
    }
    await this.redisService.del('users:stats');
    // Clear paginated lists - could be more specific
    const keys = await this.redisService.keys('users:list:*');
    for (const key of keys) {
      await this.redisService.del(key);
    }
  }
}