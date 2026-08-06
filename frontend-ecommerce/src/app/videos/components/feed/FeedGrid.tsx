'use client';

import { motion } from 'framer-motion';
import { VideoCard } from '../player/VideoCard';
import { Video } from '@/types/video';

interface FeedGridProps {
  videos: Video[];
  viewMode: 'grid' | 'list';
  onVideoSelect: (id: string) => void;
}

export function FeedGrid({ videos, viewMode, onVideoSelect }: FeedGridProps) {
  const gridClass = viewMode === 'grid'
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
    : 'grid grid-cols-1 gap-4';

  return (
    <div className={gridClass}>
      {videos.map((video, index) => (
        <motion.div
          key={video.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(index * 0.05, 0.5) }}
          onClick={() => onVideoSelect(video.id)}
          className="cursor-pointer"
        >
          <VideoCard
            video={video}
            variant={viewMode === 'list' ? 'horizontal' : 'vertical'}
            showCreator
            showActions={viewMode === 'list'}
          />
        </motion.div>
      ))}
    </div>
  );
}