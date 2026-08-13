// placeholder for src/modules/reviews/reviews.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import 'multer';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MailService } from '../../mail/mail.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { SettingsService } from '../settings/settings.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ResponseUtil } from '../../common/utils/response.util';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private mailService: MailService,
    private cloudinaryService: CloudinaryService,
    private settingsService: SettingsService,
  ) {}

  async create(
    createReviewDto: CreateReviewDto,
    userId: number,
    images: Express.Multer.File[],
  ) {
    const settings = await this.settingsService.getSettings();
    if (!settings.enableReviews) {
      throw new BadRequestException('Product reviews are currently disabled');
    }

    // Check if user has purchased the product
    const hasPurchased = await this.prisma.order.findFirst({
      where: {
        customerId: userId,
        status: 'DELIVERED',
        items: {
          some: {
            productId: createReviewDto.productId,
          },
        },
      },
    });

    if (!hasPurchased) {
      throw new BadRequestException('You can only review products you have purchased');
    }

    // Check if user already reviewed this product
    const existingReview = await this.prisma.review.findFirst({
      where: {
        productId: createReviewDto.productId,
        userId,
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product');
    }

    // Upload images to Cloudinary
    const uploadedImages = [];
    if (images && images.length > 0) {
      for (const image of images) {
        const result = await this.cloudinaryService.uploadFile(image, {
          folder: 'ecommerce-timor/reviews',
          transformation: { width: 800, height: 800, crop: 'limit', quality: 80 },
        });
        uploadedImages.push(result.secure_url);
      }
    }

    // Create review (pending approval by default). The existingReview check
    // above is a check-then-write that isn't atomic — two concurrent
    // submissions from the same user can both pass it and race to insert;
    // the DB's unique constraint (productId, userId) is what actually
    // prevents the duplicate, so the loser here throws P2002, not a normal
    // validation error. Translate it to the same friendly message rather
    // than letting it surface as a raw 500.
    let review;
    try {
      review = await this.prisma.review.create({
        data: {
          productId: createReviewDto.productId,
          userId,
          rating: createReviewDto.rating,
          title: createReviewDto.title,
          comment: createReviewDto.comment,
          images: uploadedImages,
          isApproved: !settings.requireReviewApproval,
          approvedAt: settings.requireReviewApproval ? null : new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              sellerId: true,
              seller: {
                select: {
                  storeName: true,
                  user: {
                    select: {
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('You have already reviewed this product');
      }
      throw error;
    }

    // Notify admin about new review
    await this.mailService.sendNewReviewNotification(review);

    // Clear product cache
    await this.clearReviewCache(createReviewDto.productId);

    return review;
  }

  // Lets the frontend show a clear reason ("already reviewed", "purchase
  // required") before the customer opens the review form, instead of only
  // finding out via a failed submit. Mirrors the exact checks create() runs
  // — this is read-only, so it can't be used to bypass them.
  async checkEligibility(productId: number, userId: number) {
    const settings = await this.settingsService.getSettings();
    if (!settings.enableReviews) {
      return { canReview: false, reason: 'reviews_disabled', message: 'Product reviews are currently disabled' };
    }

    const existingReview = await this.prisma.review.findFirst({
      where: { productId, userId },
    });
    if (existingReview) {
      return { canReview: false, reason: 'already_reviewed', message: 'You have already reviewed this product' };
    }

    const hasPurchased = await this.prisma.order.findFirst({
      where: {
        customerId: userId,
        status: 'DELIVERED',
        items: { some: { productId } },
      },
    });
    if (!hasPurchased) {
      return {
        canReview: false,
        reason: 'not_purchased',
        message: 'You can review this product after your order is delivered',
      };
    }

    return { canReview: true };
  }

  async getProductReviews(
    productId: number,
    filters: {
      page: number;
      limit: number;
      rating?: number;
      withImages?: boolean;
    },
  ) {
    const { page, limit, rating, withImages } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      productId,
      isApproved: true,
    };

    if (rating) {
      where.rating = rating;
    }

    if (withImages) {
      where.images = { isEmpty: false };
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where }),
    ]);

    return ResponseUtil.paginate(reviews, total, page, limit);
  }

  async getReviewStats(productId: number) {
    const cacheKey = `review:stats:${productId}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const [stats, distribution] = await Promise.all([
      this.prisma.review.aggregate({
        where: {
          productId,
          isApproved: true,
        },
        _avg: {
          rating: true,
        },
        _count: true,
        _sum: {
          rating: true,
        },
      }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: {
          productId,
          isApproved: true,
        },
        _count: true,
      }),
    ]);

    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    for (const item of distribution) {
      ratingDistribution[item.rating] = item._count;
    }

    const result = {
      averageRating: stats._avg.rating || 0,
      totalReviews: stats._count,
      ratingDistribution,
      percentagePositive: stats._avg.rating ? (stats._avg.rating / 5) * 100 : 0,
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 600);

    return result;
  }

  async getUserReviews(
    userId: number,
    pagination: { page: number; limit: number },
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { userId },
        skip,
        take: limit,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              thumbnail: true,
              seller: {
                select: {
                  storeName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where: { userId } }),
    ]);

    return ResponseUtil.paginate(reviews, total, page, limit);
  }

  async getSellerReviews(
    userId: number,
    filters: {
      page: number;
      limit: number;
      status?: string;
    },
  ) {
    const { page, limit, status } = filters;
    const skip = (page - 1) * limit;

    // Get seller profile
    const seller = await this.prisma.seller.findUnique({
      where: { userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const where: any = {
      product: {
        sellerId: seller.id,
      },
    };

    if (status === 'pending') {
      where.isApproved = false;
    } else if (status === 'approved') {
      where.isApproved = true;
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              thumbnail: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where }),
    ]);

    // Calculate average rating for seller
    const ratingStats = await this.prisma.review.aggregate({
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
      data: ResponseUtil.paginate(reviews, total, page, limit),
      sellerRating: ratingStats._avg.rating || 0,
      totalSellerReviews: ratingStats._count,
    };
  }

  async getPendingReviews(pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // A rejected review is also isApproved:false, distinguished only by
    // having a rejectionReason set — exclude those or they'd resurface in
    // the pending queue forever after being decided on.
    const pendingWhere = { isApproved: false, rejectionReason: null };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: pendingWhere,
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
          product: {
            select: {
              id: true,
              name: true,
              seller: {
                select: {
                  storeName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.review.count({ where: pendingWhere }),
    ]);

    return ResponseUtil.paginate(reviews, total, page, limit);
  }

  async getAdminReviews(filters: {
    page: number;
    limit: number;
    status?: 'pending' | 'approved' | 'rejected' | 'all';
    search?: string;
  }) {
    const { page, limit, status = 'all', search } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status === 'pending') {
      where.isApproved = false;
      where.rejectionReason = null;
    } else if (status === 'approved') {
      where.isApproved = true;
    } else if (status === 'rejected') {
      where.isApproved = false;
      where.rejectionReason = { not: null };
    }

    if (search) {
      where.OR = [
        { comment: { contains: search } },
        { title: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { product: { name: { contains: search } } },
      ];
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: {
            select: {
              id: true,
              name: true,
              seller: { select: { storeName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where }),
    ]);

    return ResponseUtil.paginate(reviews, total, page, limit);
  }

  async findOne(id: number, userId: number, userRole: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            thumbnail: true,
            sellerId: true,
            seller: {
              select: {
                id: true,
                storeName: true,
              },
            },
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    // Check permissions for viewing
    if (!review.isApproved && userRole !== 'ADMIN') {
      const seller = await this.prisma.seller.findUnique({
        where: { userId },
      });
      
      if (review.userId !== userId && (!seller || review.product.sellerId !== seller.id)) {
        throw new ForbiddenException('You cannot view this review');
      }
    }

    return review;
  }

  async update(id: number, updateReviewDto: UpdateReviewDto, userId: number) {
    const review = await this.prisma.review.findFirst({
      where: { id, userId },
    });

    if (!review) {
      throw new NotFoundException('Review not found or you do not have permission');
    }

    if (review.isApproved) {
      throw new BadRequestException('Cannot update an approved review');
    }

    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: {
        rating: updateReviewDto.rating,
        title: updateReviewDto.title,
        comment: updateReviewDto.comment,
      },
    });

    await this.clearReviewCache(review.productId);

    return updatedReview;
  }

  async approveReview(id: number, adminId: number) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        user: true,
        product: {
          include: {
            seller: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    const approvedReview = await this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.review.update({
        where: { id },
        data: {
          isApproved: true,
          approvedAt: new Date(),
        },
      });

      await prisma.adminLog.create({
        data: {
          adminId,
          action: 'APPROVE_REVIEW',
          targetType: 'REVIEW',
          targetId: id,
          details: {
            productId: review.productId,
            userId: review.userId,
            rating: review.rating,
          },
        },
      });

      return updated;
    });

    // Send email to user that their review was approved
    await this.mailService.sendReviewApprovedEmail(
      review.user.email,
      review.user.name,
      review.product.name,
    );

    // Notify seller about new review
    await this.mailService.sendNewReviewNotificationToSeller(
      review.product.seller.user.email,
      review.product.seller.storeName,
      review,
    );

    await this.clearReviewCache(review.productId);

    return approvedReview;
  }

  async rejectReview(id: number, reason: string, adminId: number) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        user: true,
        product: true,
      },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    const rejectedReview = await this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.review.update({
        where: { id },
        data: {
          isApproved: false,
          rejectionReason: reason,
        },
      });

      await prisma.adminLog.create({
        data: {
          adminId,
          action: 'REJECT_REVIEW',
          targetType: 'REVIEW',
          targetId: id,
          details: {
            productId: review.productId,
            userId: review.userId,
            reason,
          },
        },
      });

      return updated;
    });

    // Send email to user that their review was rejected
    await this.mailService.sendReviewRejectedEmail(
      review.user.email,
      review.user.name,
      review.product.name,
      reason,
    );

    await this.clearReviewCache(review.productId);

    return rejectedReview;
  }

  async markHelpful(id: number, userId: number) {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    // Check if user already marked as helpful
    const existing = await this.prisma.reviewHelpful.findUnique({
      where: {
        reviewId_userId: {
          reviewId: id,
          userId,
        },
      },
    });

    if (existing) {
      // Remove helpful mark
      await this.prisma.reviewHelpful.delete({
        where: {
          reviewId_userId: {
            reviewId: id,
            userId,
          },
        },
      });
      
      await this.prisma.review.update({
        where: { id },
        data: {
          helpfulCount: {
            decrement: 1,
          },
        },
      });
      
      return { helpful: false };
    } else {
      // Add helpful mark
      await this.prisma.reviewHelpful.create({
        data: {
          reviewId: id,
          userId,
        },
      });
      
      await this.prisma.review.update({
        where: { id },
        data: {
          helpfulCount: {
            increment: 1,
          },
        },
      });
      
      return { helpful: true };
    }
  }

  async reportReview(id: number, reason: string, userId: number) {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    const report = await this.prisma.reviewReport.create({
      data: {
        reviewId: id,
        userId,
        reason,
      },
    });

    // Notify admin about report
    // This would typically send an email or create a notification

    return report;
  }

  async remove(id: number, userId: number, userRole: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    // Check permissions
    if (userRole !== 'ADMIN' && review.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this review');
    }

    // Delete images from Cloudinary
    const reviewImages = Array.isArray(review.images) ? (review.images as string[]) : [];
    if (reviewImages.length > 0) {
      for (const imageUrl of reviewImages) {
        await this.cloudinaryService.deleteFile(imageUrl);
      }
    }

    await this.prisma.review.delete({
      where: { id },
    });

    await this.clearReviewCache(review.productId);

    return true;
  }

  async replyToReview(id: number, reply: string, userId: number) {
    // Get seller profile
    const seller = await this.prisma.seller.findUnique({
      where: { userId },
    });

    if (!seller) {
      throw new ForbiddenException('Only sellers can reply to reviews');
    }

    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        product: true,
        user: true,
      },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    if (review.product.sellerId !== seller.id) {
      throw new ForbiddenException('You can only reply to reviews for your products');
    }

    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: {
        sellerReply: reply,
        sellerReplyAt: new Date(),
      },
    });

    // Send email notification to customer
    await this.mailService.sendReviewReplyNotification(
      review.user.email,
      review.user.name,
      review.product.name,
      reply,
    );

    await this.clearReviewCache(review.productId);

    return updatedReview;
  }

  async deleteReply(id: number, userId: number, userRole: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    if (userRole !== 'ADMIN') {
      const seller = await this.prisma.seller.findUnique({
        where: { userId },
      });

      if (!seller || review.product.sellerId !== seller.id) {
        throw new ForbiddenException('You do not have permission to delete this reply');
      }
    }

    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: {
        sellerReply: null,
        sellerReplyAt: null,
      },
    });

    await this.clearReviewCache(review.productId);

    return updatedReview;
  }

  async getUserReviewStats(userId: number) {
    const [totalReviews, approvedReviews, pendingReviews, averageRating] = await Promise.all([
      this.prisma.review.count({ where: { userId } }),
      this.prisma.review.count({ where: { userId, isApproved: true } }),
      this.prisma.review.count({ where: { userId, isApproved: false } }),
      this.prisma.review.aggregate({
        where: { userId, isApproved: true },
        _avg: { rating: true },
      }),
    ]);

    return {
      total: totalReviews,
      approved: approvedReviews,
      pending: pendingReviews,
      averageRating: averageRating._avg.rating || 0,
    };
  }

  private async clearReviewCache(productId: number) {
    await this.redisService.del(`review:stats:${productId}`);
    await this.redisService.del(`product:${productId}`);

    // findBySlug() (the storefront's actual product-detail fetch) now bakes
    // rating/totalReviews/ratingDistribution into its cached payload, so a
    // new/approved/rejected review must also invalidate that cache entry or
    // the rating shown on the product page goes stale for up to 5 minutes.
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { slug: true },
    });
    if (product) {
      await this.redisService.del(`product:slug:${product.slug}`);
    }
  }
}