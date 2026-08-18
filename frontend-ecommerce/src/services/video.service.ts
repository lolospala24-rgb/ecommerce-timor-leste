import api from '@/lib/api';
import { Video, VideoCreator, VideoProduct, VideoListResult, VideoFeedFilters } from '@/types/video';

// The backend's global TransformInterceptor wraps every controller return
// value as `{ status: 'success', data: <returned value> }`. This module's
// controllers *also* return their own `{ success, data, total? }` envelope,
// so once axios's own interceptor strips the HTTP envelope, `response.data`
// is still that controller envelope, not the payload — the real payload is
// `response.data.data` (and `response.data.total` for paginated lists).
function unwrapList(response: any): { items: any[]; total: number } {
  const inner = response?.data;
  const items = Array.isArray(inner?.data) ? inner.data : [];
  return { items, total: Number(inner?.total ?? items.length) };
}

function unwrapItem(response: any): any {
  return response?.data?.data;
}

function normalizeCreator(seller: any): VideoCreator | null {
  if (!seller) return null;
  return {
    id: Number(seller.id),
    storeName: seller.storeName ?? 'Seller',
    storeLogo: seller.storeLogo ?? null,
    isVerified: Boolean(seller.isVerified),
    followersCount: Number(seller._count?.followers ?? seller.followersCount ?? 0),
  };
}

function normalizeProduct(raw: any): VideoProduct | null {
  if (!raw) return null;
  const images = Array.isArray(raw.images) ? raw.images : [];
  return {
    id: Number(raw.id),
    name: raw.name ?? 'Product',
    slug: raw.slug ?? String(raw.id),
    price: Number(raw.price ?? 0),
    comparePrice: raw.comparePrice != null ? Number(raw.comparePrice) : null,
    thumbnail: raw.thumbnail ?? images[0] ?? null,
    images,
    stock: Number(raw.stock ?? 0),
    seller: normalizeCreator(raw.seller),
  };
}

export function normalizeVideo(raw: any): Video {
  return {
    id: Number(raw.id),
    title: raw.title ?? 'Untitled video',
    description: raw.description ?? null,
    videoUrl: raw.videoUrl,
    thumbnailUrl: raw.thumbnailUrl ?? null,
    views: Number(raw.views ?? 0),
    likes: Number(raw.likes ?? 0),
    shares: Number(raw.shares ?? 0),
    commentsCount: Number(raw._count?.comments ?? raw.commentsCount ?? 0),
    savesCount: Number(raw._count?.savedBy ?? raw.savesCount ?? 0),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? raw.createdAt,
    product: normalizeProduct(raw.product),
    isLiked: Boolean(raw.isLiked),
    isSaved: Boolean(raw.isSaved),
    isFollowingCreator: Boolean(raw.isFollowingCreator),
    // Per-video moderation toggles set by the admin (Video Shop → video
    // detail panel) — default true so a video from an older API response
    // shape (before these existed) still behaves as fully-enabled rather
    // than silently hiding every action.
    allowComments: raw.allowComments ?? true,
    allowLikes: raw.allowLikes ?? true,
    allowSharing: raw.allowSharing ?? true,
    allowSave: raw.allowSave ?? true,
    enableShopping: raw.enableShopping ?? true,
  };
}

class VideoService {
  private static instance: VideoService;

  static getInstance(): VideoService {
    if (!VideoService.instance) {
      VideoService.instance = new VideoService();
    }
    return VideoService.instance;
  }

  async getFeed(filters: VideoFeedFilters & { page?: number } = {}): Promise<VideoListResult> {
    const { page = 1, limit = 6, filter, categoryId } = filters;
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filter) params.set('filter', filter);
    if (categoryId) params.set('categoryId', String(categoryId));

    const response = await api.get(`/videos/feed?${params}`);
    const { items, total } = unwrapList(response);
    return { items: items.map(normalizeVideo), total };
  }

  async getSaved(page = 1, limit = 12): Promise<VideoListResult> {
    const response = await api.get(`/videos/saved?page=${page}&limit=${limit}`);
    const { items, total } = unwrapList(response);
    return { items: items.map(normalizeVideo), total };
  }

  async getById(id: number): Promise<Video> {
    const response = await api.get(`/videos/${id}`);
    return normalizeVideo(unwrapItem(response));
  }

  async getRecommendations(id: number): Promise<Video[]> {
    const response = await api.get(`/videos/${id}/recommendations`);
    const { items } = unwrapList(response);
    return items.map(normalizeVideo);
  }

  async recordView(id: number): Promise<void> {
    await api.post(`/videos/${id}/view`);
  }

  async like(id: number): Promise<{ liked: boolean; likes: number }> {
    const response = await api.post(`/videos/${id}/like`);
    return unwrapItem(response) ?? { liked: true, likes: 0 };
  }

  async unlike(id: number): Promise<{ liked: boolean; likes: number }> {
    const response = await api.delete(`/videos/${id}/like`);
    return unwrapItem(response) ?? { liked: false, likes: 0 };
  }

  async save(id: number): Promise<{ saved: boolean; saves: number }> {
    const response = await api.post(`/videos/${id}/save`);
    return unwrapItem(response) ?? { saved: true, saves: 0 };
  }

  async unsave(id: number): Promise<{ saved: boolean; saves: number }> {
    const response = await api.delete(`/videos/${id}/save`);
    return unwrapItem(response) ?? { saved: false, saves: 0 };
  }

  async share(id: number): Promise<void> {
    await api.post(`/videos/${id}/share`);
  }
}

export const videoService = VideoService.getInstance();
