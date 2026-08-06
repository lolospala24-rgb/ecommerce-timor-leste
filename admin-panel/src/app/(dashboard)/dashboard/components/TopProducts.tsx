'use client';

import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RemoteImage } from '@/components/shared/RemoteImage';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';

interface TopProductsProps {
  products?: Array<{
    id: number;
    name: string;
    thumbnail: string | null;
    price: number;
    totalSold: number;
    totalRevenue: number;
    storeName: string;
  }>;
}

export function TopProducts({ products }: TopProductsProps) {
  if (!products || products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
          <CardDescription>Best selling products</CardDescription>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center">
          <p className="text-muted-foreground">No product data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Products</CardTitle>
        <CardDescription>Best selling products by revenue</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                  #{index + 1}
                </div>
                <div className="relative h-12 w-12 overflow-hidden rounded-md bg-gray-100">
                  <RemoteImage
                    src={product.thumbnail}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="font-medium">{product.name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>${product.price.toLocaleString()}</span>
                    <span>•</span>
                    <span>{product.storeName}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-600">
                  ${product.totalRevenue.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  {product.totalSold} units sold
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}