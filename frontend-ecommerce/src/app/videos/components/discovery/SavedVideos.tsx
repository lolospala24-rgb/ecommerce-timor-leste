'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Clock, Play, Heart, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SavedVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  views: number;
  creator: {
    name: string;
    avatar: string;
  };
  savedAt: string;
}

const mockSavedVideos: SavedVideo[] = [
  {
    id: '1',
    title: 'Glowing skin in 5 simple steps',
    thumbnail: '/thumbnails/1.jpg',
    duration: 45,
    views: 12000,
    creator: {
      name: 'BeautyByLiha',
      avatar: '/avatars/1.jpg',
    },
    savedAt: '2 days ago',
  },
  {
    id: '2',
    title: 'Night skincare routine',
    thumbnail: '/thumbnails/2.jpg',
    duration: 50,
    views: 8400,
    creator: {
      name: 'GlowWithMia',
      avatar: '/avatars/2.jpg',
    },
    savedAt: '5 days ago',
  },
];

interface SavedVideosProps {
  className?: string;
}

export function SavedVideos({ className }: SavedVideosProps) {
  const { isAuthenticated } = useAuthStore();
  const [savedVideos, setSavedVideos] = useState<SavedVideo[]>(mockSavedVideos);

  if (!isAuthenticated) {
    return (
      <div className={cn('p-4 bg-[#151515] rounded-xl text-center border border-[rgba(255,255,255,0.05)]', className)}>
        <Bookmark className="h-8 w-8 mx-auto text-[#A3A3A3]/30 mb-2" />
        <p className="text-sm text-[#A3A3A3]">Sign in to save videos</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 text-[#A3A3A3] border-[rgba(255,255,255,0.08)] hover:text-white hover:bg-[#1C1C1C]"
          asChild
        >
          <Link href="/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  if (savedVideos.length === 0) {
    return (
      <div className={cn('p-4 bg-[#151515] rounded-xl text-center border border-[rgba(255,255,255,0.05)]', className)}>
        <Bookmark className="h-8 w-8 mx-auto text-[#A3A3A3]/30 mb-2" />
        <p className="text-sm text-[#A3A3A3]">No saved videos</p>
        <p className="text-xs text-[#A3A3A3]/60">
          Save videos you want to watch later
        </p>
      </div>
    );
  }

  const handleRemove = (videoId: string) => {
    setSavedVideos((prev) => prev.filter((v) => v.id !== videoId));
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
          Saved Videos
          <span className="ml-1.5 text-[#A3A3A3]/60 text-[10px]">({savedVideos.length})</span>
        </h3>
        <Link
          href="/videos/saved"
          className="text-xs text-[#6366F1] hover:underline"
        >
          View All
        </Link>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {savedVideos.map((video) => (
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
                <div className="relative h-16 w-28 rounded-lg overflow-hidden bg-[#0B0B0D]">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D] to-transparent opacity-30" />
                  <div className="absolute bottom-1 right-1 bg-[#0B0B0D]/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {video.duration}s
                  </div>
                  <Play className="absolute inset-0 m-auto h-6 w-6 text-white/50" />
                </div>
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link href={`/videos/${video.id}`}>
                  <p className="text-sm font-medium text-white hover:text-[#6366F1] transition-colors line-clamp-1">
                    {video.title}
                  </p>
                </Link>
                <Link href={`/creators/${video.creator.name}`}>
                  <p className="text-xs text-[#A3A3A3] hover:text-white transition-colors">
                    {video.creator.name}
                  </p>
                </Link>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[#A3A3A3]">
                    {video.views.toLocaleString()} views
                  </span>
                  <span className="text-xs text-[#A3A3A3]">•</span>
                  <span className="text-xs text-[#A3A3A3]">
                    {video.savedAt}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#A3A3A3] hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                onClick={() => handleRemove(video.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}