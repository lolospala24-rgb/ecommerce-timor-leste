import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/toaster';
import { ConditionalChrome } from '@/components/layout/ConditionalChrome';
import { MaintenanceGate } from '@/components/layout/MaintenanceGate';

const inter = Inter({ subsets: ['latin'] });

const DEFAULT_SITE_NAME = 'E-commerce Timor-Leste';
const DEFAULT_DESCRIPTION = 'Platform kompras online ba Timor-Leste';

const DEVELOPER = {
  name: 'Grigorio Guterres Gusmao',
  role: 'Founder & Full Stack Developer',
  url: 'https://github.com/GrigorioGuterres',
  email: 'guterresgusmaogrigorio@gmail.com',
};

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
    authors: [{ name: DEVELOPER.name, url: DEVELOPER.url }],
    creator: DEVELOPER.name,
    icons: {
      icon: settings?.faviconUrl || '/favicon.ico',
    },
    // Renders <meta name="google-site-verification" content="..."> only
    // once the env var is set — no broken empty tag ships before then. Set
    // this after adding the site as a Search Console property (HTML tag
    // verification method) and redeploy; no other code change needed.
    verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : undefined,
    openGraph: {
      title: siteName,
      description,
      url: 'https://lolospala.com',
      siteName,
      images: [
        {
          url: 'https://lolospala.com/og-image.jpg',
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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: DEFAULT_SITE_NAME,
    url: 'https://lolospala.com',
    author: {
      '@type': 'Person',
      name: DEVELOPER.name,
      jobTitle: DEVELOPER.role,
      url: DEVELOPER.url,
      email: DEVELOPER.email,
    },
    creator: {
      '@type': 'Person',
      name: DEVELOPER.name,
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Favicon comes from generateMetadata()'s `icons` field above
            (real or default), not a static link here — a second one would
            just conflict with it. */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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