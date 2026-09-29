'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import { getQuickMenuIconDefinition } from '@/lib/quickMenuIcons';
import type { QuickMenuIconType } from '@/hooks/useQuickMenu';
import { cn } from '@/lib/utils';

interface QuickMenuIconDisplayProps {
  iconType: QuickMenuIconType;
  iconKey: string | null;
  iconUrl: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<QuickMenuIconDisplayProps['size']>, string> = {
  sm: 'h-9 w-9',
  md: 'h-12 w-12',
  lg: 'h-14 w-14',
};

const ICON_PX: Record<NonNullable<QuickMenuIconDisplayProps['size']>, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

// Shared by the list page, the create/edit form, and the preview dialog so
// "what a Quick Menu item's icon looks like" is defined exactly once.
export function QuickMenuIconDisplay({ iconType, iconKey, iconUrl, size = 'md' }: QuickMenuIconDisplayProps) {
  const sizeClass = SIZE_CLASSES[size];
  // A freshly-uploaded Cloudinary asset can occasionally fail its very
  // first fetch (CDN propagation lag) even though the upload itself
  // succeeded — falls back to a visible "broken image" marker here instead
  // of a silent blank circle, so it's obvious in the admin table that the
  // icon needs a look (usually just resolves on its own within seconds;
  // otherwise re-upload).
  const [imageError, setImageError] = useState(false);

  if (iconType === 'UPLOAD' && iconUrl && !imageError) {
    return (
      <div className={cn('relative shrink-0 overflow-hidden rounded-full bg-muted/40', sizeClass)}>
        <Image src={iconUrl} alt="" fill className="object-contain p-1.5" unoptimized onError={() => setImageError(true)} />
      </div>
    );
  }

  if (iconType === 'UPLOAD') {
    return (
      <div className={cn('flex shrink-0 items-center justify-center rounded-full bg-muted/40 text-muted-foreground', sizeClass)}>
        <ImageOff className={ICON_PX[size]} strokeWidth={1.75} />
      </div>
    );
  }

  const def = getQuickMenuIconDefinition(iconKey);
  const Icon = def.icon;
  return (
    <div className={cn('flex shrink-0 items-center justify-center rounded-full', sizeClass, def.color)}>
      <Icon className={ICON_PX[size]} strokeWidth={1.75} />
    </div>
  );
}
