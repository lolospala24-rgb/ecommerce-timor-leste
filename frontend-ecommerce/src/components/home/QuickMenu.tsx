'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutGrid,
  Sparkles,
  TrendingUp,
  Store,
  Heart,
  ShoppingCart,
  ClipboardList,
  Boxes,
} from 'lucide-react';

interface QuickMenuItem {
  title: string;
  href: string;
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
}

// Every entry here points to a page or in-page section that actually
// exists and works — no dead links. Items like "Promo"/"Voucher" were
// removed because there's no real coupon or promotion system behind them.
const menus: QuickMenuItem[] = [
  {
    title: 'All Products',
    href: '/products',
    icon: Boxes,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-700',
  },
  {
    title: 'Categories',
    href: '/categories',
    icon: LayoutGrid,
    bgColor: 'bg-teal-100',
    iconColor: 'text-teal-700',
  },
  {
    title: 'Local Products',
    href: '#local-products',
    icon: Store,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  {
    title: 'New Arrivals',
    href: '#new-arrivals',
    icon: Sparkles,
    bgColor: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  {
    title: 'Popular',
    href: '#popular-products',
    icon: TrendingUp,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-700',
  },
  {
    title: 'Wishlist',
    href: '/account/wishlist',
    icon: Heart,
    bgColor: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  {
    title: 'Cart',
    href: '/cart',
    icon: ShoppingCart,
    bgColor: 'bg-teal-100',
    iconColor: 'text-teal-700',
  },
  {
    title: 'My Orders',
    href: '/account/orders',
    icon: ClipboardList,
    bgColor: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
];

export default function QuickMenu() {
  return (
    <section className="bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-bold text-slate-900">Quick Menu</h2>

          <div className="grid grid-cols-4 gap-4 sm:grid-cols-4 md:grid-cols-8">
            {menus.map((menu) => {
              const Icon = menu.icon;

              return (
                <Link
                  key={menu.title}
                  href={menu.href}
                  className="group flex flex-col items-center rounded-xl p-3 transition-all duration-300 hover:-translate-y-1 hover:bg-slate-50 hover:shadow-md"
                >
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl sm:h-16 sm:w-16 ${menu.bgColor} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon className={`h-7 w-7 sm:h-8 sm:w-8 ${menu.iconColor}`} strokeWidth={2} />
                  </div>

                  <span className="mt-3 text-center text-xs font-medium text-slate-700 group-hover:text-primary sm:text-sm">
                    {menu.title}
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
