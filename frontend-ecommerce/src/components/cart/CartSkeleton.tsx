'use client';

import { Skeleton } from '@/components/ui/skeleton';

function SkeletonGroup() {
  return (
    <div className="rounded-2xl border border-[#DDE3DE] bg-white p-4">
      <div className="flex items-center gap-2.5 border-b border-[#EEF1EE] pb-3">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="flex gap-3 border-b border-[#EEF1EE] py-3 last:border-0">
          <Skeleton className="h-5 w-5 shrink-0 rounded" />
          <Skeleton className="h-[76px] w-[76px] shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CartSkeleton() {
  return (
    <div className="space-y-3">
      <SkeletonGroup />
      <SkeletonGroup />
    </div>
  );
}
