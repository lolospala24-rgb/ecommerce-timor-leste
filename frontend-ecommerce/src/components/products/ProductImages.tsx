'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Maximize2, ZoomIn, X, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GalleryThumbnailItem } from '@/lib/product';

interface ProductImagesProps {
  images: string[];
  thumbnail?: string | null;
  name: string;
  discount?: number;
  /** e.g. "Product" or variant label when showing variant images */
  galleryLabel?: string;
  isVariantGallery?: boolean;
  /** All product + variant images for the thumbnail strip */
  thumbnailGallery?: GalleryThumbnailItem[];
  /** Currently displayed main image URL (controlled from parent) */
  mainImageUrl?: string | null;
  onThumbnailSelect?: (item: GalleryThumbnailItem) => void;
  onMainImageChange?: (url: string) => void;
}

export function ProductImages({
  images,
  thumbnail,
  name,
  discount = 0,
  galleryLabel,
  isVariantGallery = false,
  thumbnailGallery,
  mainImageUrl,
  onThumbnailSelect,
  onMainImageChange,
}: ProductImagesProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  // Purely local to this component — selecting the video thumbnail never
  // touches mainImageUrl/onMainImageChange, so none of the existing image
  // gallery state or callbacks are affected by it.
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const carouselImages =
    images && images.length > 0 ? images : [thumbnail || '/images/placeholder.png'];

  const thumbItems: GalleryThumbnailItem[] =
    thumbnailGallery ??
    carouselImages.map((url, index) => ({
      id: `fallback-${index}`,
      url,
      type: 'product' as const,
    }));

  const resolvedMainUrl =
    mainImageUrl && carouselImages.includes(mainImageUrl)
      ? mainImageUrl
      : mainImageUrl ?? carouselImages[currentIndex] ?? carouselImages[0];

  useEffect(() => {
    if (!mainImageUrl) return;
    // The parent only ever drives image selection (variant swaps, etc.) —
    // if it changes the active image out from under us, that means the
    // user (or the page) picked an image, so drop out of video playback.
    setActiveVideoUrl(null);
    const idx = carouselImages.indexOf(mainImageUrl);
    if (idx >= 0) setCurrentIndex(idx);
  }, [mainImageUrl, carouselImages.join(',')]);

  const goTo = useCallback(
    (index: number) => {
      const nextIndex = (index + carouselImages.length) % carouselImages.length;
      setCurrentIndex(nextIndex);
      onMainImageChange?.(carouselImages[nextIndex]);
    },
    [carouselImages, onMainImageChange],
  );

  const nextImage = () => goTo(currentIndex + 1);
  const prevImage = () => goTo(currentIndex - 1);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mainRef.current) return;
    const rect = mainRef.current.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomOrigin({ x, y });
  };

  const ThumbnailButton = ({ item }: { item: GalleryThumbnailItem }) => {
    const isActive =
      item.type === 'video'
        ? activeVideoUrl === item.videoUrl
        : !activeVideoUrl && resolvedMainUrl === item.url;

    return (
      <button
        type="button"
        aria-label={
          item.type === 'video'
            ? 'Play product video'
            : item.type === 'variant' && item.variantLabel
              ? `View ${item.variantLabel} image`
              : `View product image`
        }
        className={cn(
          'relative shrink-0 overflow-hidden rounded-lg border-2 bg-muted/30 transition-all',
          'h-[64px] w-[64px] lg:h-[72px] lg:w-[72px]',
          isActive
            ? 'border-primary ring-2 ring-primary/25 shadow-sm'
            : 'border-transparent opacity-70 hover:border-muted-foreground/40 hover:opacity-100',
          item.type === 'variant' && !isActive && 'ring-1 ring-primary/15',
        )}
        onClick={() => {
          if (item.type === 'video' && item.videoUrl) {
            setActiveVideoUrl(item.videoUrl);
            return;
          }

          setActiveVideoUrl(null);
          if (onThumbnailSelect) {
            onThumbnailSelect(item);
            return;
          }
          const idx = carouselImages.indexOf(item.url);
          if (idx >= 0) setCurrentIndex(idx);
        }}
      >
        <Image
          src={item.url}
          alt={item.type === 'video' ? `${name} video` : `${name} thumbnail`}
          fill
          className="object-cover"
          sizes="72px"
        />
        {item.type === 'video' && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Play className="h-6 w-6 fill-white text-white drop-shadow" />
          </span>
        )}
        {item.type === 'variant' && (
          <span className="absolute bottom-0 left-0 right-0 bg-primary/80 px-0.5 py-px text-center text-[9px] font-medium leading-tight text-primary-foreground">
            V
          </span>
        )}
        {isActive && (
          <span className="absolute inset-0 ring-1 ring-inset ring-primary/20 rounded-lg" />
        )}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
        {/* Thumbnail gallery — vertical on desktop */}
        {thumbItems.length > 0 && (
          <div
            className={cn(
              'flex gap-2',
              'order-2 flex-row overflow-x-auto pb-1 lg:order-1',
              'lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:max-h-[520px] lg:pb-0',
            )}
          >
            {thumbItems.map((item) => (
              <ThumbnailButton key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* Main image with hover zoom */}
        <div className="order-1 min-w-0 flex-1 lg:order-2">
          <div
            ref={mainRef}
            className={cn(
              'group relative aspect-square overflow-hidden rounded-2xl border bg-gradient-to-b from-muted/40 to-muted/10 shadow-sm',
              activeVideoUrl ? 'cursor-default' : 'cursor-zoom-in',
            )}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onMouseMove={handleMouseMove}
            onClick={() => {
              if (!activeVideoUrl) setIsZoomOpen(true);
            }}
            role={activeVideoUrl ? undefined : 'button'}
            tabIndex={activeVideoUrl ? undefined : 0}
            onKeyDown={(e) => {
              if (!activeVideoUrl && (e.key === 'Enter' || e.key === ' ')) setIsZoomOpen(true);
            }}
            aria-label={activeVideoUrl ? undefined : 'Open image zoom'}
          >
            {activeVideoUrl ? (
              <video
                key={activeVideoUrl}
                src={activeVideoUrl}
                poster={thumbnail || carouselImages[0]}
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-contain p-4"
              />
            ) : (
              <Image
                src={resolvedMainUrl}
                alt={name}
                fill
                className={cn(
                  'object-contain p-4 transition-transform duration-200 ease-out',
                  isHovering && 'scale-[2]',
                )}
                style={
                  isHovering
                    ? { transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%` }
                    : undefined
                }
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                draggable={false}
              />
            )}

            {/* Badges */}
            {!activeVideoUrl && (
            <div className="absolute left-3 top-3 z-10 flex flex-col gap-2 pointer-events-none">
              {discount > 0 && (
                <Badge className="w-fit border-0 bg-red-600 px-2.5 py-1 text-xs font-semibold text-white shadow-md">
                  -{discount}% OFF
                </Badge>
              )}
              {galleryLabel && (
                <Badge
                  variant="secondary"
                  className={cn(
                    'w-fit bg-background/90 text-xs font-medium shadow-sm backdrop-blur-sm',
                    isVariantGallery && 'border-primary/30 text-primary',
                  )}
                >
                  {isVariantGallery ? `Variant: ${galleryLabel}` : galleryLabel}
                </Badge>
              )}
            </div>
            )}

            {/* Image counter */}
            {!activeVideoUrl && carouselImages.length > 1 && (
              <Badge
                variant="secondary"
                className="absolute bottom-3 left-3 z-10 bg-background/90 text-xs font-medium shadow-sm backdrop-blur-sm pointer-events-none"
              >
                {currentIndex + 1} / {carouselImages.length}
              </Badge>
            )}

            {/* Nav arrows */}
            {!activeVideoUrl && carouselImages.length > 1 && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute left-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full border bg-background/90 opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full border bg-background/90 opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Zoom hint */}
            {!activeVideoUrl && (
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full border bg-background/90 px-2.5 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm pointer-events-none opacity-0 transition-opacity group-hover:opacity-100">
              <ZoomIn className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Hover to zoom · Click to expand</span>
              <span className="sm:hidden">Tap to zoom</span>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen zoom lightbox */}
      <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
        <DialogContent className="max-w-[95vw] border-0 bg-black/95 p-0 sm:max-w-5xl">
          <DialogTitle className="sr-only">{name} — image zoom</DialogTitle>
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-20 text-white hover:bg-white/10"
              onClick={() => setIsZoomOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="relative aspect-square w-full min-h-[50vh] sm:min-h-0">
              <Image
                src={resolvedMainUrl}
                alt={name}
                fill
                className="object-contain p-4 sm:p-8"
                sizes="95vw"
                priority
              />
            </div>

            {carouselImages.length > 1 && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute left-3 top-1/2 z-20 h-10 w-10 -translate-y-1/2 rounded-full"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-3 top-1/2 z-20 h-10 w-10 -translate-y-1/2 rounded-full"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2 rounded-full bg-black/60 px-3 py-2 backdrop-blur-sm">
                  {carouselImages.map((image, index) => (
                    <button
                      key={`zoom-thumb-${index}`}
                      type="button"
                      className={cn(
                        'relative h-10 w-10 overflow-hidden rounded-md border-2 transition-all',
                        resolvedMainUrl === image
                          ? 'border-white opacity-100'
                          : 'border-transparent opacity-50 hover:opacity-80',
                      )}
                      onClick={() => {
                        setCurrentIndex(index);
                        onMainImageChange?.(image);
                      }}
                    >
                      <Image src={image} alt="" fill className="object-cover" sizes="40px" />
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="absolute left-4 top-4 z-20">
              <Badge className="bg-white/10 text-white hover:bg-white/10">
                <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
                {currentIndex + 1} / {carouselImages.length}
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
