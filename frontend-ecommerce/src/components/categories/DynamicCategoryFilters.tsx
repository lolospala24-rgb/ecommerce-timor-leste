'use client';

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
import { Loader2 } from 'lucide-react';
import type { CategoryFilterFacet, CategoryListingFilters } from '@/types/category.types';
import { cn } from '@/lib/utils';

interface DynamicCategoryFiltersProps {
  facets: CategoryFilterFacet[];
  filters: CategoryListingFilters;
  isLoading?: boolean;
  onFilterChange: (patch: Partial<CategoryListingFilters>) => void;
  onToggleAttribute: (key: string, value: string) => void;
  onToggleBrand: (brand: string) => void;
  // Clearing is triggered by the heading that wraps this component (desktop
  // sidebar / mobile sheet), not from inside it — kept in the props
  // contract so callers don't need two different APIs for the same action.
  onClear: () => void;
  className?: string;
}

export function DynamicCategoryFilters({
  facets,
  filters,
  isLoading,
  onFilterChange,
  onToggleAttribute,
  onToggleBrand,
  className,
}: DynamicCategoryFiltersProps) {
  const priceFacet = facets.find((f) => f.type === 'range' && f.key === 'price');
  const [priceRange, setPriceRange] = useState<[number, number]>([
    filters.minPrice ?? priceFacet?.min ?? 0,
    filters.maxPrice ?? priceFacet?.max ?? 1000,
  ]);

  useEffect(() => {
    setPriceRange([
      filters.minPrice ?? priceFacet?.min ?? 0,
      filters.maxPrice ?? priceFacet?.max ?? 1000,
    ]);
  }, [filters.minPrice, filters.maxPrice, priceFacet?.min, priceFacet?.max]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderFacet = (facet: CategoryFilterFacet) => {
    if (facet.type === 'range' && facet.key === 'price') {
      const max = facet.max ?? 1000;
      const min = facet.min ?? 0;
      return (
        <AccordionItem key={facet.key} value={facet.key}>
          <AccordionTrigger className="text-sm font-medium">{facet.label}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <Slider
                value={[priceRange[0], priceRange[1]]}
                min={min}
                max={max}
                step={10}
                onValueChange={(value) => setPriceRange([value[0], value[1]])}
                className="py-2"
              />
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={priceRange[0]}
                  onChange={(e) =>
                    setPriceRange([parseFloat(e.target.value) || min, priceRange[1]])
                  }
                  className="h-8 text-sm"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="number"
                  value={priceRange[1]}
                  onChange={(e) =>
                    setPriceRange([priceRange[0], parseFloat(e.target.value) || max])
                  }
                  className="h-8 text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() =>
                  onFilterChange({
                    minPrice: priceRange[0],
                    maxPrice: priceRange[1],
                  })
                }
              >
                Apply Price
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      );
    }

    if (facet.type === 'boolean' && facet.key === 'inStock') {
      return (
        <AccordionItem key={facet.key} value={facet.key}>
          <AccordionTrigger className="text-sm font-medium">{facet.label}</AccordionTrigger>
          <AccordionContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="category-in-stock" className="cursor-pointer text-sm">
                In stock only
              </Label>
              <Switch
                id="category-in-stock"
                checked={filters.inStock || false}
                onCheckedChange={(checked) =>
                  onFilterChange({ inStock: checked ? true : undefined })
                }
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      );
    }

    if (facet.type === 'rating') {
      return (
        <AccordionItem key={facet.key} value={facet.key}>
          <AccordionTrigger className="text-sm font-medium">{facet.label}</AccordionTrigger>
          <AccordionContent>
            <Select
              value={filters.minRating?.toString() || 'all'}
              onValueChange={(value) =>
                onFilterChange({
                  minRating: value === 'all' ? undefined : parseInt(value, 10),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any rating</SelectItem>
                <SelectItem value="4">★★★★ & up</SelectItem>
                <SelectItem value="3">★★★ & up</SelectItem>
                <SelectItem value="2">★★ & up</SelectItem>
                <SelectItem value="1">★ & up</SelectItem>
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>
      );
    }

    if (facet.type === 'subcategory') {
      const options = facet.options || [];
      if (options.length === 0) return null;

      return (
        <AccordionItem key={facet.key} value={facet.key}>
          <AccordionTrigger className="text-sm font-medium">{facet.label}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {options.map((option) => {
                const id = parseInt(option.value, 10);
                const checked = filters.subcategoryId === id;
                return (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border accent-primary"
                      checked={checked}
                      onChange={() =>
                        onFilterChange({
                          subcategoryId: checked ? undefined : id,
                        })
                      }
                    />
                    <span className="flex-1 truncate">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.count}</span>
                  </label>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      );
    }

    if (facet.source === 'brand' || facet.key === 'brand') {
      const options = facet.options || [];
      if (options.length === 0) return null;

      return (
        <AccordionItem key={facet.key} value={facet.key}>
          <AccordionTrigger className="text-sm font-medium">{facet.label}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {options.map((option) => {
                const checked = filters.brand?.includes(option.value) || false;
                return (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border accent-primary"
                      checked={checked}
                      onChange={() => onToggleBrand(option.value)}
                    />
                    <span className="flex-1 truncate">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.count}</span>
                  </label>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      );
    }

    if (
      (facet.type === 'multiselect' || facet.type === 'select') &&
      facet.options &&
      facet.options.length > 0
    ) {
      return (
        <AccordionItem key={facet.key} value={facet.key}>
          <AccordionTrigger className="text-sm font-medium">{facet.label}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {facet.options.map((option) => {
                const selected = filters.attributes[facet.key] || [];
                const checked = selected.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border accent-primary"
                      checked={checked}
                      onChange={() => onToggleAttribute(facet.key, option.value)}
                    />
                    <span className="flex-1 truncate">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.count}</span>
                  </label>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      );
    }

    return null;
  };

  const visibleFacets = facets.filter((facet) => {
    if (facet.type === 'range' || facet.type === 'boolean' || facet.type === 'rating') return true;
    if (facet.options && facet.options.length > 0) return true;
    return false;
  });

  const defaultOpen = visibleFacets.slice(0, 4).map((f) => f.key);

  return (
    <div className={cn('space-y-4', className)}>
      {/* No heading here — both call sites (desktop sidebar, mobile sheet)
          already render their own "Filters" heading + clear action around
          this component; a second one here was a plain duplicate. */}
      {visibleFacets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No filters available for this category.</p>
      ) : (
        <Accordion type="multiple" defaultValue={defaultOpen}>
          {visibleFacets.map(renderFacet)}
        </Accordion>
      )}
    </div>
  );
}
