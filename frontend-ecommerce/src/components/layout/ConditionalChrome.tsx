'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Footer } from './Footer';

// The video-shopping feed (/videos) is a dedicated, full-viewport
// experience per its own design spec — no traditional storefront
// header/footer chrome. Every other route keeps the normal site shell.
export function ConditionalChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isVideoShopping = pathname?.startsWith('/videos');

  if (isVideoShopping) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
