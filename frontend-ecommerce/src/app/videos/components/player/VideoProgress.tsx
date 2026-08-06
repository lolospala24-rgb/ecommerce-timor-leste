'use client';

import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface VideoProgressProps {
  progress: number;
  currentTime: number;
  duration: number;
  onChange: (value: number[]) => void;
  onDrag?: (value: number[]) => void;
  formatTime: (seconds: number) => string;
  className?: string;
}

export function VideoProgress({
  progress,
  currentTime,
  duration,
  onChange,
  onDrag,
  formatTime,
  className,
}: VideoProgressProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleValueChange = (value: number[]) => {
    setIsDragging(true);
    onDrag?.(value);
  };

  const handleValueCommit = (value: number[]) => {
    setIsDragging(false);
    onChange(value);
  };

  const displayTime = isDragging ? currentTime : currentTime;

  return (
    <div
      className={cn('relative group', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Slider
        value={[progress]}
        max={100}
        step={0.1}
        onValueChange={handleValueChange}
        onValueCommit={handleValueCommit}
        className="cursor-pointer"
      />

      {/* Time Tooltip */}
      {isHovered && !isDragging && (
        <div
          className="absolute -top-8 text-xs text-white bg-[#0B0B0D]/90 px-2 py-1 rounded"
          style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
        >
          {formatTime((progress / 100) * duration)}
        </div>
      )}

      {isDragging && (
        <div
          className="absolute -top-8 text-xs text-white bg-[#0B0B0D]/90 px-2 py-1 rounded"
          style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
        >
          {formatTime((progress / 100) * duration)}
        </div>
      )}
    </div>
  );
}