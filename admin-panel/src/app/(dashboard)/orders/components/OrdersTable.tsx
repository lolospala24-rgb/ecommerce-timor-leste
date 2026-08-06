'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Truck, DollarSign, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { UpdateOrderStatus } from './UpdateOrderStatus';

interface OrdersTableProps {
  orders: any[];
  onViewOrder: (orderId: number) => void;
  onRefresh: () => void;
}

export function OrdersTable({ orders, onViewOrder, onRefresh }: OrdersTableProps) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-500',
      PAID: 'bg-blue-500',
      PROCESSING: 'bg-purple-500',
      SHIPPING: 'bg-indigo-500',
      DELIVERED: 'bg-green-500',
      CANCELLED: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Pending',
      PAID: 'Paid',
      PROCESSING: 'Processing',
      SHIPPING: 'Shipping',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
    };
    return labels[status] || status;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order #</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Seller</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-8">
              No orders found
            </TableCell>
          </TableRow>
        ) : (
          orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-mono text-sm">
                {order.orderNumber}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{order.customer?.name || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.customer?.email || 'N/A'}
                  </p>
                </div>
              </TableCell>
              <TableCell>{order.seller?.storeName || 'N/A'}</TableCell>
              <TableCell className="font-medium">
                ${order.total.toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(order.status)}>
                  {getStatusLabel(order.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Bank Transfer'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {new Date(order.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onViewOrder(order.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/orders/${order.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Full Page
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <UpdateOrderStatus
                        orderId={order.id}
                        currentStatus={order.status}
                        onUpdate={onRefresh}
                        trigger={
                          <Button variant="ghost" className="w-full justify-start p-0 h-auto font-normal">
                            <Truck className="mr-2 h-4 w-4" />
                            Update Status
                          </Button>
                        }
                      />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}