'use client';

import { motion } from 'framer-motion';
import { Play, Pause, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoOverlayProps {
  type: 'play' | 'pause' | 'loading';
  onClick?: () => void;
  className?: string;
}

export function VideoOverlay({ type, onClick, className }: VideoOverlayProps) {
  const getIcon = () => {
    switch (type) {
      case 'play':
        return <Play className="h-12 w-12 ml-1" />;
      case 'pause':
        return <Pause className="h-12 w-12" />;
      case 'loading':
        return <Loader2 className="h-12 w-12 animate-spin" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'play':
        return 'bg-[#FF3B5C]/90 hover:bg-[#FF3B5C]';
      case 'pause':
        return 'bg-white/20 hover:bg-white/30';
      case 'loading':
        return 'bg-transparent';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn(
        'absolute inset-0 flex items-center justify-center cursor-pointer',
        type === 'loading' && 'bg-[#0B0B0D]/50',
        className
      )}
      onClick={onClick}
    >
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={cn(
          'flex items-center justify-center rounded-full shadow-2xl transition-all duration-200 backdrop-blur-sm',
          getBgColor(),
          type === 'play' ? 'w-20 h-20 text-white' : 'w-16 h-16 text-white'
        )}
      >
        {getIcon()}
      </motion.div>
    </motion.div>
  );
}