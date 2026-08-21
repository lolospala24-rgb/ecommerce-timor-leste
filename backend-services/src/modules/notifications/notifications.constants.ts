import { NotificationCategory, NotificationPriority } from '@prisma/client';

// Matches the admin panel's existing "Low Stock" bucket (products list /
// dashboard both already filter `stock > 0 && stock < 10`) — reused here so
// the notification and the UI agree on what "low" means.
export const LOW_STOCK_THRESHOLD = 10;

// Closed set of specific event names this system actually creates.
// `Notification.type` stores one of these; `Notification.category` is the
// coarser grouping derived from NOTIFICATION_DEFAULTS below. Keeping this
// as a single enum (rather than scattering literal strings across
// orders/payments/sellers services) is what makes the event matrix in the
// audit report an actual, checkable source of truth instead of prose.
export enum NotificationEvent {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED',
  PAYMENT_RECEIPT_UPLOADED = 'PAYMENT_RECEIPT_UPLOADED',
  PAYMENT_APPROVED = 'PAYMENT_APPROVED',
  PAYMENT_REJECTED = 'PAYMENT_REJECTED',
  REFUND_REQUESTED = 'REFUND_REQUESTED',
  REFUND_APPROVED = 'REFUND_APPROVED',
  REFUND_REJECTED = 'REFUND_REJECTED',
  SELLER_REGISTERED = 'SELLER_REGISTERED',
  SELLER_APPROVED = 'SELLER_APPROVED',
  SELLER_REJECTED = 'SELLER_REJECTED',
  PRODUCT_LOW_STOCK = 'PRODUCT_LOW_STOCK',
  PRODUCT_OUT_OF_STOCK = 'PRODUCT_OUT_OF_STOCK',
  PRODUCT_BACK_IN_STOCK = 'PRODUCT_BACK_IN_STOCK',
  REVIEW_CREATED = 'REVIEW_CREATED',
  PROMO = 'PROMO',
  SYSTEM = 'SYSTEM',
}

// Default category + priority per event — call sites can still override
// either explicitly, but in the normal case they just pass the event name
// and get a consistent classification for free.
export const NOTIFICATION_DEFAULTS: Record<
  NotificationEvent,
  { category: NotificationCategory; priority: NotificationPriority }
> = {
  [NotificationEvent.ORDER_CREATED]: { category: 'ORDER', priority: 'INFO' },
  [NotificationEvent.ORDER_STATUS_CHANGED]: { category: 'ORDER', priority: 'INFO' },
  [NotificationEvent.PAYMENT_RECEIPT_UPLOADED]: { category: 'PAYMENT', priority: 'CRITICAL' },
  [NotificationEvent.PAYMENT_APPROVED]: { category: 'PAYMENT', priority: 'SUCCESS' },
  [NotificationEvent.PAYMENT_REJECTED]: { category: 'PAYMENT', priority: 'WARNING' },
  [NotificationEvent.REFUND_REQUESTED]: { category: 'PAYMENT', priority: 'WARNING' },
  [NotificationEvent.REFUND_APPROVED]: { category: 'PAYMENT', priority: 'INFO' },
  [NotificationEvent.REFUND_REJECTED]: { category: 'PAYMENT', priority: 'INFO' },
  [NotificationEvent.SELLER_REGISTERED]: { category: 'SELLER', priority: 'INFO' },
  [NotificationEvent.SELLER_APPROVED]: { category: 'SELLER', priority: 'SUCCESS' },
  [NotificationEvent.SELLER_REJECTED]: { category: 'SELLER', priority: 'WARNING' },
  [NotificationEvent.PRODUCT_LOW_STOCK]: { category: 'PRODUCT', priority: 'WARNING' },
  [NotificationEvent.PRODUCT_OUT_OF_STOCK]: { category: 'PRODUCT', priority: 'WARNING' },
  [NotificationEvent.PRODUCT_BACK_IN_STOCK]: { category: 'PRODUCT', priority: 'SUCCESS' },
  [NotificationEvent.REVIEW_CREATED]: { category: 'CUSTOMER', priority: 'INFO' },
  [NotificationEvent.PROMO]: { category: 'SYSTEM', priority: 'INFO' },
  [NotificationEvent.SYSTEM]: { category: 'SYSTEM', priority: 'INFO' },
};
