'use client';

import { Creator } from '@/types/creator';
import { CreatorCard } from '@/components/creator/CreatorCard';
import { EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';

interface CreatorRecommendationsProps {
  creators: Creator[];
  title?: string;
  className?: string;
  onCreatorClick?: (creator: Creator) => void;
}

export function CreatorRecommendations({
  creators,
  title = 'Recommended Creators',
  className,
  onCreatorClick,
}: CreatorRecommendationsProps) {
  if (creators.length === 0) {
    return (
      <EmptyState
        iconName="users"
        title="No creator recommendations"
        description="Follow creators to see their content"
        size="sm"
      />
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <div className="space-y-2">
        {creators.slice(0, 5).map((creator) => (
          <div
            key={creator.id}
            className="cursor-pointer"
            onClick={() => onCreatorClick?.(creator)}
          >
            <CreatorCard
              creator={creator}
              variant="compact"
            />
          </div>
        ))}
      </div>
    </div>
  );
}