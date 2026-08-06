'use client';

import { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { Package } from 'lucide-react';
import { normalizeImageUrl } from '@/lib/images';

interface RemoteImageProps extends Omit<ImageProps, 'src' | 'alt'> {
  src?: string | null;
  alt: string;
  fallbackClassName?: string;
}

export function RemoteImage({ src, alt, className, fallbackClassName, ...props }: RemoteImageProps) {
  const [hasError, setHasError] = useState(false);
  const normalizedSrc = normalizeImageUrl(src);

  if (!normalizedSrc || hasError) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-gray-100 ${fallbackClassName ?? ''}`}>
        <Package className="h-5 w-5 text-gray-400" />
      </div>
    );
  }

  return (
    <Image
      src={normalizedSrc}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}
