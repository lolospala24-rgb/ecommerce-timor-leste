'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, 
  ShoppingBag, 
  MapPin, 
  Heart, 
  Star, 
  Settings, 
  LogOut,
  Package
} from 'lucide-react';

const menuItems = [
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/orders', label: 'My Orders', icon: ShoppingBag },
  { href: '/addresses', label: 'Addresses', icon: MapPin },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/reviews', label: 'My Reviews', icon: Star },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/account/profile');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="container-custom py-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1 space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="md:col-span-3">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="container-custom py-6 md:py-8">
      <div className="grid gap-6 md:grid-cols-4">
        {/* Sidebar */}
        <div className="md:col-span-1 space-y-4">
          {/* User Card */}
          <div className="rounded-lg border p-4 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
              </span>
            </div>
            <h3 className="mt-2 font-semibold">{user.name}</h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {user.role === 'SELLER' && (
              <span className="mt-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                Seller
              </span>
            )}
          </div>

          {/* Navigation */}
          <nav className="rounded-lg border p-2 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={`/account${item.href}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            
            <div className="border-t pt-2 mt-2">
              <button
                onClick={() => logout()}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="md:col-span-3">
          {children}
        </div>
      </div>
    </div>
  );
}