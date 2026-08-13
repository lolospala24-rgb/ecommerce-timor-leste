'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Search,
  X,
  Star,
  ChevronDown,
  Filter,
  SlidersHorizontal,
  Tag,
  Package,
  Store,
  Percent,
  Sparkles,
  TrendingUp,
  Clock,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================
// TYPES
// ============================================================

export interface ProductFiltersType {
  search?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  minRating?: number;
  sortBy?: string;
  brands?: string[];
  conditions?: string[];
  discount?: boolean;
  minDiscount?: number;
  isFeatured?: boolean;
  isNew?: boolean;
}

interface Category {
  id: number;
  name: string;
  nameTetum?: string;
  slug?: string;
  count?: number;
  icon?: string;
}

interface Brand {
  id: string;
  name: string;
  count?: number;
  logo?: string;
}

interface ProductFiltersProps {
  filters: ProductFiltersType;
  onFilterChange: (filters: Partial<ProductFiltersType>) => void;
  categories?: Category[];
  brands?: Brand[];
  className?: string;
  showSearch?: boolean;
  showSort?: boolean;
  showBrands?: boolean;
  showConditions?: boolean;
  showDiscount?: boolean;
  showFeatured?: boolean;
  showNew?: boolean;
  maxPrice?: number;
  defaultExpanded?: string[];
  totalResults?: number;
  isLoading?: boolean;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function ProductFilters({
  filters,
  onFilterChange,
  categories = [],
  brands = [],
  className,
  showSearch = true,
  showSort = true,
  showBrands = true,
  showConditions = false,
  showDiscount = false,
  showFeatured = false,
  showNew = false,
  maxPrice = 1000,
  defaultExpanded = ['category', 'price', 'stock', 'rating'],
  totalResults = 0,
  isLoading = false,
}: ProductFiltersProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [mounted, setMounted] = useState(false);

  const [priceRange, setPriceRange] = useState<[number, number]>([
    filters.minPrice || 0,
    filters.maxPrice || maxPrice,
  ]);

  const [isExpanded, setIsExpanded] = useState(true);
  const [searchValue, setSearchValue] = useState(filters.search || '');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) {
        onFilterChange({ search: searchValue || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, filters.search, onFilterChange]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handlePriceChange = (value: number[]) => {
    setPriceRange([value[0], value[1]]);
  };

  const handleApplyPrice = () => {
    onFilterChange({
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
    });
  };

  const handleStockChange = (checked: boolean) => {
    onFilterChange({ inStock: checked });
  };

  const handleRatingChange = (stars: number) => {
    onFilterChange({
      minRating: filters.minRating === stars ? undefined : stars,
    });
  };

  const handleCategoryChange = (value: string) => {
    onFilterChange({
      categoryId: value === 'all' ? undefined : parseInt(value),
    });
  };

  const handleSortChange = (value: string) => {
    onFilterChange({ sortBy: value === 'default' ? undefined : value });
  };

  const handleBrandToggle = (brand: string) => {
    const current = filters.brands || [];
    const updated = current.includes(brand)
      ? current.filter((b) => b !== brand)
      : [...current, brand];
    onFilterChange({ brands: updated.length > 0 ? updated : undefined });
  };

  const handleConditionToggle = (condition: string) => {
    const current = filters.conditions || [];
    const updated = current.includes(condition)
      ? current.filter((c) => c !== condition)
      : [...current, condition];
    onFilterChange({ conditions: updated.length > 0 ? updated : undefined });
  };

  const handleDiscountChange = (checked: boolean) => {
    onFilterChange({ discount: checked });
  };

  const handleFeaturedChange = (checked: boolean) => {
    onFilterChange({ isFeatured: checked });
  };

  const handleNewChange = (checked: boolean) => {
    onFilterChange({ isNew: checked });
  };

  const clearFilters = () => {
    onFilterChange({
      search: undefined,
      categoryId: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      inStock: undefined,
      minRating: undefined,
      sortBy: undefined,
      brands: undefined,
      conditions: undefined,
      discount: undefined,
      minDiscount: undefined,
      isFeatured: undefined,
      isNew: undefined,
    });
    setPriceRange([0, maxPrice]);
    setSearchValue('');
  };

  const removeFilter = (key: keyof ProductFiltersType, value?: any) => {
    if (key === 'brands' && value) {
      const updated = filters.brands?.filter((b) => b !== value) || [];
      onFilterChange({ brands: updated.length > 0 ? updated : undefined });
    } else if (key === 'conditions' && value) {
      const updated = filters.conditions?.filter((c) => c !== value) || [];
      onFilterChange({ conditions: updated.length > 0 ? updated : undefined });
    } else {
      onFilterChange({ [key]: undefined });
    }
  };

  // ============================================================
  // COMPUTED
  // ============================================================

  const hasActiveFilters =
    filters.search ||
    filters.categoryId !== undefined ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.inStock !== undefined ||
    filters.minRating !== undefined ||
    filters.sortBy !== undefined ||
    (filters.brands && filters.brands.length > 0) ||
    (filters.conditions && filters.conditions.length > 0) ||
    filters.discount !== undefined ||
    filters.isFeatured !== undefined ||
    filters.isNew !== undefined;

  const getCategoryName = (id: number) => {
    const cat = categories.find((c) => c.id === id);
    return cat?.name || cat?.nameTetum || `Category ${id}`;
  };

  const getSortLabel = (value: string) => {
    const labels: Record<string, { label: string; icon: any }> = {
      newest: { label: 'Newest First', icon: Clock },
      price_asc: { label: 'Price: Low to High', icon: DollarSign },
      price_desc: { label: 'Price: High to Low', icon: DollarSign },
      popularity: { label: 'Most Popular', icon: TrendingUp },
      rating: { label: 'Top Rated', icon: Star },
      relevance: { label: 'Relevance', icon: Sparkles },
    };
    return labels[value]?.label || value;
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.categoryId) count++;
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count++;
    if (filters.inStock) count++;
    if (filters.minRating) count++;
    if (filters.sortBy) count++;
    if (filters.brands?.length) count += filters.brands.length;
    if (filters.conditions?.length) count += filters.conditions.length;
    if (filters.discount) count++;
    if (filters.isFeatured) count++;
    if (filters.isNew) count++;
    return count;
  };

  // ============================================================
  // STYLES
  // ============================================================

  const styles = {
    bg: isDark ? 'bg-[#0B0B0D]' : 'bg-white',
    bgCard: isDark ? 'bg-[#151515]' : 'bg-white',
    bgHover: isDark ? 'hover:bg-[#1C1C1C]' : 'hover:bg-slate-50',
    bgInput: isDark ? 'bg-[#151515]' : 'bg-white',
    bgSelect: isDark ? 'bg-[#151515]' : 'bg-white',
    bgSelectContent: isDark ? 'bg-[#151515]' : 'bg-white',
    bgBadge: isDark ? 'bg-[#1D4ED8]/20' : 'bg-[#1D4ED8]/10',
    bgRating: isDark ? 'hover:bg-[#1C1C1C]' : 'hover:bg-slate-50',
    bgAccordion: isDark ? 'border-[rgba(255,255,255,0.05)]' : 'border-slate-100',

    text: isDark ? 'text-white' : 'text-slate-900',
    textSecondary: isDark ? 'text-[#A3A3A3]' : 'text-slate-500',
    textMuted: isDark ? 'text-[#A3A3A3]' : 'text-slate-400',
    textPrimary: isDark ? 'text-[#1D4ED8]' : 'text-[#1D4ED8]',
    textBrand: isDark ? 'text-[#A3A3A3]' : 'text-slate-600',

    border: isDark ? 'border-[rgba(255,255,255,0.06)]' : 'border-slate-200',
    borderFocus: isDark ? 'focus-visible:ring-[#1D4ED8]' : 'focus-visible:ring-[#1D4ED8]',

    shadow: isDark ? 'shadow-lg shadow-[#0B0B0D]' : 'shadow-lg shadow-slate-100',
    shadowHover: isDark ? 'hover:shadow-xl hover:shadow-[#0B0B0D]' : 'hover:shadow-xl hover:shadow-slate-100',

    buttonHover: isDark ? 'hover:bg-[#1C1C1C]' : 'hover:bg-slate-50',
    buttonOutline: isDark 
      ? 'border-[rgba(255,255,255,0.08)] text-[#A3A3A3] hover:text-white hover:border-[#1D4ED8]/30' 
      : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:border-[#1D4ED8]/30',

    badgeDefault: isDark ? 'bg-[#1D4ED8]/20 text-[#1D4ED8]' : 'bg-[#1D4ED8]/10 text-[#1D4ED8]',
    badgeStock: isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700',
    badgeRating: isDark ? 'bg-amber-500/20 text-amber-500' : 'bg-amber-100 text-amber-700',
    badgeDiscount: isDark ? 'bg-[#DC2626]/20 text-[#DC2626]' : 'bg-red-100 text-red-600',
    badgeFeatured: isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700',
    badgeNew: isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700',

    switchChecked: isDark ? 'data-[state=checked]:bg-[#DC2626]' : 'data-[state=checked]:bg-[#DC2626]',
    accent: isDark ? 'accent-[#DC2626]' : 'accent-[#DC2626]',

    scrollbar: isDark 
      ? 'scrollbar-thin scrollbar-thumb-[#1C1C1C] scrollbar-track-transparent' 
      : 'scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent',
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (!mounted) {
    return <div className={cn('min-h-[400px]', styles.bgCard)} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'rounded-2xl border p-6 space-y-6',
        styles.bgCard,
        styles.border,
        styles.shadow,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-xl',
            isDark ? 'bg-[#1C1C1C]' : 'bg-slate-100'
          )}>
            <SlidersHorizontal className={cn('h-5 w-5', styles.textPrimary)} />
          </div>
          <div>
            <h3 className={cn('text-lg font-semibold', styles.text)}>Filters</h3>
            {totalResults > 0 && (
              <p className={cn('text-sm', styles.textSecondary)}>
                {totalResults.toLocaleString()} products found
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className={cn(
                'h-8 text-xs rounded-lg px-3',
                styles.textSecondary,
                styles.buttonHover
              )}
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Clear all
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'h-8 w-8 p-0 rounded-lg',
              styles.textSecondary,
              styles.buttonHover
            )}
          >
            <ChevronDown className={cn(
              'h-4 w-4 transition-transform duration-200',
              !isExpanded && 'rotate-180'
            )} />
          </Button>
        </div>
      </div>

      {/* Active Filters Summary */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2 pb-4 border-b"
            style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb' }}
          >
            {filters.search && (
              <Badge className={cn('text-xs px-2.5 py-1 rounded-full gap-1', styles.badgeDefault)}>
                <Search className="h-3 w-3" />
                {filters.search}
                <button
                  onClick={() => removeFilter('search')}
                  className="ml-1 hover:text-white transition-colors"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.categoryId && (
              <Badge className={cn('text-xs px-2.5 py-1 rounded-full gap-1', styles.badgeDefault)}>
                <Tag className="h-3 w-3" />
                {getCategoryName(filters.categoryId)}
                <button
                  onClick={() => removeFilter('categoryId')}
                  className="ml-1 hover:text-white transition-colors"
                >
                  ×
                </button>
              </Badge>
            )}
            {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
              <Badge className={cn('text-xs px-2.5 py-1 rounded-full gap-1', styles.badgeDefault)}>
                <DollarSign className="h-3 w-3" />
                ${filters.minPrice || 0} - ${filters.maxPrice || maxPrice}
                <button
                  onClick={() => removeFilter('minPrice')}
                  className="ml-1 hover:text-white transition-colors"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.inStock && (
              <Badge className={cn('text-xs px-2.5 py-1 rounded-full gap-1', styles.badgeStock)}>
                <Package className="h-3 w-3" />
                In Stock
                <button
                  onClick={() => removeFilter('inStock')}
                  className="ml-1 hover:text-white transition-colors"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.minRating && (
              <Badge className={cn('text-xs px-2.5 py-1 rounded-full gap-1', styles.badgeRating)}>
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                {filters.minRating}+ Stars
                <button
                  onClick={() => removeFilter('minRating')}
                  className="ml-1 hover:text-white transition-colors"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.sortBy && (
              <Badge className={cn('text-xs px-2.5 py-1 rounded-full gap-1', styles.badgeDefault)}>
                <Sparkles className="h-3 w-3" />
                {getSortLabel(filters.sortBy)}
                <button
                  onClick={() => removeFilter('sortBy')}
                  className="ml-1 hover:text-white transition-colors"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.brands?.map((brand) => (
              <Badge key={brand} className={cn('text-xs px-2.5 py-1 rounded-full gap-1', styles.badgeDefault)}>
                <Store className="h-3 w-3" />
                {brand}
                <button
                  onClick={() => removeFilter('brands', brand)}
                  className="ml-1 hover:text-white transition-colors"
                >
                  ×
                </button>
              </Badge>
            ))}
            {filters.conditions?.map((condition) => (
              <Badge key={condition} className={cn('text-xs px-2.5 py-1 rounded-full gap-1', styles.badgeDefault)}>
                <Package className="h-3 w-3" />
                {condition}
                <button
                  onClick={() => removeFilter('conditions', condition)}
                  className="ml-1 hover:text-white transition-colors"
                >
                  ×
                </button>
              </Badge>
            ))}
            {filters.discount && (
              <Badge className={cn('text-xs px-2.5 py-1 rounded-full gap-1', styles.badgeDiscount)}>
                <Percent className="h-3 w-3" />
                On Sale
                <button
                  onClick={() => removeFilter('discount')}
                  className="ml-1 hover:text-white transition-colors"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.isFeatured && (
              <Badge className={cn('text-xs px-2.5 py-1 rounded-full gap-1', styles.badgeFeatured)}>
                <Sparkles className="h-3 w-3" />
                Featured
                <button
                  onClick={() => removeFilter('isFeatured')}
                  className="ml-1 hover:text-white transition-colors"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.isNew && (
              <Badge className={cn('text-xs px-2.5 py-1 rounded-full gap-1', styles.badgeNew)}>
                <Sparkles className="h-3 w-3" />
                New
                <button
                  onClick={() => removeFilter('isNew')}
                  className="ml-1 hover:text-white transition-colors"
                >
                  ×
                </button>
              </Badge>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Search */}
            {showSearch && (
              <div className="relative group">
                <Search className={cn(
                  'absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors',
                  searchValue ? styles.textPrimary : styles.textSecondary,
                  'group-focus-within:text-primary'
                )} />
                <Input
                  placeholder="Search products..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className={cn(
                    'pl-11 pr-4 h-11 rounded-xl border-2 transition-all',
                    styles.bgInput,
                    styles.border,
                    styles.text,
                    'placeholder:',
                    styles.textSecondary,
                    'focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20',
                    styles.borderFocus
                  )}
                />
                {searchValue && (
                  <button
                    onClick={() => setSearchValue('')}
                    className={cn(
                      'absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors',
                      styles.textSecondary,
                      styles.buttonHover
                    )}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            <Accordion
              type="multiple"
              defaultValue={defaultExpanded}
              className="space-y-1"
            >
              {/* Category */}
              {categories && categories.length > 0 && (
                <AccordionItem value="category" className={cn('border rounded-xl px-1', styles.bgAccordion)}>
                  <AccordionTrigger className={cn(
                    'text-sm font-medium hover:no-underline py-3 px-3 rounded-xl transition-all',
                    styles.text,
                    styles.buttonHover
                  )}>
                    <span className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Category
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <Select
                      value={filters.categoryId?.toString() || 'all'}
                      onValueChange={handleCategoryChange}
                    >
                      <SelectTrigger className={cn(
                        'h-10 rounded-lg border-2 transition-all',
                        styles.bgSelect,
                        styles.border,
                        styles.text,
                        'focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20'
                      )}>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent className={cn(
                        'rounded-xl border-2',
                        styles.bgSelectContent,
                        styles.border,
                        styles.text,
                        styles.shadow
                      )}>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            <span className="flex items-center justify-between w-full">
                              <span>{cat.name || cat.nameTetum}</span>
                              {cat.count !== undefined && (
                                <span className={cn('text-xs', styles.textSecondary)}>
                                  ({cat.count})
                                </span>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Price Range */}
              <AccordionItem value="price" className={cn('border rounded-xl px-1', styles.bgAccordion)}>
                <AccordionTrigger className={cn(
                  'text-sm font-medium hover:no-underline py-3 px-3 rounded-xl transition-all',
                  styles.text,
                  styles.buttonHover
                )}>
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Price Range
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="space-y-4">
                    <Slider
                      value={[priceRange[0], priceRange[1]]}
                      max={maxPrice}
                      step={10}
                      onValueChange={handlePriceChange}
                      className="py-2"
                    />
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: `Under $${Math.floor(maxPrice * 0.25)}`, min: 0, max: Math.floor(maxPrice * 0.25) },
                        { label: `$${Math.floor(maxPrice * 0.25)}-$${Math.floor(maxPrice * 0.5)}`, min: Math.floor(maxPrice * 0.25), max: Math.floor(maxPrice * 0.5) },
                        { label: `$${Math.floor(maxPrice * 0.5)}-$${Math.floor(maxPrice * 0.75)}`, min: Math.floor(maxPrice * 0.5), max: Math.floor(maxPrice * 0.75) },
                        { label: `$${Math.floor(maxPrice * 0.75)}+`, min: Math.floor(maxPrice * 0.75), max: maxPrice },
                      ].map((preset) => (
                        <Button
                          key={preset.label}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPriceRange([preset.min, preset.max]);
                            onFilterChange({ minPrice: preset.min, maxPrice: preset.max });
                          }}
                          className={cn(
                            'text-xs rounded-lg px-3 h-8',
                            styles.buttonOutline,
                            styles.buttonHover
                          )}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Label className={cn('text-xs font-medium', styles.textSecondary)}>Min</Label>
                        <Input
                          type="number"
                          value={priceRange[0]}
                          onChange={(e) =>
                            setPriceRange([
                              parseFloat(e.target.value) || 0,
                              priceRange[1],
                            ])
                          }
                          className={cn(
                            'h-9 text-sm rounded-lg border-2 transition-all',
                            styles.bgInput,
                            styles.border,
                            styles.text,
                            'focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20'
                          )}
                          min={0}
                          max={priceRange[1]}
                        />
                      </div>
                      <div className="flex-1">
                        <Label className={cn('text-xs font-medium', styles.textSecondary)}>Max</Label>
                        <Input
                          type="number"
                          value={priceRange[1]}
                          onChange={(e) =>
                            setPriceRange([
                              priceRange[0],
                              parseFloat(e.target.value) || maxPrice,
                            ])
                          }
                          className={cn(
                            'h-9 text-sm rounded-lg border-2 transition-all',
                            styles.bgInput,
                            styles.border,
                            styles.text,
                            'focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20'
                          )}
                          min={priceRange[0]}
                          max={maxPrice}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleApplyPrice}
                        className={cn(
                          'mt-5 h-9 rounded-lg px-4',
                          styles.buttonOutline,
                          styles.buttonHover
                        )}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Stock */}
              <AccordionItem value="stock" className={cn('border rounded-xl px-1', styles.bgAccordion)}>
                <AccordionTrigger className={cn(
                  'text-sm font-medium hover:no-underline py-3 px-3 rounded-xl transition-all',
                  styles.text,
                  styles.buttonHover
                )}>
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Availability
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-opacity-5 bg-[#1D4ED8]/5">
                    <Label htmlFor="in-stock" className={cn('cursor-pointer text-sm font-medium', styles.text)}>
                      In Stock Only
                    </Label>
                    <Switch
                      id="in-stock"
                      checked={filters.inStock || false}
                      onCheckedChange={handleStockChange}
                      className={cn(
                        styles.switchChecked,
                        'data-[state=checked]:shadow-lg data-[state=checked]:shadow-[#DC2626]/20'
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Rating */}
              <AccordionItem value="rating" className={cn('border rounded-xl px-1', styles.bgAccordion)}>
                <AccordionTrigger className={cn(
                  'text-sm font-medium hover:no-underline py-3 px-3 rounded-xl transition-all',
                  styles.text,
                  styles.buttonHover
                )}>
                  <span className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Rating
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((stars) => (
                      <label
                        key={stars}
                        className={cn(
                          'flex items-center gap-3 text-sm cursor-pointer p-2 rounded-lg transition-all',
                          styles.bgRating,
                          filters.minRating === stars && (isDark ? 'bg-[#1C1C1C]' : 'bg-slate-100')
                        )}
                      >
                        <input
                          type="radio"
                          name="rating"
                          value={stars}
                          checked={filters.minRating === stars}
                          onChange={() => handleRatingChange(stars)}
                          className={cn(
                            'h-4 w-4 rounded-full border-2',
                            styles.accent,
                            isDark ? 'border-[rgba(255,255,255,0.08)]' : 'border-slate-300'
                          )}
                        />
                        <span className="flex items-center gap-1.5">
                          {Array.from({ length: stars }).map((_, i) => (
                            <Star
                              key={i}
                              className="h-4 w-4 fill-amber-500 text-amber-500"
                            />
                          ))}
                          {stars < 5 && (
                            <span className={cn('text-xs ml-1', styles.textSecondary)}>& up</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Sort */}
              {showSort && (
                <AccordionItem value="sort" className={cn('border rounded-xl px-1', styles.bgAccordion)}>
                  <AccordionTrigger className={cn(
                    'text-sm font-medium hover:no-underline py-3 px-3 rounded-xl transition-all',
                    styles.text,
                    styles.buttonHover
                  )}>
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Sort By
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <Select
                      value={filters.sortBy || 'default'}
                      onValueChange={handleSortChange}
                    >
                      <SelectTrigger className={cn(
                        'h-10 rounded-lg border-2 transition-all',
                        styles.bgSelect,
                        styles.border,
                        styles.text,
                        'focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20'
                      )}>
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent className={cn(
                        'rounded-xl border-2',
                        styles.bgSelectContent,
                        styles.border,
                        styles.text,
                        styles.shadow
                      )}>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="price_asc">Price: Low to High</SelectItem>
                        <SelectItem value="price_desc">Price: High to Low</SelectItem>
                        <SelectItem value="popularity">Most Popular</SelectItem>
                        <SelectItem value="rating">Top Rated</SelectItem>
                        <SelectItem value="relevance">Relevance</SelectItem>
                      </SelectContent>
                    </Select>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Brands */}
              {showBrands && brands && brands.length > 0 && (
                <AccordionItem value="brand" className={cn('border rounded-xl px-1', styles.bgAccordion)}>
                  <AccordionTrigger className={cn(
                    'text-sm font-medium hover:no-underline py-3 px-3 rounded-xl transition-all',
                    styles.text,
                    styles.buttonHover
                  )}>
                    <span className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Brand
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <div className={cn(
                      'space-y-1 max-h-48 overflow-y-auto pr-2',
                      styles.scrollbar
                    )}>
                      {brands.map((brand) => (
                        <label
                          key={brand.id}
                          className={cn(
                            'flex items-center gap-3 text-sm cursor-pointer p-2 rounded-lg transition-all',
                            styles.bgRating,
                            filters.brands?.includes(brand.name) && (isDark ? 'bg-[#1C1C1C]' : 'bg-slate-100')
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={filters.brands?.includes(brand.name) || false}
                            onChange={() => handleBrandToggle(brand.name)}
                            className={cn(
                              'h-4 w-4 rounded border-2',
                              styles.accent,
                              isDark ? 'border-[rgba(255,255,255,0.08)]' : 'border-slate-300'
                            )}
                          />
                          <span className={cn('flex-1', styles.textBrand)}>{brand.name}</span>
                          {brand.count !== undefined && (
                            <span className={cn('text-xs', styles.textSecondary)}>
                              ({brand.count})
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Conditions */}
              {showConditions && (
                <AccordionItem value="condition" className={cn('border rounded-xl px-1', styles.bgAccordion)}>
                  <AccordionTrigger className={cn(
                    'text-sm font-medium hover:no-underline py-3 px-3 rounded-xl transition-all',
                    styles.text,
                    styles.buttonHover
                  )}>
                    <span className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Condition
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <div className="space-y-1">
                      {['New', 'Used', 'Refurbished', 'Open Box'].map((condition) => (
                        <label
                          key={condition}
                          className={cn(
                            'flex items-center gap-3 text-sm cursor-pointer p-2 rounded-lg transition-all',
                            styles.bgRating,
                            filters.conditions?.includes(condition) && (isDark ? 'bg-[#1C1C1C]' : 'bg-slate-100')
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={filters.conditions?.includes(condition) || false}
                            onChange={() => handleConditionToggle(condition)}
                            className={cn(
                              'h-4 w-4 rounded border-2',
                              styles.accent,
                              isDark ? 'border-[rgba(255,255,255,0.08)]' : 'border-slate-300'
                            )}
                          />
                          <span className={styles.textBrand}>{condition}</span>
                        </label>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Discount */}
              {showDiscount && (
                <AccordionItem value="discount" className={cn('border rounded-xl px-1', styles.bgAccordion)}>
                  <AccordionTrigger className={cn(
                    'text-sm font-medium hover:no-underline py-3 px-3 rounded-xl transition-all',
                    styles.text,
                    styles.buttonHover
                  )}>
                    <span className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Discount
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-opacity-5 bg-[#1D4ED8]/5">
                        <Label htmlFor="on-sale" className={cn('cursor-pointer text-sm font-medium', styles.text)}>
                          On Sale Only
                        </Label>
                        <Switch
                          id="on-sale"
                          checked={filters.discount || false}
                          onCheckedChange={handleDiscountChange}
                          className={cn(
                            styles.switchChecked,
                            'data-[state=checked]:shadow-lg data-[state=checked]:shadow-[#DC2626]/20'
                          )}
                        />
                      </div>
                      {filters.discount && (
                        <div className="space-y-2">
                          <Label className={cn('text-xs font-medium', styles.textSecondary)}>
                            Minimum Discount
                          </Label>
                          <Select
                            value={filters.minDiscount?.toString() || 'all'}
                            onValueChange={(value) =>
                              onFilterChange({
                                minDiscount: value === 'all' ? undefined : parseInt(value),
                              })
                            }
                          >
                            <SelectTrigger className={cn(
                              'h-10 rounded-lg border-2 transition-all',
                              styles.bgSelect,
                              styles.border,
                              styles.text,
                              'focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20'
                            )}>
                              <SelectValue placeholder="Any discount" />
                            </SelectTrigger>
                            <SelectContent className={cn(
                              'rounded-xl border-2',
                              styles.bgSelectContent,
                              styles.border,
                              styles.text,
                              styles.shadow
                            )}>
                              <SelectItem value="all">Any discount</SelectItem>
                              <SelectItem value="10">10% or more</SelectItem>
                              <SelectItem value="20">20% or more</SelectItem>
                              <SelectItem value="30">30% or more</SelectItem>
                              <SelectItem value="50">50% or more</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Featured */}
              {showFeatured && (
                <AccordionItem value="featured" className={cn('border rounded-xl px-1', styles.bgAccordion)}>
                  <AccordionTrigger className={cn(
                    'text-sm font-medium hover:no-underline py-3 px-3 rounded-xl transition-all',
                    styles.text,
                    styles.buttonHover
                  )}>
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Featured
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-opacity-5 bg-[#1D4ED8]/5">
                      <Label htmlFor="is-featured" className={cn('cursor-pointer text-sm font-medium', styles.text)}>
                        Show Featured Only
                      </Label>
                      <Switch
                        id="is-featured"
                        checked={filters.isFeatured || false}
                        onCheckedChange={handleFeaturedChange}
                        className={cn(
                          styles.switchChecked,
                          'data-[state=checked]:shadow-lg data-[state=checked]:shadow-[#DC2626]/20'
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* New */}
              {showNew && (
                <AccordionItem value="new" className={cn('border rounded-xl px-1', styles.bgAccordion)}>
                  <AccordionTrigger className={cn(
                    'text-sm font-medium hover:no-underline py-3 px-3 rounded-xl transition-all',
                    styles.text,
                    styles.buttonHover
                  )}>
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      New Arrivals
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-opacity-5 bg-[#1D4ED8]/5">
                      <Label htmlFor="is-new" className={cn('cursor-pointer text-sm font-medium', styles.text)}>
                        Show New Only
                      </Label>
                      <Switch
                        id="is-new"
                        checked={filters.isNew || false}
                        onCheckedChange={handleNewChange}
                        className={cn(
                          styles.switchChecked,
                          'data-[state=checked]:shadow-lg data-[state=checked]:shadow-[#DC2626]/20'
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>

            {/* Reset Button */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className={cn(
                  'w-full h-11 rounded-xl text-sm font-medium transition-all',
                  styles.buttonOutline,
                  styles.buttonHover
                )}
              >
                <X className="h-4 w-4 mr-2" />
                Reset All Filters
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}