'use client';

import { useState } from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * تصویر محصول — عکس واقعی (photos[] از API باسکول/آبجکت‌استوریج)
 * با فالبک آیکون دسته وقتی عکس نبود.
 */
export function ProductImage({
  photos,
  alt,
  className,
  iconSize = 40,
}: {
  photos?: string[];
  alt: string;
  className?: string;
  iconSize?: number;
}) {
  const [failed, setFailed] = useState(false);
  const src = photos && photos.length > 0 ? photos[0] : null;

  if (src && !failed) {
    return (
       
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn('bg-muted object-cover', className)}
      />
    );
  }

  return (
    <div aria-hidden className={cn('grid place-items-center bg-secondary', className)}>
      <Package size={iconSize} strokeWidth={1.4} className="text-muted-foreground/50" />
    </div>
  );
}
