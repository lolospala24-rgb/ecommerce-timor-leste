'use client';

import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useTrendingSearches } from '@/hooks/useTrendingSearches';

interface PopularSearchChipsProps {
  /** See CategoryBanner's onNavigate — same "close the host overlay first" purpose. */
  onNavigate?: () => void;
}

export function PopularSearchChips({ onNavigate }: PopularSearchChipsProps = {}) {
  const { t } = useTranslation();
  const { data: trending } = useTrendingSearches(10);

  if (!trending || trending.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2.5 text-[15px] font-extrabold text-[#142019]">{t('category.popularSearchTitle')}</h3>
      <div className="flex flex-wrap gap-2">
        {trending.map((item) => (
          <Link
            key={item.term}
            href={`/products?q=${encodeURIComponent(item.term)}`}
            onClick={onNavigate}
            className="flex items-center gap-1.5 rounded-full border border-[#DDE3DE] bg-white px-3.5 py-2 text-[13px] font-medium text-[#142019]"
          >
            <TrendingUp className="h-3.5 w-3.5 text-[#17703F]" />
            {item.term}
          </Link>
        ))}
      </div>
    </div>
  );
}
