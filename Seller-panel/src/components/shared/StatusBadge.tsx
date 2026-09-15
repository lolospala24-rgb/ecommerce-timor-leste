import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OrderStatus, ShippingStatus } from '@/types/order.types';
import type { PayoutStatus } from '@/types/finance.types';

const ORDER_STYLES: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400',
  PAID: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400',
  PROCESSING: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-400',
  SHIPPING: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-400',
  DELIVERED: 'bg-success/15 text-success',
  CANCELLED: 'bg-destructive/10 text-destructive',
};

const ORDER_LABELS: Record<OrderStatus, string> = {
  PENDING: 'New',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPING: 'Shipped',
  DELIVERED: 'Completed',
  CANCELLED: 'Cancelled',
};

const SHIPPING_STYLES: Record<ShippingStatus, string> = {
  PENDING: 'bg-muted text-muted-foreground',
  BOOKED: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400',
  IN_TRANSIT: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-400',
  DELIVERED: 'bg-success/15 text-success',
  FAILED: 'bg-destructive/10 text-destructive',
};

const PAYOUT_STYLES: Record<PayoutStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400',
  APPROVED: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400',
  REJECTED: 'bg-destructive/10 text-destructive',
  PAID: 'bg-success/15 text-success',
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return <Badge className={cn('border-0 font-medium', ORDER_STYLES[status], className)}>{ORDER_LABELS[status]}</Badge>;
}

export function ShippingStatusBadge({ status, className }: { status: ShippingStatus; className?: string }) {
  return <Badge className={cn('border-0 font-medium', SHIPPING_STYLES[status], className)}>{status.replace('_', ' ')}</Badge>;
}

export function PayoutStatusBadge({ status, className }: { status: PayoutStatus; className?: string }) {
  return <Badge className={cn('border-0 font-medium', PAYOUT_STYLES[status], className)}>{status}</Badge>;
}
