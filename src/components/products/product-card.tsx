'use client';

import Link from 'next/link';
import { History, MapPin, Package, ShoppingCart, Video } from 'lucide-react';
import { LadderBadge, VerifiedBadge } from '@/components/shared/badges';
import { ProductImage } from '@/components/shared/product-image';
import { ProductPrice } from '@/components/shared/product-price';
import { RelativeTime } from '@/components/shared/relative-time';
import { parseServerDate, stockFa } from '@/lib/format';
import type { Product } from '@/lib/types';

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const href = `/product-view/${product.slug}/${product.categoryName}/${product.id}`;
  const updated = parseServerDate(product.updatedAt);

  return (
      <article className="group flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-lg">
        {/* ─── بدنهٔ بالا ─── */}
        <div className="flex flex-1 md:block">
          {/* جعبهٔ عکس */}
          <div className="relative h-28 w-28 shrink-0 overflow-hidden md:aspect-[4/3] md:h-auto md:w-full">
            <Link href={href} className="relative block h-full w-full" aria-label={product.productName}>
              <ProductImage
                  photos={product.photos}
                  thumbs={product.photoThumbs}
                  alt={product.productName}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  iconSize={48}
                  priority={priority}
              />
              {/* فروشنده ویژه — گوشهٔ بالا-چپ عکس */}
              {product.isElevated && (
                  <span className="absolute left-0 top-0 rounded-br-[6px] bg-amber-400 px-2 py-1 text-[10px] font-bold leading-none text-white shadow-sm ring-1 ring-amber-500/50">
                فروشنده ویژه
              </span>
              )}
              {/* نردبان بدون بکگراند — گوشهٔ پایین-چپ عکس (جای قبلی شهر) */}
              {product.isLadder && (
                  <div className="absolute bottom-2 start-2">
                    <LadderBadge compact />
                  </div>
              )}
              {/* ویدیو — گوشهٔ بالا-راست عکس */}
              {product.hasVideo && (
                  <span
                      className="absolute end-2 top-2 grid size-7 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm"
                      title="ویدیو دارد"
                  >
                <Video size={13} />
              </span>
              )}
            </Link>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 md:p-3.5">
            {/* ردیف عنوان + شهر (شهر نارنجی روبروی عنوان) */}
            <div className="flex min-w-0 items-start gap-2">
              <Link
                  href={href}
                  className="line-clamp-2 min-h-10 min-w-0 flex-1 text-sm font-bold leading-5 text-foreground transition-colors hover:text-primary md:text-[13.5px]"
              >
                {product.productName}
              </Link>
              <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-orange-500">
              <MapPin size={11} className="shrink-0" />
              <span className="max-w-[80px] truncate">{product.cityName.trim()}</span>
            </span>
            </div>

            {/* موجودی و حداقل سفارش */}
            <div className="flex flex-col gap-1 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <Package size={13} className="shrink-0 text-primary/70" />
              <span className="shrink-0 text-muted-foreground">موجودی:</span>
              <span className="min-w-0 truncate font-num font-semibold">{stockFa(product.stock, product.unit)}</span>
            </span>
              <span className="inline-flex items-center gap-1.5">
              <ShoppingCart size={13} className="shrink-0 text-primary/70" />
              <span className="shrink-0 text-muted-foreground">حداقل سفارش:</span>
              <span className="min-w-0 truncate font-num font-semibold">{stockFa(product.minSaleAmount, product.unit)}</span>
            </span>
            </div>

            {/* احراز هویت */}
            <div className="flex h-5 items-center">
              {product.seller.isVerified && <VerifiedBadge />}
            </div>

            {/* قیمت — دسکتاپ */}
            <div className="mt-auto hidden border-t border-border/60 pt-2.5 md:block">
              <ProductPrice product={product} />
              <p
                  className="mt-1 flex h-4 items-center justify-center gap-1 text-[10.5px] text-muted-foreground"
                  title="آخرین به‌روزرسانی قیمت"
              >
                <History size={11} className="shrink-0 text-primary/60" />
                <RelativeTime date={updated} />
              </p>
            </div>
          </div>
        </div>

        {/* ─── نوار اقدام موبایل (بدون ذخیره و بدون اشتراک‌گذاری) ─── */}
        <div className="flex items-center justify-between gap-x-2 border-t border-border/70 px-3 py-2 md:hidden">
          <ProductPrice product={product} />
          <span
              className="flex shrink-0 items-center gap-1 text-[10.5px] text-muted-foreground"
              title="آخرین به‌روزرسانی قیمت"
          >
          <History size={11} className="shrink-0 text-primary/60" />
          <RelativeTime date={updated} />
        </span>
        </div>
      </article>
  );
}