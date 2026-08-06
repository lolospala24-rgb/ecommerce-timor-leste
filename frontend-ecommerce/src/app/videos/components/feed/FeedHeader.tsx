'use client';

import { ViewModeToggle } from './ViewModeToggle';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface FeedHeaderProps {
  category?: string;
  search?: string;
  totalVideos: number;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onClearFilters: () => void;
}

export function FeedHeader({
  category,
  search,
  totalVideos,
  viewMode,
  onViewModeChange,
  onClearFilters,
}: FeedHeaderProps) {
  const title = category ? `${category} Videos` : search ? `Search: ${search}` : 'For You';

  return (
    <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="text-sm text-[#A3A3A3]">{totalVideos.toLocaleString()} videos</p>
      </div>

      <div className="flex items-center gap-3">
        <ViewModeToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />

        {(category || search) && (
          <Button variant="outline" size="sm" onClick={onClearFilters} className="text-xs">
            <X className="h-3.5 w-3.5 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}