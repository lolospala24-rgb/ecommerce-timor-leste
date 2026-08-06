'use client';

import { VideoLayout } from './components/layout/VideoLayout';
import { FeedSkeleton } from './components/share/SkeletonLoader';

/**
 * Video Shop Loading State
 * 
 * Displays skeleton loaders while the page is loading.
 * Uses the same layout structure to prevent layout shift.
 */
export default function VideoShopLoading() {
  return (
    <VideoLayout>
      <FeedSkeleton viewMode="grid" />
    </VideoLayout>
  );
}