'use client';

import { ArrowLeft, Share2, ShoppingCart } from 'lucide-react';
import { ProductImages } from '@/components/products/ProductImages';
import type { GalleryThumbnailItem } from '@/lib/product';

interface ProductMediaHeaderProps {
  images: string[];
  thumbnail?: string | null;
  name: string;
  discount?: number;
  galleryLabel?: string;
  isVariantGallery?: boolean;
  thumbnailGallery?: GalleryThumbnailItem[];
  mainImageUrl?: string | null;
  onThumbnailSelect?: (item: GalleryThumbnailItem) => void;
  onMainImageChange?: (url: string) => void;
  onBack: () => void;
  onShare: () => void;
  onCart: () => void;
  cartCount: number;
}

// Floating circular button matching the reference design — 44px, 94%
// opacity white, sits directly on top of the edge-to-edge gallery image.
function FloatingIconButton({
  label,
  onClick,
  children,
  badgeCount,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  badgeCount?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.94] text-[#142019] shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-transform active:scale-95"
    >
      {children}
      {!!badgeCount && badgeCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B4410F] px-1 text-[10px] font-semibold text-white">
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      )}
    </button>
  );
}

export function ProductMediaHeader({
  images,
  thumbnail,
  name,
  discount,
  galleryLabel,
  isVariantGallery,
  thumbnailGallery,
  mainImageUrl,
  onThumbnailSelect,
  onMainImageChange,
  onBack,
  onShare,
  onCart,
  cartCount,
}: ProductMediaHeaderProps) {
  return (
    <div className="relative">
      <ProductImages
        variant="mobileOverlay"
        images={images}
        thumbnail={thumbnail}
        name={name}
        discount={discount}
        galleryLabel={galleryLabel}
        isVariantGallery={isVariantGallery}
        thumbnailGallery={thumbnailGallery}
        mainImageUrl={mainImageUrl}
        onThumbnailSelect={onThumbnailSelect}
        onMainImageChange={onMainImageChange}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3">
        <div className="pointer-events-auto">
          <FloatingIconButton label="Fila" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </FloatingIconButton>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <FloatingIconButton label="Fahe" onClick={onShare}>
            <Share2 className="h-5 w-5" />
          </FloatingIconButton>
          <FloatingIconButton label="Karreta" onClick={onCart} badgeCount={cartCount}>
            <ShoppingCart className="h-5 w-5" />
          </FloatingIconButton>
        </div>
      </div>
    </div>
  );
}
