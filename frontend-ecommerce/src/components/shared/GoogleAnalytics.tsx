'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

// Tracks route changes manually (send_page_view: false on init below) since
// the App Router doesn't fire full page loads on client-side navigation —
// gtag's automatic pageview-on-load would only ever see the very first URL.
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_ID || !window.gtag) return;
    const query = searchParams.toString();
    window.gtag('config', GA_ID, { page_path: query ? `${pathname}?${query}` : pathname });
  }, [pathname, searchParams]);

  return null;
}

// No-op with no measurement ID set — this repo ships with no Google
// Analytics property configured yet; set NEXT_PUBLIC_GA_MEASUREMENT_ID to
// turn tracking on, nothing else changes. Not gated behind a cookie-consent
// banner because this storefront doesn't have one yet — if that's added
// later, this component's mount should move behind it.
export function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      <Script strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { send_page_view: false });
        `}
      </Script>
      <PageviewTracker />
    </>
  );
}
