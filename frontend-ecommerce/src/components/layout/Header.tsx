'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useCart } from '@/hooks/useCart';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { usePublicSettings } from '@/hooks/usePublicSettings';
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
import { TopHeader } from './TopHeader';
import { CartDrawer } from './CartDrawer';
import { MobileNav } from './MobileNav';
import {
  Search,
  ShoppingCart,
  User,
  LogOut,
  Settings,
  Heart,
  Menu,
  Moon,
  Sun,
  Monitor,
  X,
  Bell,
  CheckCheck,
  Trash2,
} from 'lucide-react';
import { Play } from 'lucide-react';

export function Header() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { data: publicSettings } = usePublicSettings();
  const { totalItems, subtotal: cartSubtotal } = useCart();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useOrderNotifications();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { cartOpen, setCartOpen } = useUIStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [checkoutPreview, setCheckoutPreview] = useState({
    shippingCost: 0,
    taxRate: 0,
    serviceFee: 0,
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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

      {/* Main Header */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="container-custom">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo — the site name/logo are admin-editable (Settings → General),
                so this reads real data instead of a hardcoded brand. */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              {publicSettings?.logoUrl ? (
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg">
                  <Image src={publicSettings.logoUrl} alt={publicSettings.siteName} fill sizes="32px" className="object-contain" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {(publicSettings?.siteName || 'E').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="font-bold text-lg hidden sm:block">
                {publicSettings?.siteName || 'E-Commerce'}
              </span>
            </Link>

            {/* Search Bar - Desktop */}
            {/* Main Navigation - Desktop */}
            <nav className="hidden md:flex items-center gap-4 mr-6">
            
              <Link href="/videos" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                <Play className="h-4 w-4" />
                <span>Video Shop</span>
              </Link>
             
            </nav>

            <div className="hidden md:block flex-1 max-w-md">
              <SearchAiBar className="w-full" />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Search Button - Mobile */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-4 w-4" />
              </Button>

              {/* Theme Toggle removed from here - moved to TopHeader */}

              {/* Wishlist — hidden on mobile, already reachable via the
                  hamburger menu (MobileNav); keeping it here too just
                  crowded the narrow action row alongside search/cart/user. */}
              <Link href="/account/wishlist" className="hidden md:block">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Heart className="h-4 w-4" />
                </Button>
              </Link>

              {/* Notifications */}
              {isAuthenticated && (
                <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-9 w-9">
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
                        <p className="text-sm font-semibold">Notifications</p>
                        <p className="text-xs text-muted-foreground">
                          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                        </p>
                      </div>
                      {notifications.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={markAllAsRead}>
                            <CheckCheck className="mr-1 h-3.5 w-3.5" />
                            Mark all read
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-destructive hover:text-destructive" onClick={clearNotifications}>
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Clear
                          </Button>
                        </div>
                      )}
                    </div>
                    {cartSubtotal > 0 && (
                      <div className="border-b bg-blue-50/70 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Cart estimate</p>
                            <p className="text-xs text-blue-600/80">Based on your current cart</p>
                          </div>
                        </div>
                        <div className="mt-2 space-y-1 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">Subtotal</span>
                            <span className="font-semibold text-slate-900">${cartSubtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">Shipping (from)</span>
                            <span className="font-semibold text-slate-900">${checkoutPreview.shippingCost.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">Tax</span>
                            <span className="font-semibold text-slate-900">${previewTax.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">Service fee</span>
                            <span className="font-semibold text-slate-900">${checkoutPreview.serviceFee.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between border-t border-blue-100 pt-1 text-sm font-semibold text-primary">
                            <span>Estimated total</span>
                            <span>${previewGrandTotal.toFixed(2)}</span>
                          </div>
                          <p className="pt-0.5 text-[11px] text-blue-600/70">Final total is calculated at checkout.</p>
                        </div>
                      </div>
                    )}
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`cursor-pointer border-b px-4 py-3 transition hover:bg-muted/50 ${notification.isRead ? 'bg-white' : 'bg-blue-50/70'}`}
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

              {/* Cart */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 relative"
                onClick={() => setCartOpen(true)}
              >
                <ShoppingCart className="h-4 w-4" />
                {totalItems > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-600">
                    {totalItems > 9 ? '9+' : totalItems}
                  </Badge>
                )}
              </Button>

              {/* User Menu */}
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.avatar ?? undefined} alt={user?.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {user?.name ? getInitials(user.name) : 'U'}
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
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/account/orders')}>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      My Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/account/wishlist')}>
                      <Heart className="mr-2 h-4 w-4" />
                      Wishlist
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/account/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => logout()} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/login">
                  <Button variant="default" size="sm" className="h-9">
                    Sign In
                  </Button>
                </Link>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9"
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Search Dialog */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-background md:hidden">
          <div className="flex items-center gap-2 border-b p-4">
            <SearchAiBar
              className="flex-1"
              autoFocus
              onNavigate={() => setSearchOpen(false)}
            />
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />

      {/* Mobile Navigation */}
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </>
  );
}