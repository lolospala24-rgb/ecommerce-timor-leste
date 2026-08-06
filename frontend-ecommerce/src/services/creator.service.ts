import api from '@/lib/api';
import { Creator, CreatorStats } from '@/types/creator';
import { Video } from '@/types/video';
import { Product } from '@/types/product.types';


export class CreatorService {
  private static instance: CreatorService;
  private constructor() {}

  static getInstance(): CreatorService {
    if (!CreatorService.instance) {
      CreatorService.instance = new CreatorService();
    }
    return CreatorService.instance;
  }

  async getCreatorById(id: string): Promise<Creator> {
    const response = await api.get<Creator>(`/creators/${id}`);
    return response.data;
  }

  async getCreatorVideos(id: string, page: number = 1): Promise<Video[]> {
    const response = await api.get<Video[]>(`/creators/${id}/videos?page=${page}`);
    return response.data;
  }

  async getCreatorProducts(id: string): Promise<Product[]> {
    const response = await api.get<Product[]>(`/creators/${id}/products`);
    return response.data;
  }

  async getCreatorStats(id: string): Promise<CreatorStats> {
    const response = await api.get<CreatorStats>(`/creators/${id}/stats`);
    return response.data;
  }

  async followCreator(id: string): Promise<{ isFollowed: boolean; followers: number }> {
    const response = await api.post<{ isFollowed: boolean; followers: number }>(`/creators/${id}/follow`);
    return response.data;
  }

  async unfollowCreator(id: string): Promise<{ isFollowed: boolean; followers: number }> {
    const response = await api.delete<{ isFollowed: boolean; followers: number }>(`/creators/${id}/follow`);
    return response.data;
  }
}

export const creatorService = CreatorService.getInstance();