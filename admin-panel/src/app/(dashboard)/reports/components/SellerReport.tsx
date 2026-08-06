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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRange } from 'react-day-picker';
import api from '@/lib/api';
import { ChevronUp, ChevronDown, Star, TrendingUp } from 'lucide-react';

interface SellerReportProps {
  dateRange: DateRange | undefined;
}

export function SellerReport({ dateRange }: SellerReportProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [sellers, setSellers] = useState([]);
  const [sortField, setSortField] = useState('revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchSellerData();
  }, [dateRange]);

  const fetchSellerData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange?.from ? dateRange.from.toISOString().split('T')[0] : '',
        endDate: dateRange?.to ? dateRange.to.toISOString().split('T')[0] : '',
      });

      const response = await api.get(`/reports/sellers?${params}`);
      setSellers(response.data);
    } catch (error) {
      console.error('Failed to fetch seller data:', error);
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

  const sortedSellers = [...sellers].sort((a: any, b: any) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (sortField === 'storeName') {
      aVal = aVal?.toLowerCase() || '';
      bVal = bVal?.toLowerCase() || '';
    }
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (sellers.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">No seller data available for the selected period</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seller Performance</CardTitle>
        <CardDescription>
          Revenue, orders, and ratings by seller
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort('storeName')}>
                  Seller <SortIcon field="storeName" />
                </TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => handleSort('revenue')}>
                  Revenue <SortIcon field="revenue" />
                </TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => handleSort('orders')}>
                  Orders <SortIcon field="orders" />
                </TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => handleSort('averageOrderValue')}>
                  Avg Order <SortIcon field="averageOrderValue" />
                </TableHead>
                <TableHead className="cursor-pointer text-center" onClick={() => handleSort('rating')}>
                  Rating <SortIcon field="rating" />
                </TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Growth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSellers.map((seller: any) => (
                <TableRow key={seller.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(seller.storeName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{seller.storeName}</p>
                        <p className="text-xs text-muted-foreground">
                          {seller.ownerName}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${seller.revenue?.toLocaleString() || '0'}
                  </TableCell>
                  <TableCell className="text-right">
                    {seller.orders?.toLocaleString() || '0'}
                  </TableCell>
                  <TableCell className="text-right">
                    ${seller.averageOrderValue?.toLocaleString() || '0'}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{seller.rating?.toFixed(1) || '0'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={seller.isVerified ? 'default' : 'secondary'}>
                      {seller.isVerified ? 'Verified' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {seller.growth !== undefined && (
                      <span className={seller.growth >= 0 ? 'text-green-600' : 'text-red-600'}>
                        <TrendingUp className="inline h-3 w-3 mr-1" />
                        {seller.growth >= 0 ? '+' : ''}{seller.growth}%
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}