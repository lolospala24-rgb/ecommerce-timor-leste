'use client';

import { useState, useEffect, useRef, RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface VideoTimelineProps {
  videoRef: RefObject<HTMLVideoElement>;
  isVisible: boolean;
  onSeek: (time: number) => void;
  className?: string;
}

export function VideoTimeline({
  videoRef,
  isVisible,
  onSeek,
  className,
}: VideoTimelineProps) {
  const [hoverTime, setHoverTime] = useState(0);
  const [hoverProgress, setHoverProgress] = useState(0);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const handleTimeUpdate = () => {
      // In real implementation, we'd fetch thumbnail from backend
      // For now, we use a placeholder
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [videoRef]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const clampedX = Math.max(0, Math.min(1, x));
    const time = clampedX * (videoRef.current?.duration || 0);
    setHoverTime(time);
    setHoverProgress(clampedX * 100);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const clampedX = Math.max(0, Math.min(1, x));
    const time = clampedX * (videoRef.current?.duration || 0);
    onSeek(time);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={timelineRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={cn(
            'absolute bottom-20 left-0 right-0 px-4 pointer-events-none',
            className
          )}
        >
          <div
            className="relative h-8 rounded-lg bg-[#0B0B0D]/80 backdrop-blur-sm border border-[rgba(255,255,255,0.08)] pointer-events-auto cursor-pointer"
            onMouseMove={handleMouseMove}
            onClick={handleClick}
            onMouseLeave={() => {
              setHoverTime(0);
              setHoverProgress(0);
            }}
          >
            {/* Progress Line */}
            <div className="absolute inset-0 flex items-center px-2">
              <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FF3B5C] rounded-full transition-all duration-150"
                  style={{ width: `${hoverProgress}%` }}
                />
              </div>
            </div>

            {/* Thumbnail Preview */}
            {hoverTime > 0 && (
              <div
                className="absolute -top-24 transform -translate-x-1/2"
                style={{ left: `${hoverProgress}%` }}
              >
                <div className="bg-[#0B0B0D] rounded-lg overflow-hidden border border-[rgba(255,255,255,0.08)] shadow-2xl">
                  <div className="w-40 aspect-video bg-gradient-to-br from-[#FF3B5C]/20 to-[#6366F1]/20 flex items-center justify-center">
                    <span className="text-xs text-white/40">Preview</span>
                  </div>
                  <div className="px-2 py-1 text-center">
                    <span className="text-xs text-white font-mono">
                      {formatTime(hoverTime)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}