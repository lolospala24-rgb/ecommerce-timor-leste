'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Heart, History, Star, Settings as SettingsIcon, Gift, LogOut, HelpCircle, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useAddresses } from '@/hooks/useAddresses';
import { useWishlistStore } from '@/stores/wishlistStore';
import { useUserReviews } from '@/hooks/useReviews';
import { ProfileHeaderCard } from './ProfileHeaderCard';
import { OrderStatusStrip } from './OrderStatusStrip';
import { WalletReferralTiles } from './WalletReferralTiles';
import { SettingsGroup } from './SettingsGroup';
import { MenuRow } from './MenuRow';
import { LogoutSheet } from './LogoutSheet';
import pkg from '../../../package.json';

// The body of the "Konta" hub — shared by the mobile hub screen
// (app/(account)/account/page.tsx) and the desktop/tablet left pane
// (AccountLayout), so both stay in sync automatically.
export function AccountHubContent() {
  const { user } = useAuthStore();
  const { addresses } = useAddresses();
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const { data: reviewsData } = useUserReviews({ page: 1, limit: 1 });
  const [logoutOpen, setLogoutOpen] = useState(false);

  if (!user) return null;

  const addressCount = addresses?.length ?? 0;
  const reviewCount = reviewsData?.pagination?.total ?? 0;

  return (
    <div className="space-y-5">
      <ProfileHeaderCard user={user} />

      <div className="rounded-2xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-foreground">Ha&apos;u-nia order</p>
          <Link href="/account/orders" className="flex items-center gap-0.5 text-xs font-semibold text-primary">
            Haree hotu
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <OrderStatusStrip />
      </div>

      <WalletReferralTiles />

      <SettingsGroup label="SOSA">
        <MenuRow icon={MapPin} title="Enderesu" subtitle={`${addressCount} enderesu rai ona`} href="/account/addresses" />
        <MenuRow icon={Heart} title="Lista hakarak" subtitle={`${wishlistCount} produtu`} href="/account/wishlist" />
        <MenuRow icon={History} title="Haree foin dadaun" href="/account/recently-viewed" />
        <MenuRow icon={Star} title="Ha'u-nia review" subtitle={`${reviewCount} review ona`} href="/account/reviews" />
      </SettingsGroup>

      <SettingsGroup label="SELUK">
        <MenuRow icon={Gift} iconClassName="bg-warning/15 text-warning-foreground" title="Konvida belun" href="/account/referrals" />
        <MenuRow icon={SettingsIcon} title="Konfigurasaun" href="/account/settings" />
        <MenuRow icon={HelpCircle} title="Ajuda & apoiu" href="/help" />
      </SettingsGroup>

      <button
        type="button"
        onClick={() => setLogoutOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-card px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/5"
      >
        <LogOut className="h-4 w-4" />
        Sai husi konta
      </button>

      <p className="pb-2 text-center text-xs text-muted-foreground">Lolóspala versaun {pkg.version}</p>

      <LogoutSheet open={logoutOpen} onOpenChange={setLogoutOpen} />
    </div>
  );
}
