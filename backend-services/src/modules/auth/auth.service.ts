// placeholder for src/modules/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MailService } from '../../mail/mail.service';
import { hashPassword, comparePassword } from '../../common/utils/bcrypt.util';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await hashPassword(registerDto.password);

    // Generate email verification token
    const emailVerificationToken = uuidv4();
    const emailVerificationExpiry = new Date();
    emailVerificationExpiry.setHours(emailVerificationExpiry.getHours() + 24);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        name: registerDto.name,
        phone: registerDto.phone,
        role: 'CUSTOMER',
        emailVerificationToken,
        emailVerificationExpiry,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    // Send verification email
    await this.mailService.sendEmailVerification(
      user.email,
      user.name,
      emailVerificationToken,
    );

    return user;
  }

  async validateUser(email: string, password: string): Promise<any> {
    const lockKey = `login_attempts:${email.toLowerCase()}`;
    const attempts = parseInt((await this.redisService.get(lockKey)) || '0', 10);
    if (attempts >= 5) {
      throw new UnauthorizedException(
        'Too many failed login attempts. Please try again in 15 minutes.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        seller: true,
      },
    });

    if (!user) {
      await this.recordFailedLogin(lockKey, attempts);
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      await this.recordFailedLogin(lockKey, attempts);
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.redisService.del(lockKey);

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled. Please contact support.');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email address first');
    }

    const { password: _, ...result } = user;
    return result;
  }

  private async recordFailedLogin(lockKey: string, attempts: number): Promise<void> {
    await this.redisService.set(lockKey, String(attempts + 1), 15 * 60);
  }

  async login(user: any) {
    const jti = uuidv4();
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    // Store refresh token in Redis with 7 days expiry
    await this.redisService.set(
      `refresh_token:${user.id}`,
      refreshToken,
      7 * 24 * 60 * 60,
    );

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Get user with seller info
    const userWithSeller = await this.prisma.user.findUnique({
      where: { id: user.id },
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
            storeLogo: true,
          },
        },
        createdAt: true,
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 86400, // 24 hours in seconds
      user: userWithSeller,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      // Check if token exists in Redis
      const storedToken = await this.redisService.get(`refresh_token:${payload.sub}`);
      
      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new tokens
      const newPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        jti: uuidv4(),
      };

      const newAccessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(
        { sub: user.id },
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        },
      );

      // Update refresh token in Redis
      await this.redisService.set(
        `refresh_token:${user.id}`,
        newRefreshToken,
        7 * 24 * 60 * 60,
      );

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        token_type: 'Bearer',
        expires_in: 86400,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: number, accessToken?: string) {
    await this.redisService.del(`refresh_token:${userId}`);

    if (accessToken) {
      try {
        const payload = this.jwtService.verify(accessToken, {
          secret: this.configService.get('JWT_SECRET'),
        });
        if (payload?.jti) {
          const ttl = this.getTokenRemainingTtl(payload);
          if (ttl > 0) {
            await this.redisService.set(`token_blacklist:${payload.jti}`, '1', ttl);
          }
        }
      } catch {
        // Token already expired or invalid — no blacklist needed
      }
    }

    return true;
  }

  private getTokenRemainingTtl(payload: { exp?: number }): number {
    if (!payload.exp) {
      return 86400;
    }
    return Math.max(payload.exp - Math.floor(Date.now() / 1000), 0);
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        seller: true,
        customerAddress: {
          where: { isActive: true },
          orderBy: { isPrimary: 'desc' },
        },
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
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
          },
        },
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
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
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, emailVerificationToken, emailVerificationExpiry, resetToken, resetExpiry, ...result } = user;
    return result;
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await comparePassword(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await hashPassword(changePasswordDto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Invalidate all refresh tokens
    await this.redisService.del(`refresh_token:${userId}`);

    return true;
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if user exists for security
    if (!user) {
      return true;
    }

    const resetToken = uuidv4();
    const resetExpiry = new Date();
    resetExpiry.setHours(resetExpiry.getHours() + 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetExpiry,
      },
    });

    await this.mailService.sendPasswordResetEmail(user.email, user.name, resetToken);

    return true;
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetExpiry: null,
      },
    });

    // Invalidate all sessions
    await this.redisService.del(`refresh_token:${user.id}`);

    return true;
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    return true;
  }

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.emailVerified) {
      // Don't reveal if user exists or already verified
      return true;
    }

    const emailVerificationToken = uuidv4();
    const emailVerificationExpiry = new Date();
    emailVerificationExpiry.setHours(emailVerificationExpiry.getHours() + 24);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken,
        emailVerificationExpiry,
      },
    });

    await this.mailService.sendEmailVerification(
      user.email,
      user.name,
      emailVerificationToken,
    );

    return true;
  }
}