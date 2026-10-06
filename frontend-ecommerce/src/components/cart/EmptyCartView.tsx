'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/LanguageContext';

export function EmptyCartView() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="relative flex h-[148px] w-[148px] items-center justify-center rounded-full bg-[#E3F1E8]">
        <ShoppingCart className="h-16 w-16 text-[#17703F]" strokeWidth={1.5} />
        <span className="absolute -top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#B4410F] text-xs font-bold text-white">
          0
        </span>
      </div>
      <h2 className="mt-6 text-[22px] font-extrabold text-[#142019]">{t('cart.emptyTitle')}</h2>
      <p className="mt-2 max-w-xs text-[15px] text-[#56635B]">{t('cart.emptyBody')}</p>
      <Link
        href="/"
        className="mt-6 flex h-[52px] w-full max-w-xs items-center justify-center rounded-2xl bg-[#17703F] px-8 text-[15px] font-bold text-white"
      >
        {t('cart.emptyCta')}
      </Link>
      <Link href="/account/wishlist" className="mt-4 text-[14px] font-semibold text-[#17703F]">
        {t('cart.emptyWishlist')}
      </Link>
    </div>
  );
}
