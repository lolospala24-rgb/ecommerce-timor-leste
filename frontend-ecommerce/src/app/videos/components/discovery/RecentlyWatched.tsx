'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';   // ✅ lowercase
import { Badge } from '@/components/ui/badge';     // ✅ lowercase
import { Clock, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WatchedVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  progress: number;
  watchedAt: string;
}

const mockWatchedVideos: WatchedVideo[] = [
  {
    id: '1',
    title: 'Glowing skin in 5 simple steps',
    thumbnail: '/thumbnails/1.jpg',
    duration: 45,
    progress: 65,
    watchedAt: '2 hours ago',
  },
  {
    id: '2',
    title: 'Night skincare routine',
    thumbnail: '/thumbnails/2.jpg',
    duration: 50,
    progress: 30,
    watchedAt: '5 hours ago',
  },
];

interface RecentlyWatchedProps {
  className?: string;
}

export function RecentlyWatched({ className }: RecentlyWatchedProps) {
  const { isAuthenticated } = useAuthStore();
  const [watchedVideos, setWatchedVideos] = useState<WatchedVideo[]>(mockWatchedVideos);

  if (!isAuthenticated || watchedVideos.length === 0) {
    return null;
  }

  const handleRemove = (videoId: string) => {
    setWatchedVideos((prev) => prev.filter((v) => v.id !== videoId));
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#A3A3A3]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
            Recently Watched
          </h3>
        </div>
        <button
          onClick={() => setWatchedVideos([])}
          className="text-xs text-[#A3A3A3] hover:text-white transition-colors"
        >
          Clear
        </button>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {watchedVideos.map((video) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-3 p-2 rounded-lg hover:bg-[#1C1C1C] transition-all duration-200 group"
            >
              {/* Thumbnail */}
              <Link href={`/videos/${video.id}`} className="relative flex-shrink-0">
                <div className="relative h-14 w-24 rounded-lg overflow-hidden bg-[#0B0B0D]">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D] to-transparent opacity-30" />
                  {/* Progress bar */}
                  <div
                    className="absolute bottom-0 left-0 h-0.5 bg-[#FF3B5C]"
                    style={{ width: `${video.progress}%` }}
                  />
                  <Play className="absolute inset-0 m-auto h-5 w-5 text-white/30" />
                </div>
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link href={`/videos/${video.id}`}>
                  <p className="text-sm font-medium text-white hover:text-[#6366F1] transition-colors line-clamp-1">
                    {video.title}
                  </p>
                </Link>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[#A3A3A3]">{video.duration}s</span>
                  <span className="text-xs text-[#A3A3A3]">•</span>
                  <span className="text-xs text-[#A3A3A3]">{video.watchedAt}</span>
                  <Badge className="bg-[#6366F1]/10 text-[#6366F1] text-[10px] px-1.5 py-0 h-4">
                    {video.progress}%
                  </Badge>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C] opacity-0 group-hover:opacity-100 transition-all"
                onClick={() => handleRemove(video.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}