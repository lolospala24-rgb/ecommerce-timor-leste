import api from '@/lib/api';
import { Video, VideoResponse, VideoFilters } from '@/types/video';
import { Product } from '@/types/product.types';
import { Creator } from '@/types/creator';

export interface SellerProfile {
  id: string;
  storeName: string;
  storeLogo?: string;
  description?: string;
  isVerified?: boolean;
  _count?: {
    products?: number;
  };
}

export interface SellerProduct {
  id: string;
  name: string;
  description?: string;
  price?: number;
  thumbnail?: string;
  totalReviews?: number;
}

class VideoService {
  private static instance: VideoService;

  static getInstance(): VideoService {
    if (!VideoService.instance) {
      VideoService.instance = new VideoService();
    }
    return VideoService.instance;
  }

  private normalizeCreator(raw: any): Creator {
    if (!raw) {
      return {
        id: 'unknown',
        name: 'Creator',
        username: 'creator',
        avatar: '/images/placeholder.png',
        isVerified: false,
        followers: 0,
      };
    }

    return {
      id: String(raw.id ?? raw.userId ?? 'unknown'),
      name: raw.name ?? raw.storeName ?? raw.store_name ?? 'Creator',
      username: raw.username ?? raw.storeSlug ?? raw.slug ?? 'creator',
      avatar: raw.avatar ?? raw.storeLogo ?? raw.thumbnail ?? '/images/placeholder.png',
      isVerified: Boolean(raw.isVerified ?? raw.verified ?? false),
      followers: Number(raw.followers ?? raw._count?.followers ?? 0),
      bio: raw.bio ?? raw.description,
      storeName: raw.storeName ?? raw.store_name,
    };
  }

  private normalizeProduct(raw: any): Product {
    return {
      id: Number(raw.id ?? 0),
      name: raw.name ?? 'Product',
      nameTetum: raw.nameTetum ?? raw.name_tetum ?? null,
      description: raw.description ?? '',
      descriptionTetum: raw.descriptionTetum ?? raw.description_tetum ?? null,
      price: Number(raw.price ?? 0),
      comparePrice: raw.comparePrice ?? raw.compare_price ?? null,
      stock: Number(raw.stock ?? 0),
      sku: raw.sku ?? null,
      barcode: raw.barcode ?? null,
      videoUrl: raw.videoUrl ?? raw.video_url ?? null,
      images: Array.isArray(raw.images) ? raw.images : [],
      thumbnail: raw.thumbnail ?? raw.image ?? raw.imageUrl ?? null,
      weight: raw.weight ?? null,
      slug: raw.slug ?? `product-${raw.id ?? 0}`,
      sellerId: Number(raw.sellerId ?? raw.seller?.id ?? 0),
      categoryId: Number(raw.categoryId ?? raw.category?.id ?? 0),
      isActive: raw.isActive ?? true,
      isFeatured: raw.isFeatured ?? false,
      createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
      updatedAt: raw.updatedAt ?? raw.updated_at ?? new Date().toISOString(),
      seller: raw.seller ? { id: Number(raw.seller.id), storeName: raw.seller.storeName ?? 'Seller' } : undefined,
      category: raw.category ? { id: Number(raw.category.id), name: raw.category.name, slug: raw.category.slug ?? 'category' } : undefined,
      rating: raw.rating ?? raw.averageRating ?? undefined,
      totalReviews: raw.totalReviews ?? raw.reviews ?? undefined,
    };
  }

