'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Footer } from './Footer';

// The video-shopping feed (/videos) keeps the real site header — logo,
// search, cart, notifications, profile — so it still reads as part of the
// same storefront rather than a disconnected microsite. It drops the
// Footer and locks to the viewport height instead of the normal
// scrolling page shell: the feed manages its own internal scroll (one
// snapped video at a time), so letting the outer page scroll too would
// fight that and let the layout grow past the viewport.
export function ConditionalChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isVideoShopping = pathname?.startsWith('/videos');

  if (isVideoShopping) {
    return (
      <div className="flex h-[100dvh] flex-col overflow-hidden">
        <Header />
        <main className="min-h-0 flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
