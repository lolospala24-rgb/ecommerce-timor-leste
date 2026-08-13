// Shared formatting/routing rules for admin notifications — one place so
// the bell dropdown and the /notifications page render identically instead
// of drifting into two slightly different notification UIs.

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

export interface AdminNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  entityType?: string | null;
  entityId?: number | null;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, any> | null;
}

// Mirrors the event names NotificationsService actually creates
// (notifications.constants.ts on the backend) — only these fire a sound,
// so routine/informational events (status changed, profile updated, ...)
// don't compete for the admin's attention the way a new order or an
// uploaded receipt should.
const SOUND_EVENT_TYPES = new Set([
  'ORDER_CREATED',
  'PAYMENT_RECEIPT_UPLOADED',
  'REFUND_REQUESTED',
  'SELLER_REGISTERED',
]);

export function shouldPlaySound(n: Pick<AdminNotification, 'type' | 'priority'>): boolean {
  if (n.priority === 'CRITICAL') return true;
  return SOUND_EVENT_TYPES.has(n.type);
}

export const PRIORITY_DOT_COLOR: Record<NotificationPriority, string> = {
  INFO: 'bg-blue-500',
  SUCCESS: 'bg-green-500',
  WARNING: 'bg-amber-500',
  CRITICAL: 'bg-red-500',
};

export const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  ORDER: 'Order',
  PAYMENT: 'Payment',
  SHIPPING: 'Shipping',
  SELLER: 'Seller',
  PRODUCT: 'Product',
  CUSTOMER: 'Customer',
  SYSTEM: 'System',
  SECURITY: 'Security',
};

// Click-through target for a notification — the entity it's about, not the
// notification row itself. Falls back to null (render as non-clickable)
// when there isn't enough information to route anywhere.
export function notificationHref(n: AdminNotification): string | null {
  const entityId = n.entityId ?? n.data?.orderId ?? n.data?.productId ?? n.data?.sellerId ?? null;
  const entityType = n.entityType ?? n.category ?? null;

  if (!entityType) return null;

  switch (entityType) {
    case 'ORDER':
    case 'SHIPPING': {
      const orderId = n.entityType === 'ORDER' ? entityId : n.data?.orderId ?? entityId;
      return orderId ? `/orders/${orderId}` : null;
    }
    case 'PAYMENT': {
      const paymentId = n.entityType === 'PAYMENT' ? entityId : null;
      const orderId = n.data?.orderId;
      if (paymentId) return `/payments?paymentId=${paymentId}`;
      if (orderId) return `/orders/${orderId}`;
      return null;
    }
    case 'SELLER':
      return entityId ? `/sellers/${entityId}` : null;
    case 'PRODUCT':
      return entityId ? `/products/${entityId}` : null;
    default:
      return null;
  }
}

export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}
