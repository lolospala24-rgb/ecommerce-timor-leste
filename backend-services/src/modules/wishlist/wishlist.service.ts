import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  private mapWishlistItem(item: {
    product: {
      id: number;
      name: string;
      slug: string;
      price: number;
      comparePrice: number | null;
      thumbnail: string | null;
      stock: number;
      isActive: boolean;
    };
  }) {
    return {
      id: item.product.id,
      name: item.product.name,
      slug: item.product.slug,
      price: item.product.price,
      comparePrice: item.product.comparePrice,
      thumbnail: item.product.thumbnail,
      stock: item.product.stock,
      isActive: item.product.isActive,
    };
  }

  async getWishlist(userId: number) {
    const items = await this.prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            comparePrice: true,
            thumbnail: true,
            stock: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: items.map((item) => this.mapWishlistItem(item)),
      totalItems: items.length,
    };
  }

  async addToWishlist(userId: number, dto: AddToWishlistDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: dto.productId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Product already in wishlist');
    }

    await this.prisma.wishlistItem.create({
      data: {
        userId,
        productId: dto.productId,
      },
    });

    return this.getWishlist(userId);
  }

  async removeFromWishlist(userId: number, productId: number) {
    const item = await this.prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Product not found in wishlist');
    }

    await this.prisma.wishlistItem.delete({
      where: { id: item.id },
    });

    return this.getWishlist(userId);
  }

  async clearWishlist(userId: number) {
    await this.prisma.wishlistItem.deleteMany({
      where: { userId },
    });

    return { items: [], totalItems: 0 };
  }
}
