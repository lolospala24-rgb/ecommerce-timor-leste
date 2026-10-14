'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountHubContent } from '@/components/account/AccountHubContent';

// Matches the `md:` breakpoint (768px) already used everywhere else in
// this layout/app — kept as one real conditional (not a CSS-hidden
// duplicate) so `children` only ever mounts once at a time. Rendering it
// in two parallel branches would double every page's hooks/queries/sockets
// (e.g. orders' useOrderRealtime) whenever only one branch is CSS-hidden.
const DESKTOP_QUERY = '(min-width: 768px)';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false); // SSR-safe default: mobile first
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    setIsDesktop(mql.matches);
    const listener = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, []);
  return isDesktop;
}

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, hasHydrated } = useAuthStore();
  const isDesktop = useIsDesktop();

  useEffect(() => {
    // Wait for the persisted session to load before judging auth state —
    // otherwise every account page bounces an already-logged-in user out to
    // /login for a single frame. Redirect target defaults to the hub, not a
    // specific sub-page, since that's the new landing screen.
    if (hasHydrated && !isLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname || '/account')}`);
    }
  }, [hasHydrated, isAuthenticated, isLoading, pathname, router]);

  if (!hasHydrated || isLoading) {
    return (
      <div className="container-custom py-4 md:py-8">
        <div className="grid gap-8 md:grid-cols-[360px_1fr]">
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
          <div className="hidden md:block">
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const isHubRoute = pathname === '/account';

  if (!isDesktop) {
    // Mobile: every route is its own full-height pushed screen — the hub
    // (/account) supplies its own header, every other page uses
    // AccountAppBar for its back button. No shared chrome here.
    return <div className="container-custom py-4">{children}</div>;
  }

  // Desktop/tablet: persistent left pane reusing the same hub content as
  // mobile, selected section on the right. Visiting the hub route itself
  // would otherwise show the hub twice (nav pane + main pane) — the main
  // pane shows a "pick something" placeholder there instead.
  return (
    <div className="container-custom py-8">
      <div className="grid gap-8 md:grid-cols-[360px_1fr] md:items-start">
        <aside className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl border bg-card p-4">
          <AccountHubContent />
        </aside>
        <main className="min-w-0">
          {isHubRoute ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
              Hili menu iha karuk atu hahu.
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
