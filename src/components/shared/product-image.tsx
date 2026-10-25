'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * تصویر محصول — next/image (الزام پروژه: بهینه‌سازی + lazy + preload هوشمند).
 * کارت‌ها تامبنیل ۴۰۰px را می‌کشند (سرعت)؛ صفحه جزئیات تصویر اصلی ۱۶۰۰px.
 * فالبک آیکون دسته وقتی عکس نبود.
 */
export function ProductImage({
  photos,
  thumbs,
  alt,
  className,
  iconSize = 40,
  priority = false,
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 260px',
}: {
  photos?: string[];
  /** تامبنیل‌های ۴۰۰px هم‌ترتیب با photos — اولویت دارد (کارت‌ها) */
  thumbs?: string[];
  alt: string;
  className?: string;
  iconSize?: number;
  /** فقط برای تصویر LCP اول صفحه */
  priority?: boolean;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = (thumbs && thumbs.length > 0 ? thumbs[0] : null) ?? (photos && photos.length > 0 ? photos[0] : null);

  if (src && !failed) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
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
