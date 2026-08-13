import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/toaster';
import { ConditionalChrome } from '@/components/layout/ConditionalChrome';
import { MaintenanceGate } from '@/components/layout/MaintenanceGate';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'E-commerce Timor-Leste',
  description: 'Platform kompras online ba Timor-Leste',
  keywords: 'ecommerce, timor-leste, online shopping, kompras online',
  authors: [{ name: 'E-commerce Timor-Leste' }],
  openGraph: {
    title: 'E-commerce Timor-Leste',
    description: 'Platform kompras online ba Timor-Leste',
    url: 'https://ecommercetimor.com',
    siteName: 'E-commerce Timor-Leste',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
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