'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Volume2, VolumeX, Play, Loader2, Heart } from 'lucide-react';
import { Video } from '@/types/video';

interface VideoPlayerProps {
  video: Video;
  isActive: boolean;
  onEnded?: () => void;
  /** Double-tap gesture (TikTok-style) — always likes, never unlikes. Returns
   *  false when the like couldn't happen (e.g. logged out), in which case
   *  no heart-burst animation should play. */
  onDoubleTapLike?: () => boolean;
}

const DOUBLE_TAP_WINDOW_MS = 300;

export function VideoPlayer({ video, isActive, onEnded, onDoubleTapLike }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTapRef = useRef(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [heartBurstKey, setHeartBurstKey] = useState(0);
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (isActive) {
      const playPromise = el.play();
      if (playPromise) playPromise.catch(() => {});
      setIsPaused(false);
    } else {
      el.pause();
    }
  }, [isActive]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
      setIsPaused(false);
    } else {
      el.pause();
      setIsPaused(true);
    }
  };

  const triggerHeartBurst = () => {
    const shouldAnimate = onDoubleTapLike ? onDoubleTapLike() : true;
    if (!shouldAnimate) return;
    setHeartBurstKey((key) => key + 1);
    setShowHeartBurst(true);
  };

  const handleVideoTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_WINDOW_MS) {
      // Confirmed double tap — cancel the pending single-tap play/pause.
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapRef.current = 0;
      triggerHeartBurst();
      return;
    }

    lastTapRef.current = now;
    singleTapTimerRef.current = setTimeout(() => {
      togglePlay();
      singleTapTimerRef.current = null;
    }, DOUBLE_TAP_WINDOW_MS);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-neutral-100">
      <video
        ref={videoRef}
        src={video.videoUrl}
        poster={video.thumbnailUrl ?? undefined}
        className="h-full w-full object-cover"
        loop
        muted={isMuted}
        playsInline
        preload="metadata"
        onClick={handleVideoTap}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onLoadedData={() => setIsLoading(false)}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration > 0) setProgress(el.currentTime / el.duration);
        }}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        onEnded={onEnded}
        aria-label={video.title}
      />

      {isLoading && !hasError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      {isPaused && !isLoading && !hasError && (
        <button
          type="button"
          onClick={handleVideoTap}
          aria-label="Play video"
          className="absolute inset-0 flex items-center justify-center bg-black/20"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg">
            <Play className="h-7 w-7 translate-x-0.5 fill-neutral-900 text-neutral-900" />
          </span>
        </button>
      )}

      <AnimatePresence onExitComplete={() => setShowHeartBurst(false)}>
        {showHeartBurst && (
          <motion.div
            key={heartBurstKey}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.15, 1, 1.05] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, times: [0, 0.25, 0.7, 1] }}
            onAnimationComplete={() => setShowHeartBurst(false)}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <Heart className="h-24 w-24 fill-white text-white drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={toggleMute}
        aria-label={isMuted ? 'Unmute video' : 'Mute video'}
        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-sm backdrop-blur transition hover:bg-white"
      >
        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/25">
        <div className="h-full bg-white transition-[width]" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
      </div>
    </div>
  );
}
