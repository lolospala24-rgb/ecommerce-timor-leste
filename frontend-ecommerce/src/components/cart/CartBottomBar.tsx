'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/lib/i18n/LanguageContext';

const GREEN_CHECKBOX_CLASS = 'checked:border-[#17703F] checked:bg-[#17703F] border-[#DDE3DE]';

interface CartBottomBarProps {
  allSelected: boolean;
  onToggleAll: (selected: boolean) => void;
  selectedTotal: number;
  savings: number;
  checkoutCount: number;
  onCheckout: () => void;
  className?: string;
}

export function CartBottomBar({
  allSelected,
  onToggleAll,
  selectedTotal,
  savings,
  checkoutCount,
  onCheckout,
  className,
}: CartBottomBarProps) {
  const { t } = useTranslation();
  const disabled = checkoutCount === 0;

  return (
    <div
      className={`border-t border-[#DDE3DE] bg-white px-4 py-3 ${className ?? ''}`}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-[720px] items-center gap-3">
        <Checkbox
          checked={allSelected}
          onCheckedChange={onToggleAll}
          aria-label={t('cart.selectAll')}
          className={GREEN_CHECKBOX_CLASS}
        />
        <span className="text-[13px] font-medium text-[#142019]">{t('cart.selectAll')}</span>

        <div className="ml-auto text-right">
          <p className="text-[19px] font-extrabold text-[#142019]">${selectedTotal.toFixed(2)}</p>
          {savings > 0 && <p className="text-[12px] font-semibold text-[#93330B]">{t('cart.savings', { amount: `$${savings.toFixed(2)}` })}</p>}
        </div>

        <button
          type="button"
          onClick={onCheckout}
          disabled={disabled}
          className="flex h-[50px] shrink-0 items-center justify-center rounded-2xl bg-[#17703F] px-6 text-[15px] font-bold text-white disabled:bg-[#DDE3DE] disabled:text-[#56635B]"
        >
          {t('cart.checkout', { count: checkoutCount })}
        </button>
      </div>
    </div>
  );
}
