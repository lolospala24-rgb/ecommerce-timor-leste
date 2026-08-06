'use client';

import { Grid3x3, List } from 'lucide-react';

interface ViewModeToggleProps {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  return (
    <div className="flex bg-[#151515] rounded-lg border border-[rgba(255,255,255,0.05)] p-1">
      <button
        onClick={() => onViewModeChange('grid')}
        className={`p-1.5 rounded-md transition-all ${
          viewMode === 'grid' ? 'bg-[#FF3B5C] text-white' : 'text-[#A3A3A3] hover:text-white'
        }`}
      >
        <Grid3x3 className="h-4 w-4" />
      </button>
      <button
        onClick={() => onViewModeChange('list')}
        className={`p-1.5 rounded-md transition-all ${
          viewMode === 'list' ? 'bg-[#FF3B5C] text-white' : 'text-[#A3A3A3] hover:text-white'
        }`}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}