  private normalizeVideo(raw: any): Video {
    const item = raw?.data ?? raw;
    const product = item?.product ?? item?.sellerProduct ?? null;
    const seller = item?.creator ?? item?.seller ?? product?.seller ?? null;

    return {
      id: String(item?.id ?? item?.videoId ?? '0'),
      title: item?.title ?? item?.name ?? 'Untitled video',
      description: item?.description ?? '',
      videoUrl: item?.videoUrl ?? item?.video_url ?? item?.sourceUrl ?? '',
      thumbnailUrl: item?.thumbnailUrl ?? item?.thumbnail ?? item?.coverImage ?? product?.thumbnail ?? '/images/placeholder.png',
      duration: Number(item?.duration ?? item?.videoDuration ?? 0),
      views: Number(item?.views ?? 0),
      likes: Number(item?.likes ?? 0),
      comments: Number(item?.comments ?? item?.commentCount ?? 0),
      shares: Number(item?.shares ?? 0),
      createdAt: item?.createdAt ?? item?.created_at ?? new Date().toISOString(),
      updatedAt: item?.updatedAt ?? item?.updated_at,
      creator: this.normalizeCreator(seller),
      tags: Array.isArray(item?.tags) ? item.tags : [],
      products: Array.isArray(item?.products) ? item.products.map((productItem: any) => this.normalizeProduct(productItem)) : product ? [this.normalizeProduct(product)] : [],
      isLiked: Boolean(item?.isLiked),
      isSaved: Boolean(item?.isSaved),
      category: item?.category ?? product?.category?.name,
      status: item?.status ?? 'PUBLISHED',
      isActive: item?.isActive ?? true,
    };
  }

  private normalizeVideoResponse(payload: any, page: number, limit: number): VideoResponse {
    const items = Array.isArray(payload) ? payload : payload?.data ?? payload?.items ?? payload?.videos ?? [];
    const total = Number(payload?.total ?? payload?.meta?.total ?? items.length ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / Math.max(limit, 1)));

    return {
      data: (items as any[]).map((item) => this.normalizeVideo(item)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async getVideos(filters: VideoFilters): Promise<VideoResponse> {
    const { page = 1, limit = 12, category, search, creatorId } = filters;
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(category && { category }),
      ...(search && { search }),
      ...(creatorId && { creatorId }),
    });

    const response = await api.get<any>(`/videos/feed?${params}`);
    const payload = response?.data ?? response;

    return this.normalizeVideoResponse(payload, Number(page), Number(limit));
  }

  async getVideoById(id: string): Promise<Video> {
    const response = await api.get<any>(`/videos/${id}`);
    const payload = response?.data ?? response;
    return this.normalizeVideo(payload);
  }

  async getVideoProducts(id: string): Promise<Product[]> {
    const response = await api.get<any>(`/videos/${id}/products`);
    const payload = response?.data ?? response;
    const products = Array.isArray(payload) ? payload : payload?.data ?? payload?.items ?? [];
    return products.map((product: any) => this.normalizeProduct(product));
  }

  async getRecommendations(id: string): Promise<Video[]> {
    const response = await api.get<any>(`/videos/${id}/recommendations`);
    const payload = response?.data ?? response;
    const videos = Array.isArray(payload) ? payload : payload?.data ?? payload?.items ?? [];
    return videos.map((video: any) => this.normalizeVideo(video));
  }

  async likeVideo(id: string): Promise<{ likes: number; isLiked: boolean }> {
    const response = await api.post<{ likes: number; isLiked: boolean }>(`/videos/${id}/like`);
    return response;
  }

  async unlikeVideo(id: string): Promise<{ likes: number; isLiked: boolean }> {
    const response = await api.delete<{ likes: number; isLiked: boolean }>(`/videos/${id}/like`);
    return response;
  }

  async shareVideo(id: string): Promise<{ shares: number }> {
    const response = await api.post<{ shares: number }>(`/videos/${id}/share`);
    return response;
  }

  async saveVideo(id: string): Promise<{ isSaved: boolean }> {
    const response = await api.post<{ isSaved: boolean }>(`/videos/${id}/save`);
    return response;
  }

  async unsaveVideo(id: string): Promise<{ isSaved: boolean }> {
    const response = await api.delete<{ isSaved: boolean }>(`/videos/${id}/save`);
    return response;
  }

  async getSellerProfile(id: string): Promise<SellerProfile> {
    const response = await api.get<SellerProfile>(`/sellers/${id}`);
    return response;
  }

  async getSellerProducts(id: string, page = 1, limit = 12): Promise<{ items: SellerProduct[] }> {
    const response = await api.get<{ items: SellerProduct[] }>(`/sellers/${id}/products?page=${page}&limit=${limit}`);
    return response;
  }
}

export const videoService = VideoService.getInstance();
export const getSellerProfile = (id: string) => videoService.getSellerProfile(id);
export const getSellerProducts = (id: string, page = 1, limit = 12) => videoService.getSellerProducts(id, page, limit);