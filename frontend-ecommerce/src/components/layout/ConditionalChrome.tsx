'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Footer } from './Footer';
import { SupportChatWidget } from '@/components/shared/SupportChatWidget';

// The video-shopping feed (/videos) keeps the real site header — logo,
// search, cart, notifications, profile — so it still reads as part of the
// same storefront rather than a disconnected microsite. It drops the
// Footer and locks to the viewport height instead of the normal
// scrolling page shell: the feed manages its own internal scroll (one
// snapped video at a time), so letting the outer page scroll too would
// fight that and let the layout grow past the viewport.
const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];

export function ConditionalChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isVideoShopping = pathname?.startsWith('/videos');
  // Auth pages render their own minimal branded shell (see (auth)/layout.tsx)
  // instead of the full storefront Header/Footer — cart, search, and the
  // long footer link list are distractions on a sign-in/sign-up screen.
  const isAuthPage = AUTH_ROUTES.some((route) => pathname?.startsWith(route));
  // The driver portal is a working tool for couriers, not a shopping
  // surface — the cart/search/footer link list have no place there, and
  // it renders its own minimal shell (see (driver)/layout.tsx) instead.
  const isDriverPortal = pathname?.startsWith('/driver');

  if (isVideoShopping) {
    return (
      <div className="flex h-[100dvh] flex-col overflow-hidden">
        <Header />
        <main className="min-h-0 flex-1">{children}</main>
      </div>
    );
  }

  if (isAuthPage || isDriverPortal) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <SupportChatWidget />
    </div>
  );
}
