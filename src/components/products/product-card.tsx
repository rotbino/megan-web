'use client';

import Link from 'next/link';
import { MapPin, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LadderBadge, VerifiedBadge } from '@/components/shared/badges';
import { ProductImage } from '@/components/shared/product-image';
import { PriceReveal } from '@/components/shared/price-reveal';
import { stockFa } from '@/lib/format';
import type { Product } from '@/lib/types';

/**
 * کارت آگهی محصول — همان اطلاعات باسکول (نام، مکان، موجودی، دکمه مشاهده قیمت)
 * قیمت عمداً مثل باسکول پشت دکمه است (مدل Lead-gen). نشان «نردبان» جای فروشنده ویژه.
 */
export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-md border bg-card transition-shadow hover:shadow-md">
      <Link
        href={`/product-view/${product.slug}/${product.categoryName}/${product.id}`}
        className="relative block"
        aria-label={product.productName}
      >
        <ProductImage photos={product.photos} alt={product.productName} className="aspect-[4/3] w-full" iconSize={48} />
        {product.isLadder && (
          <span className="absolute start-2 top-2">
            <LadderBadge />
          </span>
        )}
        {product.hasVideo && (
          <span className="absolute end-2 top-2 rounded-sm bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur">ویدیو دارد</span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <Link
          href={`/product-view/${product.slug}/${product.categoryName}/${product.id}`}
          className="line-clamp-2 min-h-10 text-sm font-bold leading-5 hover:text-primary"
        >
          {product.productName}
        </Link>

        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin size={13} className="text-primary/70" />
            {product.provinceName}، {product.cityName.trim()}
          </span>
          <span className="inline-flex items-center gap-1">
            <Package size={13} className="text-primary/70" />
            {stockFa(product.stock, product.unit)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          {product.seller.isVerified ? <VerifiedBadge /> : (
            <span className="text-[11px] text-muted-foreground">بدون احراز هویت</span>
          )}
        </div>

        <div className="mt-auto pt-1">
          <PriceReveal product={product}>
            <Button variant="outline" className="w-full rounded-md border-primary/50 font-bold text-primary hover:bg-primary hover:text-primary-foreground">
              مشاهده قیمت
            </Button>
          </PriceReveal>
        </div>
      </div>
    </article>
  );
}
