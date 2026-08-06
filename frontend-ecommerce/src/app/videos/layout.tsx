'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/stores/uiStore';

interface VideoShopLayoutProps {
  children: ReactNode;
}

export default function VideoShopLayout({ children }: VideoShopLayoutProps) {
  const pathname = usePathname();
  const { toggleSidebar } = useUIStore(); // ✅ Fix: Use toggleSidebar instead of setSidebarOpen

  // Check if we're on a single video page
  const isSingleVideo = pathname?.includes('/videos/') && 
    !pathname?.includes('/videos/') && 
    !pathname?.includes('/videos/search');

  // Close sidebar on route change (mobile)
  useEffect(() => {
    // Close sidebar when route changes
    const sidebar = document.querySelector('[data-sidebar]');
    if (sidebar) {
      // You can add logic here to close sidebar
    }
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#0B0B0D]">
      <div className="container mx-auto px-4 py-6 max-w-[1600px]">
        {children}
      </div>
    </div>
  );
}