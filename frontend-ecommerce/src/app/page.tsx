import { HomePageClient } from '@/components/home/HomePageClient';
import type { Metadata } from 'next';

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'E-commerce Timor-Leste';
const siteDescription =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
  'Platform kompras online ba Timor-Leste — shop electronics, fashion, local products and more with fast delivery across Timor-Leste.';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ecommercetimor.com';

export const metadata: Metadata = {
  title: `${siteName} | Online Shopping in Timor-Leste`,
  description: siteDescription,
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: `${siteName} | Online Shopping in Timor-Leste`,
    description: siteDescription,
    url: siteUrl,
    siteName,
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
};

export default function HomePage() {
  return <HomePageClient />;
}