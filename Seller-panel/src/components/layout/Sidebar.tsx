'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  Box,
  ClipboardList,
  Users,
  Wallet,
  BarChart3,
  Store,
  Bell,
  LifeBuoy,
  LogOut,
  ChevronDown,
  Menu,
  X as XIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useSellerDashboard } from '@/hooks/useDashboard';
import { useUnreadCount } from '@/hooks/useNotifications';
import { Badge } from '@/components/ui/badge';

interface SubItem {
  href: string;
  label: string;
  badge?: number;
}

interface MenuItem {
  key: string;
  href?: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  children?: SubItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { logout, user } = useAuthStore();
  const { data: dashboard } = useSellerDashboard();
  const { data: unread } = useUnreadCount();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    products: pathname.startsWith('/products'),
    orders: pathname.startsWith('/orders'),
    finance: pathname.startsWith('/finance'),
    'my-store': pathname.startsWith('/my-store'),
  });

  const menu: MenuItem[] = [
    { key: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      key: 'products',
      label: 'Products',
      icon: Box,
      children: [
        { href: '/products', label: 'All Products' },
        { href: '/products/new', label: 'Add Product' },
        { href: '/products/low-stock', label: 'Low Stock', badge: dashboard?.overview.products.lowStock },
        { href: '/products/out-of-stock', label: 'Out of Stock', badge: dashboard?.overview.products.outOfStock },
      ],
    },
    {
      key: 'orders',
      label: 'Orders',
      icon: ClipboardList,
      children: [
        { href: '/orders?status=PENDING', label: 'New Orders', badge: dashboard?.overview.orders.pending },
        { href: '/orders?status=PROCESSING', label: 'Processing', badge: dashboard?.overview.orders.processing },
        { href: '/orders?status=SHIPPING', label: 'Shipped', badge: dashboard?.overview.orders.shipping },
        { href: '/orders?status=DELIVERED', label: 'Completed' },
        { href: '/orders?status=CANCELLED', label: 'Cancelled' },
      ],
    },
    { key: 'customers', href: '/customers', label: 'Customers', icon: Users },
    {
      key: 'finance',
      label: 'Finance',
      icon: Wallet,
      children: [
        { href: '/finance/earnings', label: 'Earnings' },
        { href: '/finance/transactions', label: 'Transactions' },
        { href: '/finance/payouts', label: 'Payouts' },
      ],
    },
    { key: 'analytics', href: '/analytics', label: 'Analytics', icon: BarChart3 },
    {
      key: 'my-store',
      label: 'My Store',
      icon: Store,
      children: [
        { href: '/my-store/profile', label: 'Store Profile' },
        { href: '/my-store/address', label: 'Store Address' },
        { href: '/my-store/settings', label: 'Store Settings' },
      ],
    },
    { key: 'notifications', href: '/notifications', label: 'Notifications', icon: Bell, badge: unread?.count },
    { key: 'help', href: '/help', label: 'Help & Support', icon: LifeBuoy },
  ];

  const isActive = (href: string) => {
    const [base, query] = href.split('?');
    if (query) {
      const params = new URLSearchParams(query);
      return pathname === base && searchParams.get('status') === params.get('status');
    }
    return pathname === base;
  };

  const isGroupActive = (item: MenuItem) => item.children?.some((c) => isActive(c.href));

  const content = (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-bold">
          S
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">
            {user?.seller?.storeName || 'Seller Panel'}
          </p>
          <p className="text-[11px] text-sidebar-foreground/60">ShoplyLospala</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {menu.map((item) => {
          const Icon = item.icon;

          if (item.children) {
            const open = openGroups[item.key];
            const active = isGroupActive(item);
            return (
              <div key={item.key}>
                <button
                  type="button"
                  onClick={() => setOpenGroups((s) => ({ ...s, [item.key]: !s[item.key] }))}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
                </button>
                {open && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
                    {item.children.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
                          isActive(sub.href)
                            ? 'bg-sidebar-primary/15 font-medium text-sidebar-primary'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                        )}
                      >
                        {sub.label}
                        {!!sub.badge && (
                          <Badge className="h-5 min-w-5 justify-center border-0 bg-warning/20 px-1.5 text-warning">
                            {sub.badge}
                          </Badge>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.key}
              href={item.href!}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive(item.href!)
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {!!item.badge && (
                <Badge className="h-5 min-w-5 justify-center border-0 bg-destructive/80 px-1.5 text-white">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          type="button"
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-destructive/15 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-md border bg-card shadow-sm lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/70 lg:hidden"
        >
          <XIcon className="h-4 w-4" />
        </button>
        {content}
      </aside>
    </>
  );
}
