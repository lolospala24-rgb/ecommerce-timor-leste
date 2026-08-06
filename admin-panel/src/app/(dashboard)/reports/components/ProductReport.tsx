'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRange } from 'react-day-picker';
import api from '@/lib/api';
import { ChevronUp, ChevronDown, Star, TrendingUp, Package } from 'lucide-react';
import Image from 'next/image';
import { RemoteImage } from '@/components/shared/RemoteImage';

interface ProductReportProps {
  dateRange: DateRange | undefined;
}

export function ProductReport({ dateRange }: ProductReportProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [topProducts, setTopProducts] = useState([]);
  const [bottomProducts, setBottomProducts] = useState([]);
  const [sortField, setSortField] = useState('revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchProductData();
  }, [dateRange]);

  const fetchProductData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange?.from ? dateRange.from.toISOString().split('T')[0] : '',
        endDate: dateRange?.to ? dateRange.to.toISOString().split('T')[0] : '',
      });

      const response = await api.get(`/reports/products?${params}`);
      setTopProducts(response.data.topProducts || []);
      setBottomProducts(response.data.bottomProducts || []);
    } catch (error) {
      console.error('Failed to fetch product data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedProducts = [...topProducts].sort((a: any, b: any) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="inline h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="inline h-4 w-4 ml-1" />
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Products</CardTitle>
          <CardDescription>
            Best selling products by revenue and units sold
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead className="cursor-pointer text-right" onClick={() => handleSort('revenue')}>
                    Revenue <SortIcon field="revenue" />
                  </TableHead>
                  <TableHead className="cursor-pointer text-right" onClick={() => handleSort('unitsSold')}>
                    Units Sold <SortIcon field="unitsSold" />
                  </TableHead>
                  <TableHead className="cursor-pointer text-right" onClick={() => handleSort('price')}>
                    Price <SortIcon field="price" />
                  </TableHead>
                  <TableHead className="cursor-pointer text-center" onClick={() => handleSort('rating')}>
                    Rating <SortIcon field="rating" />
                  </TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No product data available
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedProducts.map((product: any, index: number) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                            {product.thumbnail ? (
                              <Image
                                src={product.thumbnail}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Package className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Rank #{index + 1}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{product.storeName}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${product.revenue?.toLocaleString() || '0'}
                      </TableCell>
                      <TableCell className="text-right">
                        {product.unitsSold?.toLocaleString() || '0'}
                      </TableCell>
                      <TableCell className="text-right">
                        ${product.price?.toLocaleString() || '0'}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{product.rating?.toFixed(1) || '0'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={product.stock > 0 ? 'default' : 'destructive'}>
                          {product.stock > 0 ? `${product.stock} left` : 'Out of Stock'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Products (Optional) */}
      {bottomProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Products Needing Attention</CardTitle>
            <CardDescription>
              Low performing or out of stock products
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead className="text-right">Units Sold</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center">Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bottomProducts.map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                            {product.thumbnail ? (
                              <Image
                                src={product.thumbnail}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Package className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <span className="font-medium">{product.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{product.storeName}</TableCell>
                      <TableCell className="text-right">
                        {product.unitsSold?.toLocaleString() || '0'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={product.stock > 0 ? 'warning' : 'destructive'}>
                          {product.stock > 0 ? `${product.stock} left` : 'Out of Stock'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{product.rating?.toFixed(1) || '0'}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}