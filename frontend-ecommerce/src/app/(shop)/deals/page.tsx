'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePublicCoupons, type PublicCoupon } from '@/hooks/useCoupons';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { copyToClipboard } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { Tag, Copy, Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function DealsPage() {
  const { t } = useTranslation();
  const { data: coupons, isLoading } = usePublicCoupons();

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 text-center md:p-12">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Tag className="h-6 w-6 text-primary" />
        </div>
        <h1 className="mt-4 text-3xl font-bold md:text-4xl">{t('deals.title')}</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{t('deals.subtitle')}</p>
      </section>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : !coupons || coupons.length === 0 ? (
        <EmptyState
          title={t('deals.empty.title')}
          description={t('deals.empty.description')}
          icon={<Tag className="h-10 w-10 text-muted-foreground" />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.map((coupon) => (
            <DealCard key={coupon.code} coupon={coupon} />
          ))}
        </div>
      )}

      <div className="flex justify-center pt-2">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
        >
          {t('deals.browseProducts')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function DealCard({ coupon }: { coupon: PublicCoupon }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(coupon.code);
    if (ok) {
      setCopied(true);
      toast.success(t('deals.copied'));
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error(t('deals.copyFailed'));
    }
  };

  const discountLabel =
    coupon.discountType === 'PERCENTAGE'
      ? `${coupon.discountValue}% ${t('deals.off')}`
      : `$${coupon.discountValue.toFixed(2)} ${t('deals.off')}`;

  return (
    <Card className="overflow-hidden border-dashed">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Tag className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-primary">{discountLabel}</p>
            {coupon.maxDiscountAmount != null && coupon.discountType === 'PERCENTAGE' && (
              <p className="text-xs text-muted-foreground">
                {t('deals.upTo')} ${coupon.maxDiscountAmount.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {coupon.description && (
          <p className="mt-3 text-sm text-muted-foreground">{coupon.description}</p>
        )}

        {coupon.minPurchaseAmount != null && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t('deals.minPurchase')} ${coupon.minPurchaseAmount.toFixed(2)}
          </p>
        )}

        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'mt-4 flex w-full items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2.5 text-left transition-colors',
            copied ? 'border-green-500/50 bg-green-50' : 'border-primary/30 bg-primary/5 hover:bg-primary/10',
          )}
        >
          <span className="font-mono text-sm font-semibold tracking-wide">{coupon.code}</span>
          {copied ? (
            <span className="flex items-center gap-1 text-xs font-medium text-green-600">
              <Check className="h-3.5 w-3.5" />
              {t('deals.copied')}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium text-primary">
              <Copy className="h-3.5 w-3.5" />
              {t('deals.copyCode')}
            </span>
          )}
        </button>
      </CardContent>
    </Card>
  );
}
