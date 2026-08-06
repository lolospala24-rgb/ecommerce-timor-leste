'use client';

import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoProgress } from './VideoProgress';
import { cn } from '@/lib/utils';

interface VideoControlsProps {
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onProgressChange: (value: number) => void;
  formatTime: (seconds: number) => string;
}

export function VideoControls({
  isPlaying,
  progress,
  currentTime, // ✅ This is available
  duration,
  onPlayPause,
  onProgressChange,
  formatTime,
}: VideoControlsProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0B0B0D] to-transparent">
      {/* ✅ Pass currentTime to VideoProgress */}
      <VideoProgress
        progress={progress}
        currentTime={currentTime} // ✅ ADD THIS
        onChange={(value: number[]) => onProgressChange(value[0])}
        formatTime={formatTime}
        duration={duration}
      />

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={onPlayPause}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <span className="text-xs text-white/60 font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <Volume2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}