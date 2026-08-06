'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function FeedSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  const gridClass = viewMode === 'grid'
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
    : 'grid grid-cols-1 gap-4';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32 bg-[#151515]" />
          <Skeleton className="h-4 w-20 bg-[#151515]" />
        </div>
        <Skeleton className="h-9 w-24 bg-[#151515]" />
      </div>
      <div className={gridClass}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className={viewMode === 'list' ? 'h-32 rounded-xl bg-[#151515] animate-pulse' : 'h-[300px] rounded-xl bg-[#151515] animate-pulse'} />
        ))}
      </div>
    </div>
  );
}

export function SingleVideoSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-6">
      <button className="flex items-center gap-2 text-sm text-[#A3A3A3] mb-4">
        ← Back to Feed
      </button>
      <div className="aspect-[9/16] rounded-2xl bg-[#151515] animate-pulse" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-3/4 bg-[#151515]" />
        <Skeleton className="h-4 w-1/2 bg-[#151515]" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-full bg-[#151515]" />
          <Skeleton className="h-10 flex-1 bg-[#151515]" />
        </div>
      </div>
    </div>
  );
}