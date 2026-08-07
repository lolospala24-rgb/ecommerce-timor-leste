'use client';

import { Search, X } from 'lucide-react';
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
import { useCategories } from '@/hooks/useCategories';
import { useSellers } from '@/hooks/useSellers';

interface ProductFiltersState {
  page: number;
  limit: number;
  search: string;
  categoryId: number | undefined;
  sellerId: number | undefined;
  status: 'all' | 'active' | 'inactive';
  stockStatus: 'all' | 'inStock' | 'outOfStock' | 'lowStock';
}

interface ProductFiltersProps {
  filters: ProductFiltersState;
  setFilters: (filters: ProductFiltersState) => void;
}

export default function ProductFilters({ filters, setFilters }: ProductFiltersProps) {
  const { data: categories } = useCategories({ page: 1, limit: 100 });
  const { data: sellers } = useSellers({ page: 1, limit: 100, isVerified: true });

  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value, page: 1 });
  };

  const handleCategoryChange = (value: string) => {
    setFilters({ ...filters, categoryId: value === 'all' ? undefined : parseInt(value), page: 1 });
  };

  const handleSellerChange = (value: string) => {
    setFilters({ ...filters, sellerId: value === 'all' ? undefined : parseInt(value), page: 1 });
  };

  const handleStatusChange = (value: string) => {
    setFilters({ ...filters, status: value as ProductFiltersState['status'], page: 1 });
  };

  const handleStockStatusChange = (value: string) => {
    setFilters({ ...filters, stockStatus: value as ProductFiltersState['stockStatus'], page: 1 });
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: filters.limit,
      search: '',
      categoryId: undefined,
      sellerId: undefined,
      status: 'all',
      stockStatus: 'all',
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.categoryId !== undefined ||
    filters.sellerId !== undefined ||
    filters.status !== 'all' ||
    filters.stockStatus !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by product name or SKU..."
            className="pl-9"
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={filters.categoryId?.toString() || 'all'} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.data?.map((category: any) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
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

          <Select value={filters.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.stockStatus} onValueChange={handleStockStatusChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="inStock">In Stock</SelectItem>
              <SelectItem value="lowStock">Low Stock</SelectItem>
              <SelectItem value="outOfStock">Out of Stock</SelectItem>
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
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleSearch('')} />
            </Badge>
          )}
          {filters.categoryId !== undefined && (
            <Badge variant="secondary" className="gap-1">
              Category: {categories?.data?.find((c: any) => c.id === filters.categoryId)?.name}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleCategoryChange('all')} />
            </Badge>
          )}
          {filters.sellerId !== undefined && (
            <Badge variant="secondary" className="gap-1">
              Seller: {sellers?.data?.find((s: any) => s.id === filters.sellerId)?.storeName}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleSellerChange('all')} />
            </Badge>
          )}
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.status}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleStatusChange('all')} />
            </Badge>
          )}
          {filters.stockStatus !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Stock: {filters.stockStatus}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleStockStatusChange('all')} />
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
