'use client';

import { useState } from 'react';
import { Flame, Hourglass, RotateCcw } from 'lucide-react';
import { useFlashSaleActive, useFlashSaleUpcoming, type FlashSaleResponse } from '@/hooks/useFlashSale';
import { useCountdown } from '@/hooks/useCountdown';
import { FlashSaleProductCard } from '@/components/home/FlashSaleProductCard';
import { ProductGridSkeleton } from '@/components/products/ProductGridSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Pagination } from '@/components/shared/Pagination';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { UseQueryResult } from '@tanstack/react-query';

const PAGE_SIZE = 18;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function CountdownChip({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 font-mono text-base font-bold tabular-nums text-white sm:h-12 sm:w-12 sm:text-lg">
        {pad(value)}
      </div>
      <span className="mt-1 text-[10px] uppercase tracking-wide text-white/70">{label}</span>
    </div>
  );
}

interface TabPanelProps {
  tab: 'active' | 'upcoming';
  query: UseQueryResult<FlashSaleResponse>;
  category?: string;
  onCategoryChange: (slug: string | undefined) => void;
  onPageChange: (page: number) => void;
}

// One panel shape for both tabs — active vs. upcoming only changes which
// query feeds it, the countdown's target/label, and what the card shows at
// the bottom (real stock/sold vs. a real start time). Kept as one component
// rather than two near-identical ones so the countdown/category/grid/empty/
// error logic exists exactly once.
function FlashSaleTabPanel({ tab, query, category, onCategoryChange, onPageChange }: TabPanelProps) {
  const { data, isLoading, isError, refetch } = query;
  const countdownTarget = tab === 'active' ? data?.endsAt : data?.startsAt;
  const countdown = useCountdown(countdownTarget);

  if (isLoading) {
    return <ProductGridSkeleton count={12} />;
  }

  if (isError) {
    return (
      <EmptyState
        title="Tidak dapat memuat Flash Sale."
        icon={<RotateCcw className="h-10 w-10 text-muted-foreground" />}
        action={{ label: 'Coba Lagi', onClick: () => refetch() }}
      />
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <EmptyState
        title={tab === 'active' ? 'Belum Ada Flash Sale' : 'Belum Ada Flash Sale Mendatang'}
        description={
          tab === 'active'
            ? 'Saat ini belum ada Flash Sale yang sedang berlangsung. Silakan cek kembali nanti.'
            : 'Belum ada Flash Sale yang dijadwalkan.'
        }
        icon={
          tab === 'active' ? (
            <Flame className="h-10 w-10 text-muted-foreground" />
          ) : (
            <Hourglass className="h-10 w-10 text-muted-foreground" />
          )
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Campaign countdown — real startAt/endAt from the backend, ticking
          client-side; never a hardcoded time. */}
      {countdown && !countdown.expired && (
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-white">
              {tab === 'active' ? <Flame className="h-5 w-5" /> : <Hourglass className="h-5 w-5" />}
              <span className="font-semibold">{tab === 'active' ? 'Berakhir dalam' : 'Mulai dalam'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CountdownChip value={countdown.hours} label="Jam" />
              <span className="pb-4 text-lg font-bold text-white/70">:</span>
              <CountdownChip value={countdown.minutes} label="Menit" />
              <span className="pb-4 text-lg font-bold text-white/70">:</span>
              <CountdownChip value={countdown.seconds} label="Detik" />
            </div>
          </div>
        </div>
      )}

      {/* Category pills — only categories genuinely represented among this
          tab's products right now, never the full marketplace category
          list. "Semua" is always available. */}
      {data.categories.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" data-lenis-prevent>
          <button
            type="button"
            onClick={() => onCategoryChange(undefined)}
            className={cn(
              'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              !category
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            Semua
          </button>
          {data.categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => onCategoryChange(c.slug)}
              className={cn(
                'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                category === c.slug
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-6">
        {data.data.map((product, index) => (
          <FlashSaleProductCard
            key={product.id}
            product={product}
            priority={index < 4}
            upcomingStartAt={tab === 'upcoming' ? (product.promotion?.startAt ?? null) : null}
          />
        ))}
      </div>

      {data.pagination.totalPages > 1 && (
        <Pagination
          currentPage={data.pagination.page}
          totalPages={data.pagination.totalPages}
          totalItems={data.pagination.total}
          pageSize={data.pagination.limit}
          onPageChange={onPageChange}
          showTotal={false}
        />
      )}
    </div>
  );
}

export function FlashSalePageContent() {
  const [tab, setTab] = useState<'active' | 'upcoming'>('active');
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const [upcomingCategory, setUpcomingCategory] = useState<string | undefined>(undefined);
  const [activePage, setActivePage] = useState(1);
  const [upcomingPage, setUpcomingPage] = useState(1);

  const activeQuery = useFlashSaleActive({ page: activePage, limit: PAGE_SIZE, category: activeCategory });
  const upcomingQuery = useFlashSaleUpcoming({ page: upcomingPage, limit: PAGE_SIZE, category: upcomingCategory });

  const handleActiveCategoryChange = (slug: string | undefined) => {
    setActiveCategory(slug);
    setActivePage(1);
  };
  const handleUpcomingCategoryChange = (slug: string | undefined) => {
    setUpcomingCategory(slug);
    setUpcomingPage(1);
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Header — compact, no oversized hero pushing the grid down. */}
      <div className="flex items-center gap-2.5">
        <Flame className="h-6 w-6 shrink-0 text-red-600" />
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Flash Sale</h1>
          <p className="text-sm text-muted-foreground">Nikmati harga spesial dengan stok terbatas.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'active' | 'upcoming')}>
        <TabsList>
          <TabsTrigger value="active">Sedang Berlangsung</TabsTrigger>
          <TabsTrigger value="upcoming">Akan Datang</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-5">
          <FlashSaleTabPanel
            tab="active"
            query={activeQuery}
            category={activeCategory}
            onCategoryChange={handleActiveCategoryChange}
            onPageChange={setActivePage}
          />
        </TabsContent>

        <TabsContent value="upcoming" className="mt-5">
          <FlashSaleTabPanel
            tab="upcoming"
            query={upcomingQuery}
            category={upcomingCategory}
            onCategoryChange={handleUpcomingCategoryChange}
            onPageChange={setUpcomingPage}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
