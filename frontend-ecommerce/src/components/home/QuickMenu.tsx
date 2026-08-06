"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Flame,
  Star,
  Store,
  Sparkles,
  BadgePercent,
  Gift,
  Truck,
  ShoppingBag,
  LayoutGrid,
  Package,
} from "lucide-react";

interface QuickMenuItem {
  title: string;
  href: string;
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
}

const menus: QuickMenuItem[] = [
  {
    title: "Flash Sale",
    href: "/flash-sale",
    icon: Flame,
    bgColor: "bg-red-100",
    iconColor: "text-red-600",
  },
  {
    title: "Best Seller",
    href: "/best-seller",
    icon: Star,
    bgColor: "bg-yellow-100",
    iconColor: "text-yellow-600",
  },
  {
    title: "Local Products",
    href: "/local-products",
    icon: Store,
    bgColor: "bg-green-100",
    iconColor: "text-green-600",
  },
  {
    title: "New Arrival",
    href: "/new-arrivals",
    icon: Sparkles,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    title: "Discount",
    href: "/discount",
    icon: BadgePercent,
    bgColor: "bg-pink-100",
    iconColor: "text-pink-600",
  },
  {
    title: "Voucher",
    href: "/voucher",
    icon: Gift,
    bgColor: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    title: "Free Shipping",
    href: "/free-shipping",
    icon: Truck,
    bgColor: "bg-cyan-100",
    iconColor: "text-cyan-600",
  },
  {
    title: "Official Store",
    href: "/official-store",
    icon: ShoppingBag,
    bgColor: "bg-indigo-100",
    iconColor: "text-indigo-600",
  },
  {
    title: "Categories",
    href: "/categories",
    icon: LayoutGrid,
    bgColor: "bg-orange-100",
    iconColor: "text-orange-600",
  },
  {
    title: "Today's Deals",
    href: "/today-deals",
    icon: Package,
    bgColor: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
];

export default function QuickMenu() {
  return (
    <section className="bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-bold text-gray-900">
            Quick Menu
          </h2>

          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10">
            {menus.map((menu) => {
              const Icon = menu.icon;

              return (
                <Link
                  key={menu.title}
                  href={menu.href}
                  className="group flex flex-col items-center rounded-xl p-3 transition-all duration-300 hover:-translate-y-1 hover:bg-gray-50 hover:shadow-md"
                >
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-2xl ${menu.bgColor} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon
                      className={`h-8 w-8 ${menu.iconColor}`}
                      strokeWidth={2}
                    />
                  </div>

                  <span className="mt-3 text-center text-sm font-medium text-gray-700 group-hover:text-orange-500">
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