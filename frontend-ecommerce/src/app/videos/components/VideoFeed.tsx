'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Video } from '@/types/video';
import { VideoFeedItem } from './VideoFeedItem';
import { VideoNavigationControls } from './VideoNavigationControls';
import { VideoRightPanel } from './VideoRightPanel';
import { VideoSkeleton } from './VideoSkeleton';

interface VideoFeedProps {
  videos: Video[];
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage: () => void;
  initialVideoId?: number;
}

// A window of `size` indexes centered on `active`, clamped to
// [0, total). Used by the position-dots indicator below — with infinite
// scroll, `total` can grow into the hundreds, so it shows a scrolling
// window around the current video rather than one dot per loaded item.
function windowedIndexes(active: number, total: number, size: number): number[] {
  if (total <= size) return Array.from({ length: total }, (_, i) => i);
  let start = active - Math.floor(size / 2);
  start = Math.max(0, Math.min(start, total - size));
  return Array.from({ length: size }, (_, i) => start + i);
}

export function VideoFeed({ videos, hasNextPage, isFetchingNextPage, fetchNextPage, initialVideoId }: VideoFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [activeId, setActiveId] = useState<number | null>(videos[0]?.id ?? null);
  const hasScrolledToInitial = useRef(false);

  // Scroll to the deep-linked video once, the first time it appears in the list.
  useEffect(() => {
    if (hasScrolledToInitial.current || !initialVideoId) return;
    const el = itemRefs.current.get(initialVideoId);
    if (el) {
      hasScrolledToInitial.current = true;
      el.scrollIntoView({ block: 'center' });
      setActiveId(initialVideoId);
    }
  }, [videos, initialVideoId]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let best: { id: number; ratio: number } | null = null;
        for (const entry of entries) {
          const id = Number((entry.target as HTMLElement).dataset.videoId);
          if (entry.isIntersecting && (!best || entry.intersectionRatio > best.ratio)) {
            best = { id, ratio: entry.intersectionRatio };
          }
        }
        if (best && best.ratio > 0.5) {
          setActiveId(best.id);
        }
      },
      { root, threshold: [0.5, 0.6, 0.75, 0.9] },
    );

    itemRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [videos]);

  // Load the next page a little before the user hits the last loaded video.
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || videos.length === 0) return;
    const threshold = videos[Math.max(0, videos.length - 2)]?.id;
    if (activeId === threshold) {
      fetchNextPage();
    }
  }, [activeId, videos, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const scrollToOffset = useCallback(
    (offset: number) => {
      const index = videos.findIndex((v) => v.id === activeId);
      if (index === -1) return;
      const target = videos[index + offset];
      if (!target) return;
      itemRefs.current.get(target.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    [videos, activeId],
  );

  const scrollToVideoId = useCallback((id: number) => {
    itemRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        scrollToOffset(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollToOffset(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollToOffset]);

  const activeIndex = videos.findIndex((v) => v.id === activeId);
  const activeVideo = activeIndex >= 0 ? videos[activeIndex] : null;
  const upNext = useMemo(
    () => (activeIndex >= 0 ? videos.slice(activeIndex + 1, activeIndex + 4) : []),
    [videos, activeIndex],
  );

  return (
    <div className="flex h-full w-full items-stretch justify-center">
      <div className="relative flex h-full flex-1 items-center justify-center gap-6">
        <div
          ref={containerRef}
          className="h-full w-full snap-y snap-mandatory overflow-y-scroll scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {videos.map((video) => (
            <VideoFeedItem
              key={video.id}
              video={video}
              isActive={video.id === activeId}
              ref={(el) => {
                if (el) itemRefs.current.set(video.id, el);
                else itemRefs.current.delete(video.id);
              }}
            />
          ))}
          {isFetchingNextPage && <VideoSkeleton />}
        </div>

        <div className="absolute right-2 top-1/2 -translate-y-1/2 lg:right-4">
          <VideoNavigationControls
            onPrevious={() => scrollToOffset(-1)}
            onNext={() => scrollToOffset(1)}
            canGoPrevious={activeIndex > 0}
            canGoNext={activeIndex >= 0 && activeIndex < videos.length - 1}
          />
        </div>

        {activeIndex >= 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-1 hidden justify-center lg:flex">
            <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-2 shadow-sm backdrop-blur">
              {windowedIndexes(activeIndex, videos.length, 7).map((index) => (
                <button
                  key={videos[index].id}
                  type="button"
                  onClick={() => scrollToVideoId(videos[index].id)}
                  aria-label={`Go to video ${index + 1}`}
                  aria-current={index === activeIndex}
                  className={`h-1.5 rounded-full transition-all ${
                    index === activeIndex ? 'w-5 bg-primary' : 'w-1.5 bg-neutral-300 hover:bg-neutral-400'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {activeVideo && (
        <VideoRightPanel video={activeVideo} upNext={upNext} onSelectUpNext={scrollToVideoId} />
      )}
    </div>
  );
}
