'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause } from 'lucide-react';

import { VideoControls } from './VideoControls';
import { VideoProgress } from './VideoProgress';
import { VideoTimeline } from './VideoTimeline';
import { VideoLoading } from './VideoLoading';
import { VideoOverlay } from './VideoOverlay';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  duration?: number;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  onProgress?: (progress: number, currentTime: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

interface VideoQualityOption {
  label: string;
  value: string;
  bitrate?: number;
}

const QUALITY_OPTIONS: VideoQualityOption[] = [
  { label: 'Auto', value: 'auto' },
  { label: '1080p', value: '1080p', bitrate: 8000 },
  { label: '720p', value: '720p', bitrate: 5000 },
  { label: '480p', value: '480p', bitrate: 2500 },
  { label: '360p', value: '360p', bitrate: 1000 },
];

export function VideoPlayer({
  src,
  poster,
  title,
  duration,
  autoPlay = false,
  loop = false,
  muted = false,
  onProgress,
  onComplete,
  onError,
  className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [durationState, setDurationState] = useState<number>(duration || 0);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // ✅ Fixed: Added initial value
  // Note: VideoControls currently doesn't use quality switching; keep state minimal
  const [quality] = useState<VideoQualityOption>(QUALITY_OPTIONS[0]);


  const [playbackRate, setPlaybackRate] = useState(1);
  const [isPiP, setIsPiP] = useState(false);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);


  // Video event handlers
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || isDragging) return;
    const progress = (video.currentTime / video.duration) * 100;
    setProgress(progress);
    setCurrentTime(video.currentTime);
    onProgress?.(progress, video.currentTime);
  }, [isDragging, onProgress]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDurationState(video.duration);
  }, []);

  const handleWaiting = useCallback(() => setIsBuffering(true), []);
  const handleCanPlay = useCallback(() => setIsBuffering(false), []);
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    onComplete?.();
  }, [onComplete]);

  const handleError = useCallback(() => {
    onError?.(new Error('Video playback error'));
  }, [onError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = muted;
    setIsMuted(muted);

    if (autoPlay) {
      video.play().catch(() => {
        setIsPlaying(false);
      });
      setIsPlaying(true);
      return;
    }

    video.pause();
    setIsPlaying(false);
  }, [autoPlay, muted, src]);

  // Controls
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else {
        await video.requestPictureInPicture();
        setIsPiP(true);
      }
    } catch (error) {
      console.error('PiP error:', error);
    }
  }, []);

  const handleSkipForward = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(video.currentTime + 10, video.duration);
  }, []);

  const handleSkipBackward = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(video.currentTime - 10, 0);
  }, []);

  const handleProgressChange = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video) return;
    const time = (value / 100) * video.duration;
    video.currentTime = time;
    setProgress(value);
    setCurrentTime(time);
    setIsDragging(false);
  }, []);

  const handleProgressDrag = useCallback((value: number) => {
    setIsDragging(true);
    const video = videoRef.current;
    if (!video) return;
    const time = (value / 100) * video.duration;
    setCurrentTime(time);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          toggleMute();
          break;
        case 'ArrowRight':
          handleSkipForward();
          break;
        case 'ArrowLeft':
          handleSkipBackward();
          break;
        case 'i':
          togglePiP();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleFullscreen, toggleMute, handleSkipForward, handleSkipBackward, togglePiP]);

  // Auto-hide controls
  useEffect(() => {
    if (showControls) {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      controlsTimeout.current = setTimeout(() => {
        if (isPlaying && !isHovered) {
          setShowControls(false);
        }
      }, 3000);
    }
    return () => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    };
  }, [showControls, isPlaying, isHovered]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative aspect-[9/16] rounded-2xl overflow-hidden bg-[#0B0B0D] group',
        className
      )}
      onMouseEnter={() => {
        setIsHovered(true);
        setShowControls(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        if (isPlaying) {
          setTimeout(() => setShowControls(false), 2000);
        }
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-cover"
        onClick={togglePlay}
        playsInline
        loop={loop}
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onEnded={handleEnded}
        onError={handleError}
      />

      {/* Loading State */}
      <AnimatePresence>
        {isBuffering && <VideoLoading />}
      </AnimatePresence>

      {/* Overlay (Play/Pause) */}
      <AnimatePresence>
        {!isPlaying && !isBuffering && (
          <VideoOverlay type="play" onClick={togglePlay} />
        )}
      </AnimatePresence>

      {/* Controls */}
      <AnimatePresence>
        {showControls && (
          <VideoControls
            isPlaying={isPlaying}
            progress={progress}
            currentTime={currentTime}
            duration={durationState}
            onPlayPause={togglePlay}
            onProgressChange={handleProgressChange}
            formatTime={formatTime}
          />
        )}
      </AnimatePresence>

      {/* Timeline Preview (on hover) */}
      <AnimatePresence>
        {isHovered && showControls && (
          <VideoTimeline
            videoRef={videoRef as React.RefObject<HTMLVideoElement>}
            isVisible={isHovered}
            onSeek={(time) => {
              if (videoRef.current) {
                videoRef.current.currentTime = time;
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Title Overlay (when controls are hidden) */}
      {!showControls && title && (
        <div className="absolute top-4 left-4 right-4 pointer-events-none">
          <motion.h3
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-white text-sm font-medium drop-shadow-lg line-clamp-1"
          >
            {title}
          </motion.h3>
        </div>
      )}
    </div>
  );
}