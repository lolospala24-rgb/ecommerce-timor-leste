'use client';

import Link from 'next/link';
import {
  Compass,
  Users,
  TrendingUp,
  LayoutGrid,
  Smartphone,
  Shirt,
  Home,
  HeartPulse,
  Dumbbell,
  Car,
  BookOpen,
  Blocks,
  MapPin,
  Package,
  type LucideIcon,
} from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import type { Category } from '@/types/category.types';
import { FeedTab } from './VideoFeedTabs';

const FEED_NAV: { id: FeedTab; label: string; icon: LucideIcon }[] = [
  { id: 'forYou', label: 'For You', icon: Compass },
  { id: 'following', label: 'Following', icon: Users },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
];

// Purely presentational — matched by keyword against the real category
// name so the list still reads as "iconography," not fabricated data.
// Anything unmatched falls back to a generic package icon.
const CATEGORY_ICONS: { match: RegExp; icon: LucideIcon }[] = [
  { match: /electronic/i, icon: Smartphone },
  { match: /fashion|cloth|apparel/i, icon: Shirt },
  { match: /home|living|furniture/i, icon: Home },
  { match: /health|beauty/i, icon: HeartPulse },
  { match: /sport/i, icon: Dumbbell },
  { match: /auto|vehicle/i, icon: Car },
  { match: /book|station/i, icon: BookOpen },
  { match: /toy|game/i, icon: Blocks },
  { match: /local/i, icon: MapPin },
];

function iconForCategory(name: string): LucideIcon {
  return CATEGORY_ICONS.find((entry) => entry.match.test(name))?.icon ?? Package;
}

const FOOTER_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/help', label: 'Help Center' },
  { href: '/contact', label: 'Contact' },
];

interface VideoSidebarProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
}

// Desktop-only rail (lg+) alongside the video feed — For You/Following/
// Trending drive the same feed filter as the mobile tab strip in
// VideoFeedTabs, and Categories link out to the real storefront category
// pages (the video feed itself has no working category filter server-side,
// so this deliberately routes to browsing products rather than faking a
// filter that wouldn't do anything).
export function VideoSidebar({ activeTab, onTabChange }: VideoSidebarProps) {
  const { data: categoriesResponse } = useCategories({ limit: 12 });
  const categories = ((categoriesResponse?.data as Category[]) ?? []).filter((c) => c.isActive !== false);

  return (
    <aside className="hidden h-full w-56 shrink-0 flex-col overflow-y-auto border-r border-neutral-200 bg-white px-3 py-4 lg:flex">
      <nav className="space-y-1">
        {FEED_NAV.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              aria-pressed={active}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-primary' : 'text-neutral-400'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="my-4 border-t border-neutral-100" />

      <div className="flex items-center justify-between px-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Categories</span>
      </div>

      <nav className="mt-1 space-y-0.5">
        <Link
          href="/categories"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        >
          <LayoutGrid className="h-[18px] w-[18px] shrink-0 text-neutral-400" />
          All Categories
        </Link>
        {categories.map((category) => {
          const Icon = iconForCategory(category.name);
          return (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              <Icon className="h-[18px] w-[18px] shrink-0 text-neutral-400" />
              <span className="truncate">{category.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 pt-6">
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 text-xs text-neutral-400">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-neutral-600">
              {link.label}
            </Link>
          ))}
        </div>
        <p className="px-3 text-xs text-neutral-300">© {new Date().getFullYear()} E-Commerce</p>
      </div>
    </aside>
  );
}
