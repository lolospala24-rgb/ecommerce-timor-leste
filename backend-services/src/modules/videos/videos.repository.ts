import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VideosRepository {
  constructor(private prisma: PrismaService) {}

  create(data: any) {
    return (this.prisma as any).video.create({ data });
  }

  // Shared shape for "video with everything the shopping feed needs":
  // the single linked product (with its seller/creator + follower count),
  // and cheap aggregate counts for comments/saves. Per-viewer state
  // (isLiked/isSaved/isFollowingCreator) is attached separately in
  // `attachViewerState` since it depends on the current request's user.
  private videoInclude() {
    return {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          comparePrice: true,
          thumbnail: true,
          images: true,
          stock: true,
          seller: {
            select: {
              id: true,
              storeName: true,
              storeLogo: true,
              isVerified: true,
              _count: { select: { followers: true } },
            },
          },
        },
      },
      _count: { select: { comments: true, savedBy: true } },
    } as const;
  }

  private async attachViewerState(videos: any[], userId?: number | null) {
    if (!userId || videos.length === 0) {
      return videos.map((v) => ({ ...v, isLiked: false, isSaved: false, isFollowingCreator: false }));
    }

    const videoIds = videos.map((v) => v.id);
    const sellerIds = [...new Set(videos.map((v) => v.product?.seller?.id).filter(Boolean))] as number[];

    const [likes, saves, follows] = await Promise.all([
      this.prisma.videoLike.findMany({ where: { userId, videoId: { in: videoIds } }, select: { videoId: true } }),
      this.prisma.videoSave.findMany({ where: { userId, videoId: { in: videoIds } }, select: { videoId: true } }),
      sellerIds.length
        ? this.prisma.sellerFollow.findMany({ where: { userId, sellerId: { in: sellerIds } }, select: { sellerId: true } })
        : Promise.resolve([] as { sellerId: number }[]),
    ]);

    const likedSet = new Set(likes.map((l) => l.videoId));
    const savedSet = new Set(saves.map((s) => s.videoId));
    const followedSet = new Set(follows.map((f) => f.sellerId));

    return videos.map((v) => ({
      ...v,
      isLiked: likedSet.has(v.id),
      isSaved: savedSet.has(v.id),
      isFollowingCreator: v.product?.seller ? followedSet.has(v.product.seller.id) : false,
    }));
  }

  async findById(id: number, userId?: number | null) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: this.videoInclude(),
    });
    if (!video) return null;
    const [withState] = await this.attachViewerState([video], userId);
    return withState;
  }

  update(id: number, data: any) {
    return (this.prisma as any).video.update({ where: { id }, data });
  }

  delete(id: number) {
    return (this.prisma as any).video.delete({ where: { id } });
  }

  async findFeed({ filter, page = 1, limit = 20, categoryId }: any, userId?: number | null) {
    const skip = (page - 1) * limit;
    const where: any = { isActive: true };
    const productWhere: any = {};

    if (categoryId) {
      productWhere.categoryId = categoryId;
    }

    if (filter === 'following') {
      // No signed-in viewer can't have anyone to follow — return an empty
      // page rather than either erroring or silently falling back to the
      // full public feed (which would misrepresent "Following" as having
      // real content for a guest).
      if (!userId) return { items: [], total: 0 };
      productWhere.seller = { followers: { some: { userId } } };
    }

    if (Object.keys(productWhere).length) {
      where.product = productWhere;
    }

    let orderBy: any = { createdAt: 'desc' };

    if (filter === 'popular') orderBy = { views: 'desc' };
    if (filter === 'trending') orderBy = { likes: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.video.findMany({
        where,
        include: this.videoInclude(),
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.video.count({ where }),
    ]);

    return { items: await this.attachViewerState(items, userId), total };
  }

  // ==================== Admin ====================
  // Unlike findFeed (customer-facing, isActive-only), this returns every
  // video regardless of publish state — the admin table needs to see
  // drafts too. No viewer-state (isLiked/isSaved) since admin actions
  // don't need it.

  async findAllAdmin({
    search,
    status,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }: {
    search?: string;
    status?: 'active' | 'draft' | 'all';
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'views' | 'likes' | 'comments';
    sortOrder?: 'asc' | 'desc';
  }) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.title = { contains: search };
    }

    if (status === 'active') where.isActive = true;
    if (status === 'draft') where.isActive = false;

    const orderBy =
      sortBy === 'comments'
        ? { comments: { _count: sortOrder } }
        : { [sortBy]: sortOrder };

    const [items, total] = await Promise.all([
      this.prisma.video.findMany({
        where,
        include: this.videoInclude(),
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.video.count({ where }),
    ]);

    return { items, total };
  }

  async findAllComments({
    search,
    videoId,
    page = 1,
    limit = 20,
  }: {
    search?: string;
    videoId?: number;
    page?: number;
    limit?: number;
  }) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) where.content = { contains: search };
    if (videoId) where.videoId = videoId;

    const [items, total] = await Promise.all([
      this.prisma.videoComment.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          video: { select: { id: true, title: true, thumbnailUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.videoComment.count({ where }),
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

  async findRecommendations(id: number, userId?: number | null, limit = 10) {
    const items = await this.prisma.video.findMany({
      where: {
        isActive: true,
        id: { not: id },
      },
      include: this.videoInclude(),
      orderBy: { views: 'desc' },
      take: limit,
    });

    return this.attachViewerState(items, userId);
  }

  // ==================== Likes ====================

  async likeVideo(videoId: number, userId: number) {
    const created = await this.prisma.videoLike
      .create({ data: { videoId, userId } })
      .then(() => true)
      .catch((error: any) => {
        if (error?.code === 'P2002') return false; // already liked — idempotent
        throw error;
      });

    if (created) {
      await this.prisma.video.update({ where: { id: videoId }, data: { likes: { increment: 1 } } });
    }

    return this.prisma.video.findUnique({ where: { id: videoId }, select: { likes: true } });
  }

  async unlikeVideo(videoId: number, userId: number) {
    const result = await this.prisma.videoLike.deleteMany({ where: { videoId, userId } });

    if (result.count > 0) {
      await this.prisma.video.update({ where: { id: videoId }, data: { likes: { decrement: 1 } } });
    }

    return this.prisma.video.findUnique({ where: { id: videoId }, select: { likes: true } });
  }

  // ==================== Saves / Bookmarks ====================

  async saveVideo(videoId: number, userId: number) {
    await this.prisma.videoSave.upsert({
      where: { videoId_userId: { videoId, userId } },
      create: { videoId, userId },
      update: {},
    });
    return this.prisma.videoSave.count({ where: { videoId } });
  }

  async unsaveVideo(videoId: number, userId: number) {
    await this.prisma.videoSave.deleteMany({ where: { videoId, userId } });
    return this.prisma.videoSave.count({ where: { videoId } });
  }

  async findSavedByUser(userId: number, { page = 1, limit = 20 }: { page?: number; limit?: number }) {
    const skip = (page - 1) * limit;
    const [saves, total] = await Promise.all([
      this.prisma.videoSave.findMany({
        where: { userId },
        include: { video: { include: this.videoInclude() } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.videoSave.count({ where: { userId } }),
    ]);

    const videos = await this.attachViewerState(
      saves.map((s) => s.video),
      userId,
    );

    return { items: videos, total };
  }

  // ==================== Comments ====================

  async findComments(videoId: number, { page = 1, limit = 20 }: { page?: number; limit?: number }) {
    const skip = (page - 1) * limit;
    const commentInclude = {
      user: { select: { id: true, name: true } },
    };

    const [items, total] = await Promise.all([
      this.prisma.videoComment.findMany({
        where: { videoId, parentId: null },
        include: {
          ...commentInclude,
          replies: {
            include: commentInclude,
            orderBy: { createdAt: 'asc' as const },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.videoComment.count({ where: { videoId, parentId: null } }),
    ]);

    return { items, total };
  }

  createComment(videoId: number, userId: number, content: string, parentId?: number | null) {
    return this.prisma.videoComment.create({
      data: { videoId, userId, content, parentId: parentId ?? null },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  findCommentById(id: number) {
    return this.prisma.videoComment.findUnique({ where: { id } });
  }

  deleteComment(id: number) {
    return this.prisma.videoComment.delete({ where: { id } });
  }

  likeComment(id: number) {
    return this.prisma.videoComment.update({ where: { id }, data: { likes: { increment: 1 } } });
  }
}
