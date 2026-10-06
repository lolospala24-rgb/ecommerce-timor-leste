'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BadgeCheck, Store } from 'lucide-react';

interface SellerCardProps {
  sellerId: number;
  storeName: string;
  storeLogo?: string | null;
  isVerified?: boolean;
  municipality?: string | null;
}

export function SellerCard({ sellerId, storeName, storeLogo, isVerified, municipality }: SellerCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#DDE3DE] bg-white p-4">
      <Link
        href={`/sellers/${sellerId}`}
        className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E3F1E8] text-[#17703F]"
      >
        {storeLogo ? (
          <Image src={storeLogo} alt={storeName} fill className="object-cover" sizes="48px" />
        ) : (
          <Store className="h-5 w-5" />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Link href={`/sellers/${sellerId}`} className="truncate text-sm font-semibold text-[#142019]">
            {storeName}
          </Link>
          {isVerified && <BadgeCheck className="h-4 w-4 shrink-0 fill-[#17703F] text-white" />}
        </div>
        <p className="truncate text-xs text-[#56635B]">
          {isVerified ? 'Vendedor verifikadu' : 'Vendedor'}
          {municipality ? `, ${municipality}` : ''}
        </p>
      </div>
      <Link
        href={`/sellers/${sellerId}`}
        className="shrink-0 rounded-full border border-[#17703F] px-3.5 py-2 text-xs font-semibold text-[#17703F]"
      >
        Haree loja
      </Link>
    </div>
  );
}
