'use client';

import Link from 'next/link';
import { MapPin, Package } from 'lucide-react';
import { LadderBadge, VerifiedBadge } from '@/components/shared/badges';
import { ProductImage } from '@/components/shared/product-image';
import { ProductPrice } from '@/components/shared/product-price';
import { stockFa } from '@/lib/format';
import type { Product } from '@/lib/types';

/**
 * کارت آگهی محصول — همان اطلاعات باسکول (نام، مکان، موجودی، قیمت).
 * موبایل: کارت افقی مثل دیوار — عکس سمت راست، مشخصات سمت چپ (خواناتر).
 * دسکتاپ: کارت عمودی در گرید.
 * قیمت فقط برای اعضا: لاگین‌نشده دکمه «مشاهده قیمت» (فرم ورود) می‌بیند (ProductPrice).
 */
export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const href = `/product-view/${product.slug}/${product.categoryName}/${product.id}`;

  return (
    <article className="group flex overflow-hidden rounded-md border bg-card transition-shadow hover:shadow-md md:flex-col">
      <Link href={href} className="relative block h-28 w-28 shrink-0 md:h-auto md:w-full md:aspect-[4/3]" aria-label={product.productName}>
        <ProductImage
          photos={product.photos}
          thumbs={product.photoThumbs}
          alt={product.productName}
          className="h-full w-full object-cover md:aspect-[4/3] md:h-auto"
          iconSize={48}
          priority={priority}
        />
        {product.isLadder && (
          <span className="absolute start-1.5 top-1.5 md:start-2 md:top-2">
            <LadderBadge compact />
          </span>
        )}
        {product.hasVideo && (
          <span className="absolute end-1.5 top-1.5 rounded-sm bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur md:end-2 md:top-2">
            ویدیو دارد
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 md:gap-2">
        <Link href={href} className="line-clamp-2 text-sm font-bold leading-5 hover:text-primary">
          {product.productName}
        </Link>

        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin size={13} className="shrink-0 text-primary/70" />
            <span className="truncate">{product.provinceName}، {product.cityName.trim()}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Package size={13} className="shrink-0 text-primary/70" />
            {stockFa(product.stock, product.unit)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          {product.seller.isVerified ? <VerifiedBadge /> : (
            <span className="text-[11px] text-muted-foreground">بدون احراز هویت</span>
          )}
        </div>

        <div className="mt-auto pt-1">
          <ProductPrice product={product} />
        </div>
      </div>
    </article>
  );
}
