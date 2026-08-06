'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Package } from 'lucide-react';

interface RecentOrdersProps {
  orders?: Array<{
    id: number;
    orderNumber: string;
    customer: { name: string; email: string };
    seller: { storeName: string };
    total: number;
    status: string;
    createdAt: string;
  }>;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  PAID: 'bg-blue-500',
  PROCESSING: 'bg-purple-500',
  SHIPPING: 'bg-indigo-500',
  DELIVERED: 'bg-green-500',
  CANCELLED: 'bg-red-500',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPING: 'Shipping',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export function RecentOrders({ orders = [] }: RecentOrdersProps) {
  const safeOrders = Array.isArray(orders) ? orders : [];

  if (safeOrders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest customer orders</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No recent orders</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
        <CardDescription>Latest customer orders across all stores</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium">Order #</th>
                <th className="text-left py-3 px-2 font-medium">Customer</th>
                <th className="text-left py-3 px-2 font-medium">Store</th>
                <th className="text-right py-3 px-2 font-medium">Amount</th>
                <th className="text-center py-3 px-2 font-medium">Status</th>
                <th className="text-right py-3 px-2 font-medium">Date</th>
                <th className="text-center py-3 px-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {safeOrders.slice(0, 5).map((order) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 px-2 font-mono text-sm">
                    {order.orderNumber || 'N/A'}
                  </td>
                  <td className="py-3 px-2">{order.customer?.name || 'N/A'}</td>
                  <td className="py-3 px-2 text-sm text-muted-foreground">
                    {order.seller?.storeName || 'N/A'}
                  </td>
                  <td className="py-3 px-2 text-right font-medium">
                    ${(order.total || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <Badge className={statusColors[order.status] || 'bg-gray-500'}>
                      {statusLabels[order.status] || order.status || 'Unknown'}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 text-right text-sm text-muted-foreground">
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <Link href={`/orders/${order.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}