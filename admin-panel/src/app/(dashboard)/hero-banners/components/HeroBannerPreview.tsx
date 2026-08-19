'use client';

import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/formatters';
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
          <DialogTitle>Preview</DialogTitle>
        </DialogHeader>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
          <Image src={banner.desktopImage} alt={banner.title} fill className="object-cover" unoptimized />
          <div className="absolute inset-0 flex flex-col justify-center gap-2 bg-gradient-to-r from-black/60 via-black/20 to-transparent p-6 text-white">
            {banner.badge && (
              <span className="w-fit rounded bg-white/20 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">{banner.badge}</span>
            )}
            <h3 className="text-xl font-bold leading-tight">{banner.title}</h3>
            {banner.subtitle && <p className="text-sm text-white/90">{banner.subtitle}</p>}
            {banner.description && <p className="text-xs text-white/75">{banner.description}</p>}
            {(banner.price !== null || banner.comparePrice !== null) && (
              <div className="flex items-center gap-2">
                {banner.price !== null && <span className="text-lg font-bold">{formatCurrency(banner.price)}</span>}
                {banner.comparePrice !== null && (
                  <span className="text-sm text-white/60 line-through">{formatCurrency(banner.comparePrice)}</span>
                )}
              </div>
            )}
            {banner.buttonText && (
              <span className="mt-1 w-fit rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black">
                {banner.buttonText}
              </span>
            )}
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
