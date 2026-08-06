'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShareModal } from './ShareModal';
import { Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoShareProps {
  videoId: string;
  title: string;
  description?: string;
  image?: string;
  className?: string;
  variant?: 'default' | 'floating';
}

export function VideoShare({
  videoId,
  title,
  description,
  image,
  className,
  variant = 'default',
}: VideoShareProps) {
  const [isOpen, setIsOpen] = useState(false);

  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/videos/${videoId}`;

  if (variant === 'floating') {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-12 w-12 rounded-full text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C] transition-all duration-200',
            className
          )}
          onClick={() => setIsOpen(true)}
        >
          <Share2 className="h-5 w-5" />
        </Button>
        <ShareModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          url={url}
          title={title}
          description={description}
          image={image}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        className={cn('gap-2', className)}
        onClick={() => setIsOpen(true)}
      >
        <Share2 className="h-4 w-4" />
        Share
      </Button>
      <ShareModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        url={url}
        title={title}
        description={description}
        image={image}
      />
    </>
  );
}