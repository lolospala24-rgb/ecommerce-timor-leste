'use client';

import { motion } from 'framer-motion';

export type FeedTab = 'forYou' | 'following' | 'trending';

const TABS: { id: FeedTab; label: string }[] = [
  { id: 'following', label: 'Following' },
  { id: 'forYou', label: 'For You' },
  { id: 'trending', label: 'Trending' },
];

interface VideoFeedTabsProps {
  active: FeedTab;
  onChange: (tab: FeedTab) => void;
}

// Rendered inside its own reserved strip by the caller (see page.tsx) —
// never overlaid directly on the video, so it can never collide with the
// creator header or caption regardless of card width or breakpoint.
export function VideoFeedTabs({ active, onChange }: VideoFeedTabsProps) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-neutral-100 p-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-pressed={active === tab.id}
          className="relative rounded-full px-3.5 py-1.5 text-sm font-semibold text-neutral-500 transition-colors hover:text-neutral-900"
        >
          {active === tab.id && (
            <motion.span
              layoutId="video-feed-tab-pill"
              className="absolute inset-0 rounded-full bg-white shadow-sm"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className={`relative ${active === tab.id ? 'text-neutral-900' : ''}`}>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
