'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useVideo } from '@/hooks/useVideo';
import { VideoCard } from '../../components/player/VideoCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RightSidebarProps {
  videoId?: string;
  className?: string;
}

export function RightSidebar({ videoId, className }: RightSidebarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const { video, recommendations, isLoading } = useVideo(videoId || '');

  useEffect(() => {
    const handleResize = () => {
      setIsVisible(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isVisible) return null;

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-24 w-full rounded-2xl bg-[#151515]" />
        <Skeleton className="h-24 w-full rounded-2xl bg-[#151515]" />
        <Skeleton className="h-24 w-full rounded-2xl bg-[#151515]" />
      </div>
    );
  }

  if (!video) {
    return null;
  }

  return (
    <div className={cn('sticky top-6 space-y-4 max-h-[calc(100vh-3rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-[#1C1C1C]', className)}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-[24px] border border-white/10 bg-[#111114]/85 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)]"
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-full bg-[#FF3B5C]/10 p-2 text-[#FF3B5C]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Recommended for you</h3>
            <p className="text-xs text-[#A3A3A3]">Short-form shopping picks</p>
          </div>
        </div>

        {recommendations && recommendations.length > 0 ? (
          <div className="space-y-2">
            {recommendations.slice(0, 6).map((item: any) => (
              <VideoCard key={item.id} video={item} variant="compact" showCreator={false} showActions={false} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#151515]/60 p-4 text-sm text-[#A3A3A3]">
            No recommendations available yet.
          </div>
        )}
      </motion.div>
    </div>
  );
}