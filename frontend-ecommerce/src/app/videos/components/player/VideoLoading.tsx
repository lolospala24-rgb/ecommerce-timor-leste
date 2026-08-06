'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoLoadingProps {
  className?: string;
  label?: string;
}

export function VideoLoading({ className, label = 'Loading...' }: VideoLoadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'absolute inset-0 flex flex-col items-center justify-center bg-[#0B0B0D]/70 backdrop-blur-sm',
        className
      )}
    >
      <Loader2 className="h-12 w-12 text-[#FF3B5C] animate-spin" />
      {label && (
        <p className="mt-4 text-sm text-white/60 font-medium">{label}</p>
      )}
    </motion.div>
  );
}