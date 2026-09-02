'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Loader2 } from 'lucide-react';

// SELLER accounts are let into this same admin shell for exactly one
// reason: My Store (logo/banner/store info) is real, fully built, and has
// nowhere else to live — there's no seller dashboard on the customer-facing
// frontend, only /seller/register. Every other page here (Products, Orders,
// Finance, Users, ...) is an admin-wide view with no seller-scoping logic
// behind it at all, so a seller must never be allowed to actually land on
// them — hence the redirect below, on top of Sidebar hiding those links
// for a SELLER in the first place (defense in depth: don't rely on the nav
// alone to keep a seller off a typed-in URL).
const SELLER_ALLOWED_PATHS = ['/my-store', '/profile'];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isLoading && isClient) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      if (user?.role !== 'ADMIN' && user?.role !== 'SELLER') {
        router.push('/unauthorized');
        return;
      }

      if (user?.role === 'SELLER' && !SELLER_ALLOWED_PATHS.some((p) => pathname?.startsWith(p))) {
        router.push('/my-store');
        return;
      }
    }
  }, [isAuthenticated, isLoading, router, user, isClient, pathname]);

  // Show loading state
  if (!isClient || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAllowedRole = user?.role === 'ADMIN' || user?.role === 'SELLER';
  const isSellerOnAllowedPath =
    user?.role !== 'SELLER' || SELLER_ALLOWED_PATHS.some((p) => pathname?.startsWith(p));

  // If not authenticated, not an allowed role, or a seller mid-redirect off
  // a page they shouldn't see, don't render — avoids a one-frame flash of
  // admin-only content before the effect above redirects.
  if (!isAuthenticated || !isAllowedRole || !isSellerOnAllowedPath) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50 print:block print:h-auto print:bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden print:overflow-visible print:block">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 print:overflow-visible print:h-auto print:p-0">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}