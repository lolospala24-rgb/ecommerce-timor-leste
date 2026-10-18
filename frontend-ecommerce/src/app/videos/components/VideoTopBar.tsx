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
// the TikTok-style redesign. The desktop VideoSidebar (lg+) already covers
// tab switching there, including Trending, which this overlay deliberately
// leaves out to match the redesign exactly; it's still reachable via the
// sidebar on larger screens.
export function VideoTopBar({ active, onChange }: VideoTopBarProps) {
  const { t } = useTranslation();

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] lg:hidden"
      style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0))' }}
    >
      <Link href="/" aria-label="Home" className="pointer-events-auto shrink-0 text-white">
        <Store className="h-5 w-5" />
      </Link>

      <div className="pointer-events-auto flex min-w-0 items-center gap-4 text-sm">
        {/* Decorative only — there is no live-streaming feature behind this
            yet, so it's a label, not a button, to avoid promising a tap
            that does nothing. */}
        <span className="flex shrink-0 items-center gap-1 font-medium text-white/60">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          {t('video.live')}
        </span>

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

      <Link href="/search" aria-label={t('video.search')} className="pointer-events-auto shrink-0 text-white">
        <Search className="h-5 w-5" />
      </Link>
    </div>
  );
}
