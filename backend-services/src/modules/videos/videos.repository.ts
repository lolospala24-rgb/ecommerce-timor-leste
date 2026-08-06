import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VideosRepository {
  constructor(private prisma: PrismaService) {}

  create(data: any) {
    return (this.prisma as any).video.create({ data });
  }

  findById(id: number) {
    return (this.prisma as any).video.findUnique({ where: { id }, include: { product: true } });
  }

  update(id: number, data: any) {
    return (this.prisma as any).video.update({ where: { id }, data });
  }

  delete(id: number) {
    return (this.prisma as any).video.delete({ where: { id } });
  }

  async findFeed({ filter, page = 1, limit = 20, categoryId }: any) {
    const skip = (page - 1) * limit;
    const where: any = { isActive: true };

    if (categoryId) {
      where.product = { categoryId };
    }

    let orderBy: any = { createdAt: 'desc' };

    if (filter === 'popular') orderBy = { views: 'desc' };
    if (filter === 'trending') orderBy = { likes: 'desc' };

    const [items, total] = await Promise.all([
      (this.prisma as any).video.findMany({
        where,
        include: { product: { select: { id: true, name: true, thumbnail: true, price: true, slug: true } } },
        orderBy,
        skip,
        take: limit,
      }),
      (this.prisma as any).video.count({ where }),
    ]);

    return { items, total };
  }

  incrementField(id: number, field: 'views' | 'likes' | 'shares') {
    return (this.prisma as any).video.update({ where: { id }, data: { [field]: { increment: 1 } } });
  }

  decrementField(id: number, field: 'likes') {
    return (this.prisma as any).video.update({
      where: { id },
      data: { [field]: { decrement: 1 } },
    });
  }

  async findProductsByVideoId(id: number) {
    const video = await (this.prisma as any).video.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            thumbnail: true,
            description: true,
            stock: true,
          },
        },
      },
    });
    if (!video) return [];
    return video.product ? [video.product] : [];
  }

  async findRecommendations(id: number, limit = 10) {
    const video = await (this.prisma as any).video.findUnique({
      where: { id },
      select: { productId: true },
    });

    return (this.prisma as any).video.findMany({
      where: {
        isActive: true,
        id: { not: id },
      },
      include: {
        product: {
          select: { id: true, name: true, thumbnail: true, price: true, slug: true },
        },
      },
      orderBy: { views: 'desc' },
      take: limit,
    });
  }
}
