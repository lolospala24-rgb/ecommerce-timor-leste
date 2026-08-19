'use client';

import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { HeroBanner } from '@/hooks/useHeroBanners';

interface HeroBannerPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banner: HeroBanner | null;
}

export function HeroBannerPreview({ open, onOpenChange, banner }: HeroBannerPreviewProps) {
  if (!banner) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{banner.title}</DialogTitle>
        </DialogHeader>
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Desktop Image</p>
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
            <Image src={banner.desktopImage} alt={banner.title} fill className="object-cover" unoptimized />
          </div>
        </div>
        {banner.mobileImage && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Mobile Image</p>
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted">
              <Image src={banner.mobileImage} alt={`${banner.title} (mobile)`} fill className="object-cover" unoptimized />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
