'use client';

import Link from 'next/link';
import { Eye, MapPin, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpecialSellerBadge, VerifiedBadge } from '@/components/shared/badges';
import { ProductImage } from '@/components/shared/product-image';
import { PriceReveal } from '@/components/shared/price-reveal';
import { stockFa } from '@/lib/format';
import type { Product } from '@/lib/types';

/**
 * کارت محصول — همان اطلاعات باسکول (نام، مکان، موجودی، نشان‌ها، دکمه مشاهده قیمت)
 * با ظاهر مدرن‌تر. قیمت عمداً مثل باسکول پشت دکمه است (مولفه Lead-gen).
 */
export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <Link
        href={`/product-view/${product.slug}/${product.categoryName}/${product.id}`}
        className="relative block"
        aria-label={product.productName}
      >
        <ProductImage seed={product.id} subCategoryName={product.subCategoryName} className="aspect-[4/3] w-full" iconSize={64} />
        <div className="absolute start-2 top-2 flex flex-col items-start gap-1">
          {product.isElevated && <SpecialSellerBadge />}
          {product.hasVideo && (
            <span className="rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur">ویدیو دارد</span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <Link
          href={`/product-view/${product.slug}/${product.categoryName}/${product.id}`}
          className="line-clamp-2 min-h-10 text-sm font-bold leading-5 hover:text-primary"
        >
          {product.productName}
        </Link>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
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
          {product.seller.isVerified ? (
            <VerifiedBadge />
          ) : (
            <span className="text-[11px] text-muted-foreground">بدون احراز هویت</span>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Eye size={12} />
            {new Intl.NumberFormat('fa-IR').format(product.viewCount)}
          </span>
        </div>

        <div className="mt-auto pt-1">
          <PriceReveal product={product} asChild>
            <Button variant="outline" className="w-full rounded-xl border-primary/50 font-bold text-primary hover:bg-primary hover:text-primary-foreground">
              مشاهده قیمت
            </Button>
          </PriceReveal>
        </div>
      </div>
    </article>
  );
}
