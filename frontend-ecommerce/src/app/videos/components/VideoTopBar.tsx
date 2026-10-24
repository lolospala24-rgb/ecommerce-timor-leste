'use client';

import Link from 'next/link';
import { Store, Search } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { FeedTab } from './VideoFeedTabs';

interface VideoTopBarProps {
  active: FeedTab;
  onChange: (tab: FeedTab) => void;
}

// Mobile/tablet-only overlay nav (replaces the old reserved-strip
// VideoFeedTabs below `lg`) — floats directly on top of the video, matching
// the TikTok-style redesign. Mirrors the desktop VideoSidebar's (lg+) three
// tabs (Trending/ForYou/Following) in the same compact row.
export function VideoTopBar({ active, onChange }: VideoTopBarProps) {
  const { t } = useTranslation();

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] lg:hidden"
      style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0))' }}
    >
      {/* -ml-2 offsets the tap-target padding so the icon itself still
          lines up visually flush with the tab row's left edge. */}
      <Link
        href="/"
        aria-label="Home"
        className="pointer-events-auto -ml-2 flex h-9 w-9 shrink-0 items-center justify-center text-white transition active:scale-95"
      >
        <Store className="h-5 w-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
      </Link>

      <div className="pointer-events-auto flex min-w-0 items-center gap-4 text-sm">
        {/* Mobile's only way to reach the Trending filter — the desktop
            VideoSidebar already exposes it (see FEED_NAV there), but below
            `lg` there was previously no way to switch to it at all. */}
        <button
          type="button"
          onClick={() => onChange('trending')}
          aria-pressed={active === 'trending'}
          className={`relative shrink-0 pb-1 font-semibold transition-colors ${
            active === 'trending' ? 'text-white' : 'text-white/60'
          }`}
        >
          {t('video.tab.trending')}
          {active === 'trending' && (
            <span className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-white" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onChange('forYou')}
          aria-pressed={active === 'forYou'}
          className={`relative shrink-0 pb-1 font-semibold transition-colors ${
            active === 'forYou' ? 'text-white' : 'text-white/60'
          }`}
        >
          {t('video.tab.forYou')}
          {active === 'forYou' && (
            <span className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-white" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onChange('following')}
          aria-pressed={active === 'following'}
          className={`relative shrink-0 pb-1 font-semibold transition-colors ${
            active === 'following' ? 'text-white' : 'text-white/60'
          }`}
        >
          {t('video.tab.following')}
          {active === 'following' && (
            <span className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-white" />
          )}
        </button>
      </div>

      <Link
        href="/search"
        aria-label={t('video.search')}
        className="pointer-events-auto -mr-2 flex h-9 w-9 shrink-0 items-center justify-center text-white transition active:scale-95"
      >
        <Search className="h-5 w-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
      </Link>
    </div>
  );
}
