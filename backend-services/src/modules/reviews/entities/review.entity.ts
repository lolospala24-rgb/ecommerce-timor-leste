// placeholder for src/modules/reviews/entities/review.entity.ts
import { Review } from '@prisma/client';

export class ReviewEntity implements Review {
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

  constructor(partial: Partial<ReviewEntity>) {
    Object.assign(this, partial);
  }

  // Get rating stars as array (for rendering)
  getRatingStars(): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1).map(star => 
      star <= this.rating ? 1 : (star - 0.5 <= this.rating ? 0.5 : 0)
    );
  }

  // Get rating percentage
  getRatingPercentage(): number {
    return (this.rating / 5) * 100;
  }

  // Get formatted date
  getFormattedDate(): string {
    return this.createdAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // Get relative time (e.g., "2 days ago")
  getRelativeTime(): string {
    const now = new Date();
    const diff = now.getTime() - this.createdAt.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  }

  // Check if review has images
  hasImages(): boolean {
    return this.images && this.images.length > 0;
  }

  // Check if review has seller reply
  hasSellerReply(): boolean {
    return !!this.sellerReply;
  }

  // Check if review is approved
  isApprovedReview(): boolean {
    return this.isApproved;
  }

  // Get short comment (truncated)
  getShortComment(length: number = 100): string {
    if (this.comment.length <= length) return this.comment;
    return this.comment.substring(0, length) + '...';
  }

  // Get initials from user name (would need user data)
  getUserInitials(userName?: string): string {
    if (!userName) return 'U';
    return userName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  // Get verification badge (if user is verified buyer)
  isVerifiedPurchase(hasPurchased: boolean): boolean {
    return hasPurchased;
  }
}