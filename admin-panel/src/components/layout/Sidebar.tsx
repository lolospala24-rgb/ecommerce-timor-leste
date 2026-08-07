'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Store,
  Box,
  FolderTree,
  Video,
  ClipboardList,
  Banknote,
  Star,
  Truck,
  Package,
  FileBarChart,
  Settings,
  Menu,
  X as XIcon,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCircle,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// ============================================================
//  MENU ITEMS INTERFACE
// ============================================================
interface MenuItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface MenuSection {
  label: string;
  items: MenuItem[];
}

// ============================================================
//  MAIN MENU
//  Every entry here maps to a real page backed by a working API —
//  see the sidebar audit for what was removed and why.
// ============================================================
const menuSections: MenuSection[] = [
  {
    label: 'Overview',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Catalog',
    items: [
      { href: '/products', label: 'Products', icon: Box },
      { href: '/categories', label: 'Categories', icon: FolderTree },
      { href: '/video-shop', label: 'Video Shop', icon: Video },
    ],
  },
  {
    label: 'Sales',
    items: [
      { href: '/orders', label: 'Orders', icon: ClipboardList },
      { href: '/payments', label: 'Payments', icon: Banknote },
      { href: '/reviews', label: 'Reviews', icon: Star },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/users', label: 'Users', icon: Users },
      { href: '/sellers', label: 'Sellers', icon: Store },
    ],
  },
  {
    label: 'Logistics',
    items: [
      { href: '/shipping', label: 'Shipping', icon: Truck },
      { href: '/couriers', label: 'Couriers', icon: Package },
    ],
  },
  {
    label: 'Insights',
    items: [{ href: '/reports', label: 'Reports', icon: FileBarChart }],
  },
];

// ============================================================
//  BOTTOM MENU
// ============================================================
const bottomMenuItems: MenuItem[] = [
  { href: '/profile', label: 'Profile', icon: UserCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
];

// ============================================================
//  SIDEBAR COMPONENT
// ============================================================
export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // ============================================================
  //  CHECK MOBILE
  // ============================================================
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ============================================================
  //  CHECK ACTIVE ROUTE
  // ============================================================
  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  // ============================================================
  //  GET INITIALS
  // ============================================================
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // ============================================================
  //  RENDER MENU ITEM
  // ============================================================
  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    return (
      <TooltipProvider key={item.href} delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200',
                active
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                collapsed && 'justify-center'
              )}
            >
              <Icon className={cn(
                'h-5 w-5 flex-shrink-0 transition-all duration-200',
                active ? 'scale-105' : 'group-hover:scale-105'
              )} />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              {item.badge && !collapsed && (
                <Badge className="ml-auto bg-red-500 text-white hover:bg-red-600">
                  {item.badge}
                </Badge>
              )}
              {item.badge && collapsed && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {item.badge}
                </span>
              )}
              {active && !collapsed && (
                <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary-foreground/20" />
              )}
            </Link>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" className="ml-2">
              {item.label}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  // ============================================================
  //  SIDEBAR CONTENT
  // ============================================================
  const sidebarContent = (
    <>
      {/* ===== LOGO ===== */}
      <div className={cn(
        'flex h-16 items-center border-b px-4',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed ? (
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="text-white font-bold text-sm">E</span>
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" />
            </div>
            <div>
              <span className="font-bold text-lg">AdminPanel</span>
              <span className="block text-[10px] text-muted-foreground -mt-0.5">
                Super Admin
              </span>
            </div>
          </Link>
        ) : (
          <Link href="/dashboard">
            <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="text-white font-bold text-sm">E</span>
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" />
            </div>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:flex h-8 w-8 rounded-lg hover:bg-accent"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8 rounded-lg hover:bg-accent"
            onClick={() => setMobileOpen(false)}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* ===== NAVIGATION ===== */}
      <ScrollArea className="flex-1">
        <nav className="px-3 py-4 space-y-4">
          {menuSections.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => renderMenuItem(item))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* ===== BOTTOM ===== */}
      <div className="border-t px-3 py-3">
        <div className="space-y-0.5">
          {bottomMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  collapsed && 'justify-center'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* ===== USER PROFILE ===== */}
        <div className="mt-3 border-t pt-3">
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <div className="relative flex-shrink-0">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-2 ring-primary/10">
                <span className="text-primary font-medium text-sm">
                  {user?.name ? getInitials(user.name) : 'AD'}
                </span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'Admin'}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.role || 'Super Administrator'}
                </p>
              </div>
            )}
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                onClick={() => logout()}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
          {collapsed && (
            <div className="mt-3 flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                onClick={() => logout()}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  // ============================================================
  //  MOBILE RENDER
  // ============================================================
  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="fixed left-4 top-4 z-50 lg:hidden h-9 w-9 rounded-lg shadow-lg bg-white"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Mobile Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-2xl transition-transform duration-300 lg:hidden',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {sidebarContent}
        </div>
      </>
    );
  }

  // ============================================================
  //  DESKTOP RENDER
  // ============================================================
  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col bg-white border-r transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-72'
      )}
    >
      {sidebarContent}
    </aside>
  );
}
