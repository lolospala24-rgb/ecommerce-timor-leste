export type NotificationCategory =
  | 'ORDER'
  | 'PAYMENT'
  | 'SHIPPING'
  | 'SELLER'
  | 'PRODUCT'
  | 'CUSTOMER'
  | 'SYSTEM'
  | 'SECURITY';

export type NotificationPriority = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';

export interface AppNotification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  entityType: string | null;
  entityId: number | null;
  actorId: number | null;
  isRead: boolean;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SellerReview {
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
  sellerReplyAt: string | null;
  createdAt: string;
  user: { id: number; name: string };
  product: { id: number; name: string; thumbnail: string | null };
}
