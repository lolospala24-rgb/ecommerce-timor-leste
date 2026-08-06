'use client';

import { Search, Filter, X } from 'lucide-react';
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

interface UserFiltersProps {
  filters: {
    page: number;
    limit: number;
    search: string;
    role: string;
    isActive: boolean | undefined;
  };
  setFilters: (filters: any) => void;
}

export function UserFilters({ filters, setFilters }: UserFiltersProps) {
  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value, page: 1 });
  };

  const handleRoleChange = (value: string) => {
    setFilters({ ...filters, role: value === 'all' ? '' : value, page: 1 });
  };

  const handleStatusChange = (value: string) => {
    setFilters({
      ...filters,
      isActive: value === 'all' ? undefined : value === 'active',
      page: 1,
    });
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: filters.limit,
      search: '',
      role: '',
      isActive: undefined,
    });
  };

  const hasActiveFilters = filters.search || filters.role || filters.isActive !== undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            className="pl-9"
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={filters.role || 'all'} onValueChange={handleRoleChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="SELLER">Seller</SelectItem>
              <SelectItem value="CUSTOMER">Customer</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={
              filters.isActive === undefined
                ? 'all'
                : filters.isActive
                ? 'active'
                : 'blocked'
            }
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.search}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleSearch('')}
              />
            </Badge>
          )}
          {filters.role && (
            <Badge variant="secondary" className="gap-1">
              Role: {filters.role}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleRoleChange('all')}
              />
            </Badge>
          )}
          {filters.isActive !== undefined && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.isActive ? 'Active' : 'Blocked'}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleStatusChange('all')}
              />
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