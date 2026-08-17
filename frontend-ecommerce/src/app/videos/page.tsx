'use client';

import { ReactNode, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useVideos } from '@/hooks/useVideos';
import { useAuthStore } from '@/stores/authStore';
import { VideoFeed } from './components/VideoFeed';
import { VideoFeedTabs, FeedTab } from './components/VideoFeedTabs';
import { VideoSidebar } from './components/VideoSidebar';
import { VideoEmptyState } from './components/VideoEmptyState';
import { VideoErrorState } from './components/VideoErrorState';

const TAB_TO_FILTER: Record<FeedTab, 'latest' | 'trending' | 'following'> = {
  forYou: 'latest',
  trending: 'trending',
  following: 'following',
};

// The tab switcher lives in its own reserved strip — never overlaid on the
// video — so it can never collide with the creator header or caption at
// any breakpoint. Every state (loading/error/empty/loaded) renders through
// this shell so the tabs/sidebar stay usable and in a fixed spot
// regardless of what's happening below.
//
// The mobile/tablet tab strip and the desktop sidebar both drive the same
// `tab` state — below `lg` there's no room for a persistent sidebar, so
// the strip takes over; at `lg` and up the sidebar replaces it.
function VideoPageShell({ tab, onTabChange, children }: { tab: FeedTab; onTabChange: (tab: FeedTab) => void; children: ReactNode }) {
  return (
    <div className="flex h-full w-full">
      <VideoSidebar activeTab={tab} onTabChange={onTabChange} />
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-center py-3 lg:hidden">
          <VideoFeedTabs active={tab} onChange={onTabChange} />
        </div>
        <div className="relative min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

export default function VideoShoppingPage() {
  const [tab, setTab] = useState<FeedTab>('forYou');
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useVideos({
    filter: TAB_TO_FILTER[tab],
  });

  const videos = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

  if (isLoading) {
    return (
      <VideoPageShell tab={tab} onTabChange={setTab}>
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-300" />
        </div>
      </VideoPageShell>
    );
  }

  if (isError) {
    return (
      <VideoPageShell tab={tab} onTabChange={setTab}>
        <div className="flex h-full w-full items-center justify-center">
          <VideoErrorState onRetry={() => refetch()} />
        </div>
      </VideoPageShell>
    );
  }

  if (videos.length === 0) {
    const isFollowingTab = tab === 'following';
    return (
      <VideoPageShell tab={tab} onTabChange={setTab}>
        <div className="flex h-full w-full items-center justify-center">
          <VideoEmptyState
            title={isFollowingTab && !isAuthenticated ? 'Log in to see videos you follow' : undefined}
            description={
              isFollowingTab
                ? isAuthenticated
                  ? 'Follow sellers from any video to build your feed here.'
                  : 'Log in and follow your favorite sellers to see their videos here.'
                : undefined
            }
          />
        </div>
      </VideoPageShell>
    );
  }

  return (
    <VideoPageShell tab={tab} onTabChange={setTab}>
      <VideoFeed
        key={tab}
        videos={videos}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </VideoPageShell>
  );
}
