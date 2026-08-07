'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '../ui/Tooltip';
import { ShareModal } from '../share/ShareModal';
import { cn } from '@/lib/utils';

interface ShareButtonProps {
  videoId: string;
  initialShares?: number;
  variant?: 'floating' | 'inline';
  size?: 'default' | 'lg';
}

export function ShareButton({ videoId, initialShares = 0, variant = 'inline', size = 'default' }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isFloating = variant === 'floating';
  const isLarge = size === 'lg';

  return (
    <>
      <div className="flex flex-col items-center">
        <Tooltip content="Share">
          <Button
            variant="ghost"
            size={isFloating ? 'icon' : 'default'}
            className={cn(
              'text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]',
              isFloating && 'h-12 w-12 rounded-full relative'
            )}
            onClick={() => setIsOpen(true)}
          >
            <Share2 className={isLarge ? 'h-6 w-6' : 'h-5 w-5'} />
            {!isFloating && <span className="ml-2 text-sm">{initialShares > 0 ? initialShares : 'Share'}</span>}
            {isFloating && initialShares > 0 && (
              <span className="absolute -bottom-1 text-[10px] text-[#A3A3A3]">{initialShares}</span>
            )}
          </Button>
        </Tooltip>
      </div>

      <ShareModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        url={`${typeof window !== 'undefined' ? window.location.origin : ''}/videos/${videoId}`}
        title="Share Video"
      />
    </>
  );
}