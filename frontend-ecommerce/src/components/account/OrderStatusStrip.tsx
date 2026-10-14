'use client';

import Link from 'next/link';
import { CreditCard, PackageCheck, Truck, CheckCircle2, Star, type LucideIcon } from 'lucide-react';
import { useOrderStats } from '@/hooks/useOrders';

interface StripItem {
  key: 'pending' | 'processing' | 'shipping' | 'delivered' | 'review';
  label: string;
  icon: LucideIcon;
  href: string;
}

const items: StripItem[] = [
  { key: 'pending', label: 'Atu selu', icon: CreditCard, href: '/account/orders?status=PENDING' },
  { key: 'processing', label: 'Prepara', icon: PackageCheck, href: '/account/orders?status=PROCESSING' },
  { key: 'shipping', label: 'Haruka hela', icon: Truck, href: '/account/orders?status=SHIPPING' },
  { key: 'delivered', label: 'Simu ona', icon: CheckCircle2, href: '/account/orders?status=DELIVERED' },
  { key: 'review', label: 'Review', icon: Star, href: '/account/reviews' },
];

// Review has no backing "orders pending review" count endpoint (reviews are
// eligibility-checked per product, not aggregated) — it renders without a
// count badge while the other four read real per-user order counts.
export function OrderStatusStrip() {
  const { data: stats, isLoading } = useOrderStats();

  return (
    <div className="grid grid-cols-5 gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        const count = item.key === 'review' ? undefined : (stats?.[item.key] as number | undefined);
        return (
          <Link
            key={item.key}
            href={item.href}
            className="flex flex-col items-center gap-1.5 rounded-lg py-1.5 text-center transition-colors hover:bg-accent"
          >
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-[18px] w-[18px]" />
              {!isLoading && !!count && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-warning px-1 text-[10px] font-bold leading-none text-warning-foreground">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </span>
            <span className="text-[11px] font-medium leading-tight text-foreground">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
