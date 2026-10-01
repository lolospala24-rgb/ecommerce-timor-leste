'use client';

import Link from 'next/link';
import { usePublicSettings } from '@/hooks/usePublicSettings';

// Checkout-only footer — the full storefront Footer (brand column, social
// links, newsletter, sitemap) is pure distraction on a page whose only job
// is getting the shopper to Place Order. Keeps just what's actually needed
// here: attribution + the two legal links already referenced by the Terms
// checkbox above, plus a Help link for a shopper stuck mid-checkout.
export function CompactFooter() {
  const currentYear = new Date().getFullYear();
  const { data: settings } = usePublicSettings();
  const siteName = settings?.siteName || 'Lolospala';

  return (
    <footer className="border-t bg-muted/30">
      <div className="container-custom flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted-foreground sm:flex-row">
        <p>
          &copy; {currentYear} {siteName} · Timor-Leste Marketplace
        </p>
        <nav className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-primary">
            Terms & Conditions
          </Link>
          <Link href="/privacy" className="hover:text-primary">
            Privacy Policy
          </Link>
          <Link href="/help" className="hover:text-primary">
            Help
          </Link>
        </nav>
      </div>
    </footer>
  );
}
