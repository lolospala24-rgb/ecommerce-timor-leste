'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Skeleton } from '@/components/ui/skeleton';
import { LogOut, Truck } from 'lucide-react';

// A working tool for couriers, not a shopping surface — deliberately its
// own minimal shell (no cart/search/footer, see ConditionalChrome) with a
// stricter guard than (account): CUSTOMER/SELLER/ADMIN accounts have no
// business here even if logged in, same as admin-panel's ADMIN-only login
// gate protects the staff side.
export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, hasHydrated, logout } = useAuthStore();

  useEffect(() => {
    // Same hydration wait as (account)/layout.tsx — without it, a logged-in
    // courier reloading a deep link like /driver/123 gets bounced through
    // /login and loses the deep link since the redirect target is only
    // known once we stop hardcoding it to /driver.
    if (!hasHydrated || isLoading) return;
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname || '/driver')}`);
      return;
    }
    if (user?.role !== 'COURIER') {
      router.push('/');
    }
  }, [hasHydrated, isAuthenticated, isLoading, pathname, user, router]);

  if (!hasHydrated || isLoading || !isAuthenticated || user?.role !== 'COURIER') {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-semibold leading-tight">{user.name}</p>
            <p className="text-xs text-muted-foreground leading-tight">Driver Portal</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-100"
        >
          <LogOut className="h-3.5 w-3.5" /> Logout
        </button>
      </header>
      <main className="mx-auto max-w-2xl p-4">{children}</main>
    </div>
  );
}
