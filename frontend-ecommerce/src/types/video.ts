import { Product } from './product.types';

export interface Creator {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isVerified: boolean;
  followers: number;
  following?: number;
  bio?: string;
  storeName?: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  createdAt: string;
  updatedAt?: string;
  creator: Creator;
  tags: string[];
  products?: Product[];
  isLiked?: boolean;
  isSaved?: boolean;
  category?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isActive?: boolean;
}

export interface VideoResponse {
  data: Video[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface VideoFilters {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  creatorId?: string;
  status?: string;
  isActive?: boolean;
  sortBy?: 'createdAt' | 'views' | 'likes' | 'duration';
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
}

export interface VideoStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  averageDuration: number;
}

export interface VideoInteraction {
  videoId: string;
  isLiked: boolean;
  isSaved: boolean;
  viewCount: number;
  lastViewedAt: string;
  progress: number;
}

export interface VideoShareData {
  videoId: string;
  platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'whatsapp' | 'telegram' | 'copy';
  url: string;
}