'use client';

import { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePublicSettings } from '@/hooks/usePublicSettings';

// Auth pages (login/register/forgot-password/reset-password) intentionally
// skip the full site Header/Footer (see ConditionalChrome) — the cart,
// search bar, and long footer link list are noise on a page whose only
// job is to get the person signed in. This gives them their own minimal,
// branded shell instead: real logo/site name (admin-editable, matching
// the Header), a centered card, and a way back to the storefront.
export default function AuthLayout({ children }: { children: ReactNode }) {
  const { data: publicSettings } = usePublicSettings();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-primary/[0.06] via-background to-background px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
      />

      <Link href="/" className="relative z-10 mb-8 flex items-center gap-2.5">
        {publicSettings?.logoUrl ? (
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl shadow-sm">
            <Image
              src={publicSettings.logoUrl}
              alt={publicSettings.siteName}
              fill
              sizes="40px"
              className="object-contain"
            />
          </div>
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm">
            <span className="text-lg font-bold text-primary-foreground">
              {(publicSettings?.siteName || 'E').charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <span className="text-xl font-bold tracking-tight">
          {publicSettings?.siteName || 'E-Commerce'}
        </span>
      </Link>

      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
