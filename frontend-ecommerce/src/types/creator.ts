import { Product } from './product.types';
import { Video } from './video';

export interface Creator {
  id: string;
  userId: string;
  name: string;
  username: string;
  avatar: string;
  coverImage?: string;
  bio: string;
  followers: number;
  following: number;
  likes: number;
  views: number;
  isVerified: boolean;
  isFollowed: boolean;
  storeName?: string;
  storeUrl?: string;
  storeLogo?: string;
  banner?: string;
  products?: Product[];
  videos?: Video[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatorStats {
  followers: number;
  following: number;
  likes: number;
  views: number;
  products: number;
  videos: number;
  responseRate?: number;
  responseTime?: string;
  totalReviews?: number;
  averageRating?: number;
  totalRevenue?: number;
  totalOrders?: number;
}

export interface CreatorsResponse {
  data: Creator[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreatorFilters {
  page?: number;
  limit?: number;
  search?: string;
  isVerified?: boolean;
  category?: string;
  minFollowers?: number;
  maxFollowers?: number;
  sortBy?: 'followers' | 'likes' | 'products' | 'videos' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreatorFollowResponse {
  isFollowed: boolean;
  followers: number;
}