'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useCategoryTree } from '@/hooks/useCategories';
import { getCategoryIcon } from '@/lib/categoryIcons';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
  Play,
  ArrowRight,
  Truck,
  ShieldCheck,
  BadgeCheck,
  Headset,
  Gift,
  ChevronDown,
} from 'lucide-react';
import type { Category, CategoryChild } from '@/types/category.types';

const isLocalCategory = (name: string) => /local/i.test(name);

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mainMenuItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/videos', label: 'Video Shop', icon: Play },
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
  const { t } = useTranslation();
  // Desktop gets the hover-driven mega menu (CategoriesMegaMenu); mobile has
  // no hover, so this is a plain accordion instead — same category tree,
  // same routes, just a drill-down interaction that works with touch.
  const { data: categoryTree } = useCategoryTree();
  const categories = (categoryTree ?? []) as Category[];

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
          <nav className="flex-1 overflow-y-auto p-4" data-lenis-prevent>
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

              {/* Categories — accordion drill-down (mobile has no hover to
                  drive the desktop mega menu's active-category preview). */}
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase text-muted-foreground px-3">
                  {t('nav.megaMenu.browse')}
                </p>
                {categories.length > 0 ? (
                  <Accordion type="single" collapsible className="px-1">
                    {categories.map((category) => {
                      const Icon = getCategoryIcon(category.name);
                      const children = (category.children ?? []) as CategoryChild[];
                      const isLocal = isLocalCategory(category.name);
                      return (
                        <AccordionItem key={category.id} value={String(category.id)} className="border-b-0">
                          <AccordionTrigger className="group rounded-lg px-2 py-2.5 text-sm font-medium text-foreground hover:bg-accent hover:no-underline">
                            <span className="flex flex-1 items-center gap-3">
                              <Icon className={`h-5 w-5 ${isLocal ? 'text-secondary' : 'text-muted-foreground'}`} />
                              {category.name}
                              {isLocal && (
                                <span className="rounded-full bg-secondary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                                  TL
                                </span>
                              )}
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                          </AccordionTrigger>
                          <AccordionContent className="pb-1 pl-11 pr-2">
                            {children.length > 0 ? (
                              <ul className="space-y-1">
                                {children.map((child) => (
                                  <li key={child.id}>
                                    <Link
                                      href={`/categories/${child.slug}`}
                                      onClick={() => onOpenChange(false)}
                                      className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                    >
                                      {child.name}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                            <Link
                              href={`/categories/${category.slug}`}
                              onClick={() => onOpenChange(false)}
                              className="mt-1 flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-primary"
                            >
                              {t('nav.megaMenu.viewCategory')}
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                ) : (
                  <Link
                    href="/categories"
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <FolderTree className="h-5 w-5" />
                    <span className="text-sm font-medium">{t('nav.allCategories')}</span>
                  </Link>
                )}
                <Link
                  href="/categories"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-primary"
                >
                  {t('nav.megaMenu.viewAll')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Featured categories + promo — same content as the desktop
                  mega menu's right rail, stacked instead of a third column
                  (390px has no room for 3 real columns of readable text). */}
              {categories.length > 0 && (() => {
                const featured = categories.filter((c) => c.isFeatured).slice(0, 4);
                const fallbackFeatured = featured.length > 0 ? featured : categories.slice(0, 4);
                return (
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase text-muted-foreground px-3">
                      {t('nav.megaMenu.featured')}
                    </p>
                    <div className="grid grid-cols-2 gap-2 px-1">
                      {fallbackFeatured.map((category) => {
                        const Icon = getCategoryIcon(category.name);
                        return (
                          <Link
                            key={category.id}
                            href={`/categories/${category.slug}`}
                            onClick={() => onOpenChange(false)}
                            className="flex items-center gap-2 rounded-lg border p-2"
                          >
                            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary/10">
                              {category.image ? (
                                <Image src={category.image} alt="" fill sizes="36px" className="object-cover" />
                              ) : (
                                <Icon className="h-4 w-4 text-primary" />
                              )}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-medium text-foreground">
                                {category.name}
                              </span>
                              <span className="block truncate text-[11px] text-muted-foreground">
                                {!!category.productCount && category.productCount > 0
                                  ? `${category.productCount} ${t('nav.megaMenu.products')}`
                                  : t('nav.megaMenu.explore')}
                              </span>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                    <Link
                      href="/deals"
                      onClick={() => onOpenChange(false)}
                      className="mx-1 mt-2 flex items-center gap-3 rounded-xl bg-gradient-to-br from-primary to-blue-700 p-3 text-white"
                    >
                      <Gift className="h-7 w-7 shrink-0 text-white/90" strokeWidth={1.5} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold leading-tight">
                          {t('nav.megaMenu.promoTitle')}
                        </span>
                        <span className="mt-0.5 block text-xs text-white/80">
                          {t('nav.megaMenu.promoSubtitle')}
                        </span>
                      </span>
                    </Link>
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t px-1 pt-3">
                      {[
                        { icon: Truck, label: t('nav.megaMenu.trust.delivery') },
                        { icon: ShieldCheck, label: t('nav.megaMenu.trust.payment') },
                        { icon: BadgeCheck, label: t('nav.megaMenu.trust.original') },
                        { icon: Headset, label: t('nav.megaMenu.trust.support') },
                      ].map(({ icon: Icon, label }) => (
                        <div key={label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="truncate">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

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