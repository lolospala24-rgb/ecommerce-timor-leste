'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Video } from '@/types/video';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContinueWatchingItem {
  video: Video;
  progress: number;
  lastWatched: string;
}

interface ContinueWatchingProps {
  items: ContinueWatchingItem[];
  title?: string;
  className?: string;
  onRemove?: (videoId: string) => void;
}

export function ContinueWatching({
  items,
  title = 'Continue Watching',
  className,
  onRemove,
}: ContinueWatchingProps) {
  const [visibleItems, setVisibleItems] = useState(items);

  const handleRemove = (videoId: string) => {
    setVisibleItems((prev) => prev.filter((item) => item.video.id !== videoId));
    onRemove?.(videoId);
  };

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <div className="space-y-2">
        {visibleItems.slice(0, 5).map((item) => (
          <div
            key={item.video.id}
            className="flex items-center gap-3 p-2 rounded-lg bg-[#151515] border border-[rgba(255,255,255,0.05)] hover:border-[#6366F1]/20 transition-all duration-200 group"
          >
            <Link
              href={`/videos/${item.video.id}`}
              className="relative flex-shrink-0"
            >
              <div className="relative h-14 w-24 rounded-lg overflow-hidden bg-[#0B0B0D]">
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D] to-transparent opacity-30" />
                <Play className="absolute inset-0 m-auto h-5 w-5 text-white/30" />
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#1C1C1C]">
                  <div
                    className="h-full bg-[#FF3B5C] rounded-full transition-all duration-300"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            </Link>

            <div className="flex-1 min-w-0">
              <Link href={`/videos/${item.video.id}`}>
                <p className="text-sm font-medium text-white hover:text-[#6366F1] transition-colors line-clamp-1">
                  {item.video.title}
                </p>
              </Link>
              <div className="flex items-center gap-2 text-xs text-[#A3A3A3]">
                <Clock className="h-3 w-3" />
                <span>{item.progress}% watched</span>
                <span>•</span>
                <span>{item.lastWatched}</span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[#A3A3A3] hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
              onClick={() => handleRemove(item.video.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}