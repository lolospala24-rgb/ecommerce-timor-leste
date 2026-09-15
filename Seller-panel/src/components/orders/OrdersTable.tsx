'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OrderStatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ClipboardList } from 'lucide-react';
import type { SellerOrder } from '@/types/order.types';

export function OrdersTable({ orders }: { orders: SellerOrder[] }) {
  if (orders.length === 0) {
    return <EmptyState icon={ClipboardList} title="No orders here" description="Orders matching this filter will show up here." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Items</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id} className="cursor-pointer">
            <TableCell>
              <Link href={`/orders/${order.id}`} className="font-medium">
                {order.orderNumber}
              </Link>
            </TableCell>
            <TableCell>
              <Link href={`/orders/${order.id}`} className="block">
                <p className="text-sm">{order.customer.name}</p>
                <p className="text-xs text-muted-foreground">{order.customer.phone}</p>
              </Link>
            </TableCell>
            <TableCell>
              <Link href={`/orders/${order.id}`} className="block text-sm text-muted-foreground">
                {order.items.length} item{order.items.length === 1 ? '' : 's'}
              </Link>
            </TableCell>
            <TableCell>
              <Link href={`/orders/${order.id}`} className="block text-sm font-medium tabular-nums">
                ${order.total.toFixed(2)}
              </Link>
            </TableCell>
            <TableCell>
              <Link href={`/orders/${order.id}`} className="block text-sm text-muted-foreground">
                {order.paymentMethod === 'COD' ? 'Cash on delivery' : 'Bank transfer'}
              </Link>
            </TableCell>
            <TableCell>
              <Link href={`/orders/${order.id}`} className="block">
                <OrderStatusBadge status={order.status} />
              </Link>
            </TableCell>
            <TableCell>
              <Link href={`/orders/${order.id}`} className="block text-sm text-muted-foreground">
                {format(new Date(order.createdAt), 'MMM d, yyyy')}
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
