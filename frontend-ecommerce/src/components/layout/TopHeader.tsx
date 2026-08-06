'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Globe,
  HelpCircle,
  Smartphone,
  Store,
  User,
  LogOut,
  Settings,
  ShoppingBag,
  Heart,
  ChevronDown,
  Languages,
  Moon,
  Sun,
} from 'lucide-react';

export function TopHeader() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Menu items for top bar
  const topMenuItems = [
    {
      label: 'Pusat Bantuan',
      href: '/help',
      icon: HelpCircle,
    },
    {
      label: 'Opsaun Avansadu',
      href: '/settings',
      icon: Settings,
    },
    {
      label: 'Dapat Aplikasi',
      href: '/download-app',
      icon: Smartphone,
    },
    {
      label: 'Jadi Penjual',
      href: '/seller/register',
      icon: Store,
    },
  ];

  return (
    <div className="border-b bg-muted/30">
      <div className="container-custom">
        <div className="flex h-8 items-center justify-between text-xs">
          {/* Left side - Language & Currency */}
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                  <Globe className="h-3.5 w-3.5" />
                  <span>English</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>
                  <Languages className="mr-2 h-4 w-4" />
                  English
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Languages className="mr-2 h-4 w-4" />
                  Tetun
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Languages className="mr-2 h-4 w-4" />
                  Português
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="text-muted-foreground/30">|</span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                  <span>USD</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>USD ($)</DropdownMenuItem>
                <DropdownMenuItem>EUR (€)</DropdownMenuItem>
                <DropdownMenuItem>IDR (Rp)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right side - Menu items */}
          <div className="flex items-center gap-4">
            {topMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}

            <span className="text-muted-foreground/30">|</span>

            {/* Theme Toggle in Top Bar */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {mounted ? (
                theme === 'dark' ? (
                  <Sun className="h-3.5 w-3.5" />
                ) : (
                  <Moon className="h-3.5 w-3.5" />
                )
              ) : (
                <Sun className="h-3.5 w-3.5 opacity-0" />
              )}
            </button>

            {/* User Menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                    <User className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{user?.name?.split(' ')[0] || 'Account'}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account/profile">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/orders">
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      My Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/wishlist">
                      <Heart className="mr-2 h-4 w-4" />
                      Wishlist
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}