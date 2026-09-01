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
  bgColor: string;
  iconColor: string;
}

// Every entry here points to a page that actually exists and works — no
// dead links. The three "jump to a homepage section" links this used to
// have (#local-products, #new-arrivals, #popular-products) never matched
// anything real: homepage sections are admin-configured and render with no
// id at all, so those taps silently did nothing. Replaced with routes that
// always resolve regardless of what's configured on the homepage today.
const menus: QuickMenuItem[] = [
  {
    titleKey: 'home.quickMenu.allProducts',
    href: '/products',
    icon: Boxes,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-700',
  },
  {
    titleKey: 'home.quickMenu.becomeSeller',
    href: '/seller/register',
    icon: Megaphone,
    bgColor: 'bg-teal-100',
    iconColor: 'text-teal-700',
  },
  {
    titleKey: 'home.quickMenu.localProducts',
    href: '/categories/local-products',
    icon: Store,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  {
    titleKey: 'home.quickMenu.newArrivals',
    href: '/products?sortBy=newest',
    icon: Sparkles,
    bgColor: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  {
    titleKey: 'home.quickMenu.popular',
    href: '/products?sortBy=best_selling',
    icon: TrendingUp,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-700',
  },
  {
    titleKey: 'home.quickMenu.wishlist',
    href: '/account/wishlist',
    icon: Heart,
    bgColor: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  {
    titleKey: 'home.quickMenu.cart',
    href: '/cart',
    icon: ShoppingCart,
    bgColor: 'bg-teal-100',
    iconColor: 'text-teal-700',
  },
  {
    titleKey: 'home.quickMenu.myOrders',
    href: '/account/orders',
    icon: ClipboardList,
    bgColor: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
];

export default function QuickMenu() {
  const { t } = useTranslation();

  return (
    <section className="bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-bold text-slate-900">{t('home.quickMenu.title')}</h2>

          <div className="grid grid-cols-4 gap-4 sm:grid-cols-4 md:grid-cols-8">
            {menus.map((menu) => {
              const Icon = menu.icon;

              return (
                <Link
                  key={menu.titleKey}
                  href={menu.href}
                  className="group flex flex-col items-center rounded-xl p-3 transition-all duration-300 hover:-translate-y-1 hover:bg-slate-50 hover:shadow-md"
                >
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl sm:h-16 sm:w-16 ${menu.bgColor} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon className={`h-7 w-7 sm:h-8 sm:w-8 ${menu.iconColor}`} strokeWidth={2} />
                  </div>

                  <span className="mt-3 text-center text-xs font-medium text-slate-700 group-hover:text-primary sm:text-sm">
                    {t(menu.titleKey)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
