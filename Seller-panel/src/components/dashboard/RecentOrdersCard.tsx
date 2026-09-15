'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { useSellerDashboard } from '@/hooks/useDashboard';
import { OrderStatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList } from 'lucide-react';
import type { OrderStatus } from '@/types/order.types';

export function RecentOrdersCard() {
  const { data, isLoading } = useSellerDashboard();

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium">Recent Orders</h3>
        <Link href="/orders" className="text-sm text-primary hover:underline">
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data?.recentOrders?.length ? (
        <EmptyState icon={ClipboardList} title="No orders yet" description="Orders placed on your products will show up here." />
      ) : (
        <div className="divide-y">
          {data.recentOrders.slice(0, 6).map((order) => {
            const firstItem = order.items[0];
            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-accent/40 -mx-2 px-2 rounded-md transition-colors"
              >
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                  {firstItem?.product?.thumbnail && (
                    <Image
                      src={firstItem.product.thumbnail}
                      alt={firstItem.product.name}
                      width={40}
                      height={40}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{order.orderNumber}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {order.customer.name} · {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="text-sm font-medium tabular-nums">${order.total.toFixed(2)}</p>
                  <OrderStatusBadge status={order.status as OrderStatus} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
