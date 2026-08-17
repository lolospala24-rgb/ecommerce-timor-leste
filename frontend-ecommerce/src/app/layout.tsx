import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/toaster';
import { ConditionalChrome } from '@/components/layout/ConditionalChrome';
import { MaintenanceGate } from '@/components/layout/MaintenanceGate';

const inter = Inter({ subsets: ['latin'] });

const DEFAULT_SITE_NAME = 'E-commerce Timor-Leste';
const DEFAULT_DESCRIPTION = 'Platform kompras online ba Timor-Leste';

// Server-side fetch (not the client `api` instance, which assumes a
// browser) so the browser tab's title/favicon reflect whatever the admin
// set in Settings → General on the very first response, not a client-side
// swap after hydration. Cached for 5 minutes — this barely changes and
// every request re-fetching it would be wasted load on the backend.
async function getPublicSettings(): Promise<{ siteName?: string; siteDescription?: string; logoUrl?: string | null; faviconUrl?: string | null } | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl}/api/v1/settings/public`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.data ?? json?.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  const siteName = settings?.siteName || DEFAULT_SITE_NAME;
  const description = settings?.siteDescription || DEFAULT_DESCRIPTION;

  return {
    title: siteName,
    description,
    keywords: 'ecommerce, timor-leste, online shopping, kompras online',
    authors: [{ name: siteName }],
    icons: {
      icon: settings?.faviconUrl || '/favicon.ico',
    },
    openGraph: {
      title: siteName,
      description,
      url: 'https://ecommercetimor.com',
      siteName,
      images: [
        {
          url: 'https://ecommercetimor.com/og-image.jpg',
          width: 1200,
          height: 630,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Favicon comes from generateMetadata()'s `icons` field above
            (real or default), not a static link here — a second one would
            just conflict with it. */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>
        <Providers>
          <MaintenanceGate>
            <ConditionalChrome>{children}</ConditionalChrome>
          </MaintenanceGate>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#333',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                borderRadius: '8px',
                padding: '16px',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}