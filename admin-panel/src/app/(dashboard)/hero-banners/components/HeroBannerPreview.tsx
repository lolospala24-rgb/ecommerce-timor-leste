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

        <div className="grid grid-cols-2 gap-4 rounded-2xl border bg-slate-50 p-5">
          <div className="flex flex-col justify-center gap-2">
            {banner.badge && (
              <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                {banner.badge}
              </span>
            )}
            <h3 className="text-lg font-bold leading-tight">{banner.title}</h3>
            {banner.subtitle && (
              <p className="text-xs text-muted-foreground">{banner.subtitle}</p>
            )}
            <span className="mt-1 w-fit rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              {banner.buttonText || 'Shop Now'}
            </span>
          </div>
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
            <Image src={banner.desktopImage} alt={banner.title} fill className="object-cover" unoptimized />
          </div>
        </div>

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
