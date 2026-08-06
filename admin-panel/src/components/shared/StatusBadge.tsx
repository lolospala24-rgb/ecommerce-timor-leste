'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Truck,
  CreditCard,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  type: 'order' | 'payment' | 'user' | 'product' | 'seller';
  className?: string;
  showIcon?: boolean;
}

const orderStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-500', icon: Clock },
  PAID: { label: 'Paid', color: 'bg-blue-500', icon: CreditCard },
  PROCESSING: { label: 'Processing', color: 'bg-purple-500', icon: RefreshCw },
  SHIPPING: { label: 'Shipping', color: 'bg-indigo-500', icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'bg-green-500', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-500', icon: XCircle },
};

const paymentStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-500', icon: Clock },
  PAID: { label: 'Paid', color: 'bg-green-500', icon: CheckCircle },
  FAILED: { label: 'Failed', color: 'bg-red-500', icon: XCircle },
  REFUNDED: { label: 'Refunded', color: 'bg-orange-500', icon: RefreshCw },
};

const userStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ACTIVE: { label: 'Active', color: 'bg-green-500', icon: CheckCircle },
  INACTIVE: { label: 'Inactive', color: 'bg-red-500', icon: XCircle },
  PENDING: { label: 'Pending', color: 'bg-yellow-500', icon: Clock },
};

const productStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ACTIVE: { label: 'Active', color: 'bg-green-500', icon: CheckCircle },
  INACTIVE: { label: 'Inactive', color: 'bg-gray-500', icon: XCircle },
  OUT_OF_STOCK: { label: 'Out of Stock', color: 'bg-red-500', icon: AlertCircle },
  LOW_STOCK: { label: 'Low Stock', color: 'bg-yellow-500', icon: AlertCircle },
};

const sellerStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  VERIFIED: { label: 'Verified', color: 'bg-green-500', icon: CheckCircle },
  PENDING: { label: 'Pending', color: 'bg-yellow-500', icon: Clock },
  REJECTED: { label: 'Rejected', color: 'bg-red-500', icon: XCircle },
};

const getConfig = (type: string, status: string) => {
  switch (type) {
    case 'order':
      return orderStatusConfig[status] || { label: status, color: 'bg-gray-500', icon: Package };
    case 'payment':
      return paymentStatusConfig[status] || { label: status, color: 'bg-gray-500', icon: CreditCard };
    case 'user':
      return userStatusConfig[status] || { label: status, color: 'bg-gray-500', icon: Package };
    case 'product':
      return productStatusConfig[status] || { label: status, color: 'bg-gray-500', icon: Package };
    case 'seller':
      return sellerStatusConfig[status] || { label: status, color: 'bg-gray-500', icon: Store };
    default:
      return { label: status, color: 'bg-gray-500', icon: Package };
  }
};

// Import Store icon
import { Store } from 'lucide-react';

export function StatusBadge({ status, type, className, showIcon = true }: StatusBadgeProps) {
  const config = getConfig(type, status);
  const Icon = config.icon;

  return (
    <Badge className={cn('flex items-center gap-1', config.color, className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}

// Individual status badges for convenience
export function OrderStatusBadge({ status, ...props }: Omit<StatusBadgeProps, 'type'>) {
  return <StatusBadge type="order" status={status} {...props} />;
}

export function PaymentStatusBadge({ status, ...props }: Omit<StatusBadgeProps, 'type'>) {
  return <StatusBadge type="payment" status={status} {...props} />;
}

export function UserStatusBadge({ status, ...props }: Omit<StatusBadgeProps, 'type'>) {
  return <StatusBadge type="user" status={status} {...props} />;
}

export function ProductStatusBadge({ status, ...props }: Omit<StatusBadgeProps, 'type'>) {
  return <StatusBadge type="product" status={status} {...props} />;
}

export function SellerStatusBadge({ status, ...props }: Omit<StatusBadgeProps, 'type'>) {
  return <StatusBadge type="seller" status={status} {...props} />;
}