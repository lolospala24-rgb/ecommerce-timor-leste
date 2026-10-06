'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronRight, Ticket } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useTranslation } from '@/lib/i18n/LanguageContext';

interface PromoRowProps {
  /** e.g. the applied coupon code — shown in place of the generic label
   *  when a coupon is already active. */
  summary?: string | null;
  /** The existing coupon input/apply/available-list UI, rendered inside
   *  the opened sheet — owned and passed in by the caller so this stays a
   *  pure presentational trigger, not a second copy of the coupon logic. */
  children: ReactNode;
}

export function PromoRow({ summary, children }: PromoRowProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex w-full min-h-11 items-center gap-3 rounded-2xl border border-[#DDE3DE] bg-white p-4 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FDEEE6] text-[#B4410F]">
          <Ticket className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#142019]">
          {summary || t('cart.promoLabel')}
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-[#56635B]" />
      </button>

      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="rounded-t-[28px]">
          <DrawerTitle className="sr-only">{t('cart.promoLabel')}</DrawerTitle>
          <div className="max-h-[75vh] overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2" data-lenis-prevent>
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
