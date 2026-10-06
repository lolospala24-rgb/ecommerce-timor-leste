'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { SelectableOptionCard } from './SelectableOptionCard';

interface AddressCardProps {
  address: any;
  selected: boolean;
  onSelect: () => void;
}

export function AddressCard({ address, selected, onSelect }: AddressCardProps) {
  const { t } = useTranslation();
  const fallbackLabel = t('checkout.address.fallbackLabel');

  return (
    <SelectableOptionCard
      selected={selected}
      onClick={onSelect}
      ariaLabel={address.label || fallbackLabel}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-[15px] font-bold text-[#142019]">{address.recipientName || address.label || fallbackLabel}</p>
          {(address.label || address.isPrimary) && (
            <span className="rounded-full bg-[#E3F1E8] px-2 py-0.5 text-[11px] font-semibold text-[#0F5530]">
              {address.label || t('checkout.address.default')}
            </span>
          )}
        </div>
        <Link
          href={`/account/addresses/${address.id}/edit?redirect=/checkout`}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 text-[13px] font-semibold text-[#17703F]"
        >
          {t('checkout.address.edit')}
        </Link>
      </div>
      <p className="mt-1 text-[13px] text-[#56635B]">{address.phone}</p>
      <p className="mt-1 text-[13px] leading-5 text-[#2A3830]">
        {address.street ? `${address.street}, ` : ''}
        {address.village ? `${address.village}, ` : ''}
        {address.suco ? `${address.suco}, ` : ''}
        {address.postoAdmin ? `${address.postoAdmin}, ` : ''}
        {address.municipality}
      </p>
      {address.reference && (
        <p className="mt-1 text-[13px] text-[#56635B]">{t('checkout.address.reference', { reference: address.reference })}</p>
      )}
    </SelectableOptionCard>
  );
}
