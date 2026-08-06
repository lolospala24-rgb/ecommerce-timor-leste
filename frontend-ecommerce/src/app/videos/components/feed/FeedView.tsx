'use client';

import { useEffect } from 'react';
import { FeedHeader } from './FeedHeader';
import { FeedGrid } from './FeedGrid';
import { useVideos } from '@/hooks/useVideos';
import { EmptyState } from '../ui/EmptyState';
import { FeedSkeleton } from '../share/SkeletonLoader';

interface FeedViewProps {
  category?: string;
  search?: string;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onVideoSelect: (id: string) => void;
  onClearFilters: () => void;
}

export function FeedView({
  category,
  search,
  viewMode,
  onViewModeChange,
  onVideoSelect,
  onClearFilters,
}: FeedViewProps) {
  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useVideos({
    category,
    search,
    limit: 12,
  });

  const videos = data?.pages.flatMap((page) => page.data) || [];
  const totalVideos = data?.pages[0]?.meta?.total || 0;

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 500 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return <FeedSkeleton viewMode={viewMode} />;
  }

  if (videos.length === 0) {
    return (
      <EmptyState
        iconName="film"
        title={search ? `No results for "${search}"` : 'No videos available'}
        description={search ? 'Try adjusting your search' : 'Check back later for new content'}
        action={search ? { label: 'Clear Search', onClick: onClearFilters } : undefined}
      />
    );
  }

  return (
    <div className="space-y-6">
      <FeedHeader
        category={category}
        search={search}
        totalVideos={totalVideos}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        onClearFilters={onClearFilters}
      />

      <FeedGrid videos={videos} viewMode={viewMode} onVideoSelect={onVideoSelect} />

      {isFetchingNextPage && (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 border-2 border-[#FF3B5C] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!hasNextPage && videos.length > 0 && (
        <div className="text-center py-8 text-sm text-[#A3A3A3]">
          You've reached the end of the feed
        </div>
      )}
    </div>
  );
}