'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { cn } from '@/lib/utils';

interface VideoLayoutProps {
  children: ReactNode;
  videoId?: string;
  className?: string;
  showLeftSidebar?: boolean;
  showRightSidebar?: boolean;
}

export function VideoLayout({
  children,
  videoId,
  className,
  showLeftSidebar = true,
  showRightSidebar = true,
}: VideoLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-[#0B0B0D] text-white', className)}>
      <div className="container mx-auto px-4 py-6 lg:px-6 xl:px-8 max-w-[1600px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(720px,760px)_300px] xl:grid-cols-[240px_minmax(720px,760px)_320px] xl:gap-8">
          {/* Left Sidebar - Discovery */}
          {showLeftSidebar && (
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:col-span-1"
            >
              <LeftSidebar />
            </motion.aside>
          )}

          {/* Main Content - Video Player */}
          <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={cn(
              'w-full lg:col-span-1 xl:col-span-1 mx-auto max-w-[760px]',
              !showLeftSidebar && 'lg:col-span-2 xl:col-span-2',
              !showRightSidebar && 'lg:col-span-2 xl:col-span-2',
              !showLeftSidebar && !showRightSidebar && 'lg:col-span-3 xl:col-span-3'
            )}
          >
            {children}
          </motion.main>

          {/* Right Sidebar - Creator & Products */}
          {showRightSidebar && (
            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="lg:col-span-1"
            >
              <RightSidebar videoId={videoId} />
            </motion.aside>
          )}
        </div>
      </div>
    </div>
  );
}