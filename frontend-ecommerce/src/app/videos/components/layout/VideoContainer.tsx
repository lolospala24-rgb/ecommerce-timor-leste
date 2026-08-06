'use client';

import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VideoPlayer } from '../../components/player/VideoPlayer';
import { FloatingActions } from '../../components/actions/FloatingActions';
import { Video } from '@/types/video';
import { cn } from '@/lib/utils';

interface VideoContainerProps {
  video: Video;
  className?: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  children?: ReactNode;
  showFloatingActions?: boolean;
  autoPlay?: boolean;
}

export function VideoContainer({
  video,
  className,
  onProgress,
  onComplete,
  children,
  showFloatingActions = true,
  autoPlay = false,
}: VideoContainerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  return (
    <div
      className={cn('relative', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video Player */}
      <div className="relative mx-auto w-full max-w-[760px] max-h-[700px] aspect-[9/16] rounded-[24px] border border-white/10 bg-[#0B0B0D] shadow-[0_24px_70px_rgba(0,0,0,0.35)] overflow-hidden">
        <VideoPlayer
          src={video.videoUrl}
          poster={video.thumbnailUrl}
          title={video.title}
          duration={video.duration}
          autoPlay={autoPlay}
          onProgress={(progress) => {
            setIsPlaying(progress > 0);
            onProgress?.(progress);
          }}
          onComplete={onComplete}
          className="w-full h-full"
        />

        {/* Floating Actions - Mobile */}
        {showFloatingActions && (
          <FloatingActions video={video} onCommentClick={() => {}} />
        )}

        {/* Video Title Overlay */}
        <AnimatePresence>
          {!isPlaying && !isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-20 left-4 right-24 pointer-events-none"
            >
              <h2 className="text-white text-lg font-semibold drop-shadow-lg line-clamp-2">
                {video.title}
              </h2>
              <p className="text-white/60 text-sm drop-shadow-lg line-clamp-1">
                {video.description}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Count & Date */}
        <div className="absolute bottom-4 left-4 pointer-events-none">
          <div className="flex items-center gap-3 text-xs text-white/60 drop-shadow-lg">
            <span>{(video?.views ?? 0).toLocaleString()} views</span>
            <span>•</span>
            <span>
              {video?.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'Recently added'}
            </span>
          </div>
        </div>
      </div>

      {/* Children (comments, recommendations, etc.) */}
      {children && (
        <div className="mt-6 space-y-6">
          {children}
        </div>
      )}
    </div>
  );
}