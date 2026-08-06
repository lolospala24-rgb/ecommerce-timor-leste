'use client';

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
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { useState } from 'react';

interface PaymentFiltersProps {
  filters: {
    page: number;
    limit: number;
    search: string;
    status: string;
    method: string;
    startDate: string;
    endDate: string;
  };
  setFilters: (filters: any) => void;
}

export function PaymentFilters({ filters, setFilters }: PaymentFiltersProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value, page: 1 });
  };

  const handleStatusChange = (value: string) => {
    setFilters({ ...filters, status: value === 'all' ? '' : value, page: 1 });
  };

  const handleMethodChange = (value: string) => {
    setFilters({ ...filters, method: value === 'all' ? '' : value, page: 1 });
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
      method: '',
      startDate: '',
      endDate: '',
    });
    setDateRange(undefined);
  };

  const hasActiveFilters = filters.search || filters.status || filters.method || filters.startDate || filters.endDate;

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
        <div className="flex gap-2 flex-wrap">
          <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.method || 'all'} onValueChange={handleMethodChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="COD">Cash on Delivery</SelectItem>
              <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
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
          {filters.method && (
            <Badge variant="secondary" className="gap-1">
              Method: {filters.method === 'COD' ? 'Cash on Delivery' : 'Bank Transfer'}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleMethodChange('all')} />
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