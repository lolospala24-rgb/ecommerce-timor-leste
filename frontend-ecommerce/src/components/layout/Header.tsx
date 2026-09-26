'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { CategoriesMegaMenu } from './CategoriesMegaMenu';
import { CategoryDrawer } from './CategoryDrawer';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/uiStore';
import { SearchAiBar } from '@/components/shared/SearchAiBar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { getInitials } from '@/lib/formatters';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { TopHeader } from './TopHeader';
import { CartDrawer } from './CartDrawer';
import { MobileNav } from './MobileNav';
import {
  ShoppingCart,
  User,
  LogOut,
  Settings,
  Heart,
  Menu,
  Moon,
  Sun,
  Monitor,
  Bell,
  CheckCheck,
  Trash2,
  ChevronDown,
  LayoutGrid,
  Truck,
} from 'lucide-react';
import { Play } from 'lucide-react';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  // The mobile categories/video-shop row is a homepage browse shortcut —
  // once a shopper has drilled into a product/category/cart/etc, it just
  // duplicates what the hamburger menu and CategoryDrawer already offer,
  // and crowds the header on pages where vertical space actually matters
  // (e.g. a product detail page fighting for room above the fold).
  const isMobileBrowseRowVisible = pathname === '/';
  // Single-item detail pages (a specific product, a specific seller) —
  // someone already there has already searched their way in, so a search
  // row is unlikely to be their next tap, and the page needs the vertical
  // space more than a listing page does. Mirrors (shop)/layout.tsx's own
  // hasOwnBreadcrumb() check for the same class of page. Listing pages
  // (home, /products, /categories, /cart, etc.) keep the search row.
  const isDetailPage =
    (pathname?.startsWith('/products/') && pathname !== '/products/') ||
    (pathname?.startsWith('/sellers/') && pathname !== '/sellers/');
  const isMobileSearchRowVisible = !isDetailPage;
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { data: publicSettings } = usePublicSettings();
  const [categoriesMenuOpen, setCategoriesMenuOpen] = useState(false);
  // Deliberately its own state — never shares open/close with mobileNavOpen
  // (the hamburger menu). Conflating them was the bug: tapping "All
  // Categories" on mobile opened the Administrator/Quick Links menu instead
  // of a categories-only view.
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  // Narrow selectors instead of the shared useCart() hook: Header only ever
  // displays these two derived numbers, so subscribing to the full cart
  // hook (items/isLoading/error/actions) would re-render it on every
  // isLoading flip during an add/remove — work it never uses.
  const totalItems = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0),
  );
  const cartSubtotal = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useOrderNotifications();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { cartOpen, setCartOpen } = useUIStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [checkoutPreview, setCheckoutPreview] = useState({
    shippingCost: 0,
    taxRate: 0,
    serviceFee: 0,
  });

  useEffect(() => {
    let isMounted = true;

    const loadCheckoutPreview = async () => {
      try {
        const [shippingResponse, settingsResponse] = await Promise.allSettled([
          api.get('/shipping-settings'),
          api.get('/settings/public'),
        ]);

        if (!isMounted) return;

        const shippingPayload = shippingResponse.status === 'fulfilled'
          ? shippingResponse.value?.data?.data ?? shippingResponse.value?.data ?? {}
          : {};
        const settingsPayload = settingsResponse.status === 'fulfilled'
          ? settingsResponse.value?.data?.data ?? settingsResponse.value?.data ?? {}
          : {};

        setCheckoutPreview({
          shippingCost: Number(shippingPayload?.defaultShippingCost ?? shippingPayload?.shippingSettings?.defaultShippingCost ?? 0),
          taxRate: Number(settingsPayload?.taxRate ?? 0),
          serviceFee: Number(settingsPayload?.serviceFee ?? 0),
        });
      } catch {
        if (isMounted) {
          setCheckoutPreview({ shippingCost: 0, taxRate: 0, serviceFee: 0 });
        }
      }
    };

    void loadCheckoutPreview();
    // This settings data barely changes — polling every 5s on a header
    // mounted on every page was needless network chatter.
    const intervalId = window.setInterval(() => {
      void loadCheckoutPreview();
    }, 60_000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated]);

  const previewTax = cartSubtotal * (checkoutPreview.taxRate / 100);
  const previewGrandTotal = cartSubtotal + checkoutPreview.shippingCost + previewTax + checkoutPreview.serviceFee;

  return (
    <>
      {/* Top Header with menu items */}
      <TopHeader />

      {/* Main Header — brand green→blue gradient block, full-bleed edge-to-edge.
          The gradient/safe-area padding lives on this inner wrapper (not
          the outer <header>) so the status-bar area is tinted too, while the
          homepage-only categories row below stays outside it on the plain
          page background — see isMobileBrowseRowVisible block further down. */}
      <header className="sticky top-0 z-40 bg-background">
        <div
          className="relative overflow-hidden bg-[linear-gradient(120deg,#16A34A_0%,#0EA5A8_42%,#2563EB_100%)] shadow-md shadow-blue-900/10"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          {/* Very subtle decorative glows — not a busy pattern, just soft
              depth so the gradient doesn't read as a flat color fill. */}
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

          <div className="container-custom relative">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo — the site name/logo are admin-editable (Settings → General),
                so this reads real data instead of a hardcoded brand. min-w-0
                (+ truncate below) lets long site names shrink gracefully on
                narrow phones instead of overflowing, now that the wordmark
                and tagline are shown at every breakpoint, not just sm:+. */}
            <Link href="/" className="flex min-w-0 items-center gap-2.5 sm:flex-shrink-0">
              {publicSettings?.logoUrl ? (
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white/10 ring-1 ring-white/30">
                  <Image src={publicSettings.logoUrl} alt={publicSettings.siteName} fill sizes="40px" className="object-contain" />
                </div>
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                  <span className="text-[#16A34A] font-bold text-sm">
                    {(publicSettings?.siteName || 'E').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <span className="block truncate text-lg font-extrabold leading-tight text-white sm:text-xl">
                  {publicSettings?.siteName || 'E-Commerce'}
                </span>
                <span className="block truncate text-[11px] font-medium leading-tight text-white/95 sm:text-xs">
                  {t('header.tagline')}
                </span>
                <span aria-hidden className="mt-1 block h-0.5 w-8 rounded-full bg-[#4ADE80]" />
              </div>
            </Link>

            {/* All-categories mega menu — a shortcut to browse by category
                without going through search first, sitting right beside the
                logo the way most marketplace headers place it. */}
            <DropdownMenu open={categoriesMenuOpen} onOpenChange={setCategoriesMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hidden shrink-0 items-center gap-1.5 rounded-full border border-[#BBF7D0] bg-white px-3.5 py-1.5 text-sm font-semibold text-[#15803D] shadow-sm transition-colors hover:bg-[#F0FDF4] md:flex"
                >
                  <LayoutGrid className="h-4 w-4 text-[#16A34A]" />
                  {t('nav.allCategories')}
                  <ChevronDown className="h-3.5 w-3.5 text-[#16A34A]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="p-0">
                <CategoriesMegaMenu onNavigate={() => setCategoriesMenuOpen(false)} />
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Search Bar - Desktop */}
            {/* Main Navigation - Desktop */}
            <nav className="hidden md:flex items-center gap-4 mr-6">

              <Link href="/videos" className="text-sm text-white/85 hover:text-white flex items-center gap-1">
                <Play className="h-4 w-4" />
                <span>{t('nav.videoShop')}</span>
              </Link>

            </nav>

            {/* Search Bar - Desktop (mobile gets its own full-width row
                below — see right after this header's main flex row. Cramming
                it into this same row alongside the logo and action icons
                left no real room for it on a narrow phone.) */}
            <div className="hidden md:block flex-1 max-w-md">
              <SearchAiBar className="w-full" />
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-1">
              {/* Theme Toggle removed from here - moved to TopHeader */}

              {/* Wishlist — now shown at every breakpoint per the approved
                  reference design (Notification/Wishlist/Menu is the
                  mobile action set); still also reachable via bottom nav's
                  "Deseju" tab and the hamburger menu, same as before. */}
              <Link href="/account/wishlist">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/15 hover:text-white" aria-label="Wishlist">
                  <Heart className="h-4 w-4" />
                </Button>
              </Link>

              {/* Notifications */}
              {isAuthenticated && (
                <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-9 w-9 text-white hover:bg-white/15 hover:text-white" aria-label="Notifications">
                      <Bell className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-1 text-[10px] bg-red-600">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-2rem))] p-0">
                    <div className="flex items-center justify-between border-b px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold">{t('notif.title')}</p>
                        <p className="text-xs text-muted-foreground">
                          {unreadCount > 0 ? `${unreadCount} ${t('notif.unread')}` : t('notif.allCaughtUp')}
                        </p>
                      </div>
                      {notifications.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={markAllAsRead}>
                            <CheckCheck className="mr-1 h-3.5 w-3.5" />
                            {t('notif.markAllRead')}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-destructive hover:text-destructive" onClick={clearNotifications}>
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            {t('notif.clear')}
                          </Button>
                        </div>
                      )}
                    </div>
                    {cartSubtotal > 0 && (
                      <div className="border-b bg-muted/40 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground">{t('notif.cartEstimate')}</p>
                            <p className="text-xs text-muted-foreground">{t('notif.basedOnCart')}</p>
                          </div>
                        </div>
                        <div className="mt-2 space-y-1 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t('notif.subtotal')}</span>
                            <span className="font-medium text-foreground">${cartSubtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t('notif.shippingFrom')}</span>
                            <span className="font-medium text-foreground">${checkoutPreview.shippingCost.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t('notif.tax')}</span>
                            <span className="font-medium text-foreground">${previewTax.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t('notif.serviceFee')}</span>
                            <span className="font-medium text-foreground">${checkoutPreview.serviceFee.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between border-t pt-1 text-sm font-semibold text-foreground">
                            <span>{t('notif.estimatedTotal')}</span>
                            <span>${previewGrandTotal.toFixed(2)}</span>
                          </div>
                          <p className="pt-0.5 text-[11px] text-muted-foreground">{t('notif.finalTotalNote')}</p>
                        </div>
                      </div>
                    )}
                    <div className="max-h-80 overflow-y-auto" data-lenis-prevent>
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                          {t('notif.empty')}
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`cursor-pointer border-b px-4 py-3 transition hover:bg-muted/50 ${notification.isRead ? 'bg-background' : 'bg-muted/40'}`}
                            onClick={() => {
                              markAsRead(notification.id);
                              setNotificationsOpen(false);
                              if (notification.productSlug) {
                                router.push(`/products/${notification.productSlug}`);
                              } else if (notification.orderId) {
                                router.push(`/account/orders/${notification.orderId}`);
                              }
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1">
                                <p className="text-sm font-medium">{notification.title}</p>
                                <p className="text-sm text-muted-foreground">{notification.message}</p>
                                {notification.status === 'SHIPPING' && (notification.trackingNumber || notification.note) && (
                                  <div className="rounded-md bg-white p-2 text-xs text-muted-foreground">
                                    {notification.trackingNumber && <p>Tracking: {notification.trackingNumber}</p>}
                                    {notification.note && <p>Note: {notification.note}</p>}
                                  </div>
                                )}
                              </div>
                              {!notification.isRead && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />}
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {new Date(notification.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Cart — desktop-only now (mobile action set is
                  Notification/Wishlist/Menu per the approved reference);
                  still fully reachable on mobile via bottom nav's "Karinhu"
                  tab, same cart state/functionality either way. */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden h-9 w-9 relative text-white hover:bg-white/15 hover:text-white md:inline-flex"
                onClick={() => setCartOpen(true)}
                aria-label="Cart"
              >
                <ShoppingCart className="h-4 w-4" />
                {totalItems > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-600">
                    {totalItems > 9 ? '9+' : totalItems}
                  </Badge>
                )}
              </Button>

              {/* User Menu — desktop-only, same reasoning as Cart above;
                  mobile reaches account via bottom nav's "Konta" tab. */}
              <div className="hidden md:block">
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-9 w-9 rounded-full p-0 hover:bg-white/15">
                      <Avatar className="h-8 w-8 ring-2 ring-white/50">
                        <AvatarImage src={user?.avatar ?? undefined} alt={user?.name} />
                        <AvatarFallback className="bg-white text-blue-700 text-xs">
                          {getInitials(user?.name)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
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
                    <DropdownMenuItem onClick={() => router.push('/account/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      {t('nav.profile')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/account/orders')}>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {t('nav.myOrders')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/account/wishlist')}>
                      <Heart className="mr-2 h-4 w-4" />
                      {t('nav.wishlist')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/account/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      {t('nav.settings')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => logout()} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('nav.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                // BottomNav's Account tab already routes guests to /login on
                // mobile — the wrapping "hidden md:block" div above already
                // keeps this desktop-only, so no duplicate visibility class
                // needed here too.
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="h-9 bg-white text-blue-700 hover:bg-white/90 hover:text-blue-800">
                    {t('nav.signIn')}
                  </Button>
                </Link>
              )}
              </div>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9 text-white hover:bg-white/15 hover:text-white"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mobile-only search row — the real, typeable SearchAiBar at full
              row width (not a fake button opening a separate overlay dialog
              — that extra tap-through was more friction than it was worth
              now that the bar fits comfortably on its own row). Sits at the
              bottom edge of the blue gradient block: a small negative bottom
              margin lets its shadowed white pill spill slightly past the
              gradient's edge into the page below, so the two surfaces read
              as layered rather than a hard flat seam. Hidden on
              product/seller detail pages — see isDetailPage above. */}
          {isMobileSearchRowVisible && (
            <div className="relative z-10 pt-1 pb-2 -mb-3 md:hidden">
              <SearchAiBar className="w-full" />
            </div>
          )}
          </div>
        </div>

        {/* Mobile-only second row: All Categories + delivery trust info — a
            homepage-only browse shortcut. Deliberately outside the gradient
            block (plain page background) so its white/green pill keeps
            normal contrast instead of sitting on the colored header.
            Opening the desktop mega menu's 880px panel on a phone screen
            isn't an option, so this is its own row on the homepage.
            Everywhere else (product/category/cart/etc pages) it's just dead
            weight crowding a header that already competes with page content
            for space, with the hamburger menu and CategoryDrawer still one
            tap away regardless. Video Shop moved to BottomNav's persistent
            tab bar — no need for it here too. */}
        {isMobileBrowseRowVisible && (
          <div className="container-custom">
            <div className="flex items-center justify-between gap-3 py-3 md:hidden">
              <button
                type="button"
                onClick={() => setCategoryDrawerOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={categoryDrawerOpen}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#BBF7D0] bg-white px-3.5 py-2 text-sm font-semibold text-[#15803D] shadow-sm transition-colors active:bg-[#F0FDF4]"
              >
                <LayoutGrid className="h-4 w-4 text-[#16A34A]" />
                {t('nav.allCategories')}
                <ChevronDown className="h-3.5 w-3.5 text-[#16A34A]" />
              </button>

              <div aria-hidden className="h-8 w-px shrink-0 bg-[#CBD5E1]" />

              {/* Delivery trust signal — static copy, no admin/API backing,
                  purely a visual trust cue matching the approved reference. */}
              <div className="flex min-w-0 items-center gap-2">
                <Truck className="h-5 w-5 shrink-0 text-[#2563EB]" strokeWidth={2} />
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-xs font-bold text-[#0F172A]">{t('header.delivery.title')}</p>
                  <p className="truncate text-[11px] font-medium text-[#64748B]">{t('header.delivery.subtitle')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <CategoryDrawer open={categoryDrawerOpen} onOpenChange={setCategoryDrawerOpen} />

      {/* Cart Drawer */}
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />

      {/* Mobile Navigation */}
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </>
  );
}