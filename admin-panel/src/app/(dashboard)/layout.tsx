'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, requireAdmin } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isLoading && isClient) {
      // Check if user is authenticated
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      // Check if user has admin role
      if (user?.role !== 'ADMIN') {
        router.push('/unauthorized');
        return;
      }
    }
  }, [isAuthenticated, isLoading, router, user, isClient]);

  // Show loading state
  if (!isClient || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not authenticated or not admin, don't render
  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50 print:block print:h-auto print:bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden print:overflow-visible print:block">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 print:overflow-visible print:h-auto print:p-0">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}