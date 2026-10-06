'use client';

import { useTranslation } from '@/lib/i18n/LanguageContext';

interface CostBreakdownProps {
  subtotal: number;
  shippingCost: number;
  tax: number;
  serviceFee: number;
  sellerCount: number;
  discountAmount: number;
  couponCode?: string | null;
  walletCreditApplied: number;
  grandTotal: number;
  /** Sum of (originalPrice - price) × quantity across cart items — real
   *  per-product discount savings, independent of any coupon. */
  productSavings: number;
}

export function CostBreakdown({
  subtotal,
  shippingCost,
  tax,
  serviceFee,
  sellerCount,
  discountAmount,
  couponCode,
  walletCreditApplied,
  grandTotal,
  productSavings,
}: CostBreakdownProps) {
  const totalSavings = productSavings + discountAmount;
  const { t } = useTranslation();

  return (
    <div className="space-y-2.5 text-[14px]">
      <Row label={t('checkout.review.subtotalProducts')} value={`$${subtotal.toFixed(2)}`} />
      <Row label={t('checkout.review.shippingCost')} value={`$${shippingCost.toFixed(2)}`} />
      {tax > 0 && <Row label={t('checkout.summary.tax')} value={`$${tax.toFixed(2)}`} />}
      {serviceFee > 0 && (
        <Row
          label={sellerCount > 1 ? t('checkout.summary.serviceFeeSellers', { count: sellerCount }) : t('checkout.summary.serviceFee')}
          value={`$${serviceFee.toFixed(2)}`}
        />
      )}
      {discountAmount > 0 && couponCode && (
        <Row label={t('checkout.summary.coupon', { code: couponCode })} value={`-$${discountAmount.toFixed(2)}`} tone="green" />
      )}
      {walletCreditApplied > 0 && (
        <Row label={t('checkout.summary.walletCredit')} value={`-$${walletCreditApplied.toFixed(2)}`} tone="green" />
      )}

      <div className="h-px bg-[#EEF1EE]" />

      <div className="flex items-center justify-between pt-0.5">
        <span className="text-[16px] font-bold text-[#142019]">{t('checkout.summary.total')}</span>
        <span className="text-[22px] font-extrabold text-[#17703F]">${grandTotal.toFixed(2)}</span>
      </div>

      {totalSavings > 0 && (
        <div className="inline-flex items-center rounded-full bg-[#FDEEE6] px-2.5 py-1 text-[12px] font-semibold text-[#93330B]">
          {t('checkout.review.savings', { amount: `$${totalSavings.toFixed(2)}` })}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'green' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#56635B]">{label}</span>
      <span className={tone === 'green' ? 'font-medium text-[#17703F]' : 'font-medium text-[#142019]'}>{value}</span>
    </div>
  );
}
