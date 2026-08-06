// placeholder for src/modules/reviews/dto/review-response.dto.ts
export class ReviewResponseDto {
  id: number;
  productId: number;
  userId: number;
  rating: number;
  title: string | null;
  comment: string;
  images: string[];
  isApproved: boolean;
  helpfulCount: number;
  sellerReply: string | null;
  sellerReplyAt: Date | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  user?: {
    id: number;
    name: string;
  };
  product?: {
    id: number;
    name: string;
    thumbnail: string | null;
  };
}