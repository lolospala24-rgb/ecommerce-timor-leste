export class VideoResponseDto {
  id: number;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  productId?: number;
  views: number;
  likes: number;
  shares: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
