'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { AlertTriangle } from 'lucide-react';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [checked, setChecked] = useState(false);
  useNotificationSocket();

  useEffect(() => {
    checkAuth().finally(() => setChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!checked || isLoading) return;
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user?.role !== 'SELLER') {
      router.push('/unauthorized');
    }
  }, [checked, isLoading, isAuthenticated, user, router, pathname]);

  if (!checked || isLoading || !isAuthenticated || user?.role !== 'SELLER') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-muted/30">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        {user.seller && !user.seller.isVerified && (
          <div className="flex items-center gap-2 border-b bg-warning/10 px-4 py-2 text-sm text-warning md:px-6">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Your store isn&apos;t verified yet. You can browse your dashboard, but creating products is disabled until an admin verifies your account.
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
