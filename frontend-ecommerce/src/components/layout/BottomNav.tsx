'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, ShoppingCart, Heart, User } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Mobile-only persistent tab bar — the storefront's other navigation
// (Header, MobileNav's hamburger drawer) stays exactly as-is; this is an
// additional, always-visible layer for the 5 destinations a shopper
// reaches for constantly, matching the pattern Shopee/Tokopedia/Lazada all
// converged on. Hidden on pages that already own the bottom of the screen
// (product detail's Add to Cart bar, checkout's order-total bar) — see
// ConditionalChrome, which decides when this renders at all.
export function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const cartCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const wishlistCount = useWishlistStore((state) => state.items.length);

  const tabs = [
    { href: '/', label: t('nav.bottom.home'), icon: Home },
    { href: '/categories', label: t('nav.bottom.categories'), icon: LayoutGrid },
    { href: '/cart', label: t('nav.bottom.cart'), icon: ShoppingCart, badge: cartCount },
    { href: '/account/wishlist', label: t('nav.bottom.wishlist'), icon: Heart, badge: wishlistCount },
    {
      href: isAuthenticated ? '/account/profile' : '/login',
      label: t('nav.bottom.account'),
      icon: User,
    },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <div className="grid grid-cols-5">
        {tabs.map((tab) => {
          const active = isActive(pathname ?? '', tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium"
              aria-current={active ? 'page' : undefined}
            >
              <span className="relative flex h-6 w-6 items-center justify-center">
                <tab.icon
                  className={cn('h-5 w-5 transition-colors', active ? 'text-primary' : 'text-muted-foreground')}
                  strokeWidth={active ? 2.5 : 2}
                />
                {!!tab.badge && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </span>
              <span className={cn('transition-colors', active ? 'text-primary' : 'text-muted-foreground')}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
