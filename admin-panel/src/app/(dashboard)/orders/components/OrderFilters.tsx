'use client';

import { useState } from 'react';
import { Search, X, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useSellers } from '@/hooks/useSellers';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';

interface OrderFiltersProps {
  filters: {
    page: number;
    limit: number;
    search: string;
    status: string;
    startDate: string;
    endDate: string;
    sellerId: number | undefined;
  };
  setFilters: (filters: any) => void;
}

export function OrderFilters({ filters, setFilters }: OrderFiltersProps) {
  const { data: sellers } = useSellers({ page: 1, limit: 100, isVerified: true });
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value, page: 1 });
  };

  const handleStatusChange = (value: string) => {
    setFilters({ ...filters, status: value === 'all' ? '' : value, page: 1 });
  };

  const handleSellerChange = (value: string) => {
    setFilters({ ...filters, sellerId: value === 'all' ? undefined : parseInt(value), page: 1 });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setFilters({
      ...filters,
      startDate: range?.from ? range.from.toISOString().split('T')[0] : '',
      endDate: range?.to ? range.to.toISOString().split('T')[0] : '',
      page: 1,
    });
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: filters.limit,
      search: '',
      status: '',
      startDate: '',
      endDate: '',
      sellerId: undefined,
    });
    setDateRange(undefined);
  };

  const hasActiveFilters = filters.search || filters.status || filters.sellerId || filters.startDate || filters.endDate;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order number, customer name, or email..."
            className="pl-9"
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="PROCESSING">Processing</SelectItem>
              <SelectItem value="SHIPPING">Shipping</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.sellerId?.toString() || 'all'} onValueChange={handleSellerChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Sellers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sellers</SelectItem>
              {sellers?.data?.map((seller: any) => (
                <SelectItem key={seller.id} value={seller.id.toString()}>
                  {seller.storeName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DateRangePicker
            date={dateRange}
            setDate={handleDateRangeChange}
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.search}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleSearch('')} />
            </Badge>
          )}
          {filters.status && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.status}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleStatusChange('all')} />
            </Badge>
          )}
          {filters.sellerId && (
            <Badge variant="secondary" className="gap-1">
              Seller: {sellers?.data?.find((s: any) => s.id === filters.sellerId)?.storeName}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleSellerChange('all')} />
            </Badge>
          )}
          {(filters.startDate || filters.endDate) && (
            <Badge variant="secondary" className="gap-1">
              Date: {filters.startDate} to {filters.endDate}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleDateRangeChange(undefined)} />
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}