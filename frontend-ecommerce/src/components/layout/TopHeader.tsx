'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from 'next-themes';
import { useTranslation } from '@/lib/i18n/LanguageContext';
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
  Moon,
  Sun,
} from 'lucide-react';

export function TopHeader() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t, languages } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Menu items for top bar
  const topMenuItems = [
    {
      label: t('topbar.helpCenter'),
      href: '/help',
      icon: HelpCircle,
    },
    {
      label: t('topbar.advancedOptions'),
      href: '/account/settings',
      icon: Settings,
    },
    {
      label: t('topbar.getApp'),
      href: '/download-app',
      icon: Smartphone,
    },
    {
      label: t('topbar.becomeSeller'),
      href: '/seller/register',
      icon: Store,
    },
  ];

  const currentLanguage = languages.find((l) => l.code === locale) ?? languages[0];

  return (
    <div className="border-b bg-muted/30">
      <div className="container-custom">
        <div className="flex h-8 items-center justify-between text-xs">
          {/* Left side - Language & Currency. Currency stays a static USD
              indicator — prices aren't actually converted to other
              currencies. Language is real: it switches the site's global
              chrome (this bar, the header, the footer) and persists to
              localStorage — see LanguageContext. */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t('lang.switchLabel')}
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>{currentLanguage.nativeLabel}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLocale(lang.code)}
                    className={lang.code === locale ? 'font-medium text-primary' : ''}
                  >
                    {lang.nativeLabel}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-muted-foreground/30">|</span>
            <span>USD</span>
          </div>

          {/* Right side - Menu items */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* These four links are also in the mobile hamburger menu
                (MobileNav) — showing them here too just crowded this thin
                bar on narrow phones, so they're desktop-only here. Held off
                until lg: (1024px): at exactly md: (768px, e.g. iPad
                portrait) the four labels + separator + theme toggle + user
                menu don't fit and overflow the viewport horizontally. */}
            <div className="hidden lg:flex items-center gap-4">
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
            </div>

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
                      {t('nav.profile')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/orders">
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      {t('nav.myOrders')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/wishlist">
                      <Heart className="mr-2 h-4 w-4" />
                      {t('nav.wishlist')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      {t('nav.settings')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('nav.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{t('topbar.login')}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}