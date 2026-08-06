'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import {
  Home,
  Package,
  FolderTree,
  Store,
  ShoppingCart,
  Heart,
  User,
  Settings,
  LogOut,
  X,
  HelpCircle,
  Smartphone,
} from 'lucide-react';

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mainMenuItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/categories', label: 'Categories', icon: FolderTree },
  { href: '/sellers', label: 'Sellers', icon: Store },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/account/wishlist', label: 'Wishlist', icon: Heart },
];

const topMenuItems = [
  { href: '/help', label: 'Pusat Bantuan', icon: HelpCircle },
  { href: '/download-app', label: 'Dapat Aplikasi', icon: Smartphone },
  { href: '/seller/register', label: 'Jadi Penjual', icon: Store },
];

const accountItems = [
  { href: '/account/profile', label: 'Profile', icon: User },
  { href: '/account/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/account/settings', label: 'Settings', icon: Settings },
];

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-sm p-0">
        <div className="flex h-full flex-col">
          {/* Header */}
          <SheetHeader className="border-b p-4">
            <div className="flex items-center justify-between">
              <SheetTitle>Menu</SheetTitle>
              <SheetClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>
          </SheetHeader>

          {/* User Info */}
          {isAuthenticated && user && (
            <div className="border-b p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-medium text-sm">
                    {user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {/* Top Menu - Quick Links */}
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase text-muted-foreground px-3">
                  Quick Links
                </p>
                {topMenuItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => onOpenChange(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Main Menu */}
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase text-muted-foreground px-3">
                  Menu
                </p>
                {mainMenuItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => onOpenChange(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Account Menu */}
              {isAuthenticated && (
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground px-3">
                    Account
                  </p>
                  {accountItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => onOpenChange(false)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                  <button
                    onClick={() => {
                      logout();
                      onOpenChange(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                  >
                    <LogOut className="h-5 w-5" />
                    Logout
                  </button>
                </div>
              )}

              {/* Auth Buttons */}
              {!isAuthenticated && (
                <div className="space-y-2 px-3">
                  <Button className="w-full" asChild>
                    <Link href="/login" onClick={() => onOpenChange(false)}>
                      Sign In
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/register" onClick={() => onOpenChange(false)}>
                      Create Account
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}