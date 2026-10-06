'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface SpecRow {
  label: string;
  value: string;
  href?: string;
}

interface ProductTabsProps {
  description: string | null | undefined;
  specChips: string[];
  specRows: SpecRow[];
  variantsTable?: ReactNode;
  totalReviews: number;
  reviewSummarySlot: ReactNode;
  reviewsSlot: ReactNode;
}

const TAB_TRIGGER_CLASS =
  'rounded-none border-b-[3px] border-transparent bg-transparent px-0.5 pb-2.5 pt-0 text-sm font-semibold text-[#56635B] shadow-none data-[state=active]:border-[#17703F] data-[state=active]:bg-transparent data-[state=active]:text-[#17703F] data-[state=active]:shadow-none';

export function ProductTabs({
  description,
  specChips,
  specRows,
  variantsTable,
  totalReviews,
  reviewSummarySlot,
  reviewsSlot,
}: ProductTabsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const canExpand = !!description && description.length > 220;

  return (
    <Tabs defaultValue="description" className="space-y-0">
      <TabsList className="h-auto w-full justify-start gap-6 rounded-none border-b border-[#EEF1EE] bg-transparent p-0">
        <TabsTrigger value="description" className={TAB_TRIGGER_CLASS}>
          Deskrisaun
        </TabsTrigger>
        <TabsTrigger value="specifications" className={TAB_TRIGGER_CLASS}>
          Espesifikasaun
        </TabsTrigger>
        <TabsTrigger value="reviews" className={TAB_TRIGGER_CLASS}>
          Review ({totalReviews})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="description" className="mt-5">
        <p
          className={cn(
            'text-[15px] leading-[1.6] text-[#2A3830]',
            !isExpanded && 'line-clamp-4',
          )}
        >
          {description || '—'}
        </p>
        {canExpand && (
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="mt-1 text-sm font-semibold text-[#17703F]"
          >
            {isExpanded ? 'Hatún' : 'Lee tan'}
          </button>
        )}

        {specChips.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-bold text-[#142019]">Ingrediente prinsipál</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {specChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-[#DDE3DE] bg-[#F4F6F3] px-3 py-1.5 text-xs font-medium text-[#2A3830]"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="specifications" className="mt-5">
        <dl className="divide-y divide-[#EEF1EE] rounded-xl border border-[#DDE3DE]">
          {specRows.map((row) => (
            <div key={row.label} className="grid grid-cols-2 gap-3 px-4 py-3">
              <dt className="text-sm text-[#56635B]">{row.label}</dt>
              <dd className="text-sm font-medium text-[#142019]">
                {row.href ? (
                  <Link href={row.href} className="text-[#17703F] hover:underline">
                    {row.value}
                  </Link>
                ) : (
                  row.value
                )}
              </dd>
            </div>
          ))}
        </dl>
        {variantsTable}
      </TabsContent>

      <TabsContent value="reviews" className="mt-5 space-y-5">
        {reviewSummarySlot}
        {reviewsSlot}
      </TabsContent>
    </Tabs>
  );
}
