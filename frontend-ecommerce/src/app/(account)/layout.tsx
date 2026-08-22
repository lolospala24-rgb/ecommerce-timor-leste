'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/formatters';
import {
  User,
  ShoppingBag,
  MapPin,
  Heart,
  Star,
  Settings,
  LogOut,
} from 'lucide-react';

const menuItems = [
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/orders', label: 'My Orders', icon: ShoppingBag },
  { href: '/addresses', label: 'Addresses', icon: MapPin },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/reviews', label: 'My Reviews', icon: Star },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/account/profile');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="container-custom py-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1 space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="md:col-span-3">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const initials = getInitials(user.name);
  const isActive = (href: string) => {
    const full = `/account${href}`;
    return pathname === full || pathname?.startsWith(`${full}/`);
  };

  return (
    <div className="container-custom py-4 md:py-8">
      {/* Mobile: compact identity bar + horizontal scrollable pill nav.
          A full sidebar dump above the content (the old behavior) forced
          mobile users to scroll past a profile card and 6 menu links before
          ever seeing the page they navigated to. */}
      <div className="md:hidden -mx-4 mb-4 border-b bg-card px-4 pb-3 pt-1">
        <div className="flex items-center gap-3 py-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <span className="text-base font-bold text-primary">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          {user.role === 'SELLER' && (
            <span className="ml-auto shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              Seller
            </span>
          )}
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={`/account${item.href}`}
                className={cn(
                  'shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:border-primary/40',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => logout()}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </nav>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Sidebar — desktop only */}
        <div className="hidden md:block md:col-span-1 space-y-4">
          <div className="rounded-lg border p-4 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">{initials}</span>
            </div>
            <h3 className="mt-2 font-semibold">{user.name}</h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {user.role === 'SELLER' && (
              <span className="mt-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                Seller
              </span>
            )}
          </div>

          <nav className="rounded-lg border p-2 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={`/account${item.href}`}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-accent',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}

            <div className="border-t pt-2 mt-2">
              <button
                onClick={() => logout()}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="md:col-span-3">
          {children}
        </div>
      </div>
    </div>
  );
}