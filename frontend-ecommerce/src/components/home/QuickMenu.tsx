'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Sparkles,
  TrendingUp,
  Store,
  Heart,
  ShoppingCart,
  ClipboardList,
  Boxes,
  Megaphone,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/LanguageContext';

interface QuickMenuItem {
  titleKey: string;
  href: string;
  icon: LucideIcon;
}

// Every entry here points to a page that actually exists and works — no
// dead links. The three "jump to a homepage section" links this used to
// have (#local-products, #new-arrivals, #popular-products) never matched
// anything real: homepage sections are admin-configured and render with no
// id at all, so those taps silently did nothing. Replaced with routes that
// always resolve regardless of what's configured on the homepage today.
const menus: QuickMenuItem[] = [
  { titleKey: 'home.quickMenu.allProducts', href: '/products', icon: Boxes },
  { titleKey: 'home.quickMenu.becomeSeller', href: '/seller/register', icon: Megaphone },
  { titleKey: 'home.quickMenu.localProducts', href: '/categories/local-products', icon: Store },
  { titleKey: 'home.quickMenu.newArrivals', href: '/products?sortBy=newest', icon: Sparkles },
  { titleKey: 'home.quickMenu.popular', href: '/products?sortBy=best_selling', icon: TrendingUp },
  { titleKey: 'home.quickMenu.wishlist', href: '/account/wishlist', icon: Heart },
  { titleKey: 'home.quickMenu.cart', href: '/cart', icon: ShoppingCart },
  { titleKey: 'home.quickMenu.myOrders', href: '/account/orders', icon: ClipboardList },
];

export default function QuickMenu() {
  const { t } = useTranslation();

  return (
    <section className="border-b bg-background py-8">
      <div className="container-custom">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('home.quickMenu.title')}
        </h2>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-4 md:grid-cols-8">
          {menus.map((menu) => {
            const Icon = menu.icon;

            return (
              <Link
                key={menu.titleKey}
                href={menu.href}
                className="group flex flex-col items-center gap-2.5 rounded-lg p-3 transition-colors hover:bg-muted/60"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted/40 transition-colors group-hover:border-primary/30 group-hover:bg-primary/5 sm:h-14 sm:w-14">
                  <Icon className="h-5 w-5 text-foreground/80 transition-colors group-hover:text-primary sm:h-6 sm:w-6" strokeWidth={1.75} />
                </div>

                <span className="text-center text-xs font-medium text-foreground/80 group-hover:text-foreground sm:text-sm">
                  {t(menu.titleKey)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
