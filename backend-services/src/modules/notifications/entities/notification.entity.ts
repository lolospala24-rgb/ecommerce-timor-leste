// placeholder for src/modules/notifications/entities/notification.entity.ts
import { Notification } from '@prisma/client';

export class NotificationEntity implements Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  data: any | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<NotificationEntity>) {
    Object.assign(this, partial);
  }

  // Get type label for display
  getTypeLabel(): string {
    const labels: Record<string, string> = {
      ORDER: 'Order Update',
      PAYMENT: 'Payment',
      SYSTEM: 'System',
      PROMO: 'Promotion',
      REVIEW: 'Review',
    };
    return labels[this.type] || this.type;
  }

  // Get type color for UI
  getTypeColor(): string {
    const colors: Record<string, string> = {
      ORDER: 'blue',
      PAYMENT: 'green',
      SYSTEM: 'purple',
      PROMO: 'orange',
      REVIEW: 'pink',
    };
    return colors[this.type] || 'gray';
  }

  // Get type icon name
  getTypeIcon(): string {
    const icons: Record<string, string> = {
      ORDER: 'package',
      PAYMENT: 'credit-card',
      SYSTEM: 'settings',
      PROMO: 'gift',
      REVIEW: 'star',
    };
    return icons[this.type] || 'bell';
  }

  // Get formatted relative time
  getRelativeTime(): string {
    const now = new Date();
    const diffMs = now.getTime() - this.createdAt.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) === 1 ? '' : 's'} ago`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) === 1 ? '' : 's'} ago`;
  }

  // Get formatted date
  getFormattedDate(): string {
    return this.createdAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Get short message (truncated)
  getShortMessage(length: number = 80): string {
    if (this.message.length <= length) return this.message;
    return this.message.substring(0, length) + '...';
  }

  // Check if notification is read
  isReadNotification(): boolean {
    return this.isRead;
  }

  // Check if notification has data payload
  hasData(): boolean {
    return this.data !== null && Object.keys(this.data || {}).length > 0;
  }

  // Get data value by key
  getDataValue(key: string): any {
    return this.data?.[key] || null;
  }

  // Get notification link based on type
  getLink(): string | null {
    const links: Record<string, string | null> = {
      ORDER: this.getDataValue('orderId') ? `/orders/${this.getDataValue('orderId')}` : null,
      PAYMENT: this.getDataValue('orderId') ? `/orders/${this.getDataValue('orderId')}` : null,
      PRODUCT: this.getDataValue('productId') ? `/products/${this.getDataValue('productId')}` : null,
      REVIEW: this.getDataValue('productId') ? `/products/${this.getDataValue('productId')}#reviews` : null,
    };
    return links[this.type] || null;
  }

  // Check if notification is a promotion
  isPromotion(): boolean {
    return this.type === 'PROMO';
  }

  // Check if notification is order related
  isOrderRelated(): boolean {
    return this.type === 'ORDER';
  }

  // Check if notification is payment related
  isPaymentRelated(): boolean {
    return this.type === 'PAYMENT';
  }
}