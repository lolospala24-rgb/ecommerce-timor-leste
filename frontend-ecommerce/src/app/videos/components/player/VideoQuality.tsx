'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VideoQualityOption {
  label: string;
  value: string;
  bitrate?: number;
}

interface VideoQualityProps {
  currentQuality: VideoQualityOption;
  options: VideoQualityOption[];
  onChange: (quality: VideoQualityOption) => void;
  className?: string;
}

export function VideoQuality({
  currentQuality,
  options,
  onChange,
  className,
}: VideoQualityProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-xs text-white/40 hover:text-white hover:bg-white/10"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Settings className="h-4 w-4 mr-1" />
        {currentQuality.label}
        <ChevronDown className={cn(
          'h-3 w-3 ml-1 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute bottom-full right-0 mb-2 min-w-[140px] bg-[#151515] rounded-lg border border-[rgba(255,255,255,0.08)] shadow-2xl overflow-hidden z-50"
          >
            <div className="p-2 space-y-1">
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-[#A3A3A3]">
                Quality
              </div>
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-all',
                    currentQuality.value === option.value
                      ? 'bg-[#6366F1]/10 text-[#6366F1]'
                      : 'text-white hover:bg-[#1C1C1C]'
                  )}
                >
                  <span>{option.label}</span>
                  {currentQuality.value === option.value && (
                    <Check className="h-4 w-4 text-[#6366F1]" />
                  )}
                  {option.bitrate && (
                    <span className="text-[10px] text-[#A3A3A3] ml-2">
                      {option.bitrate}kbps
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}