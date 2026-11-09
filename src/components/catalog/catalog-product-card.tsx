'use client';

/**
 * کارت محصول در کاتالوگ (خواسته مالک ۱۰-۱۱) — نسخهٔ مستقل از کارت ایمچ:
 * بدون لینک به صفحات ایمچ، بدون دکمه‌های پیگیری/اشتراک ایمچ. قیمت این‌جا
 * مستقیم دیده می‌شود (کاتالوگِ ابزار فروشِ خودِ فروشنده است، نه بازار
 * عمومی — مهمان‌های او مشتری‌های خودش‌اند). کلیک → مودال جزئیات با عکس
 * بزرگ، توضیح، موجودی/حداقل سفارش و دکمه‌های تماس همان کاتالوگ.
 */

import { useState } from 'react';
import { MapPin, Package, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProductImage } from '@/components/shared/product-image';
import { CatalogContactButtons, type CatalogSellerIdentity } from '@/components/catalog/catalog-actions';
import { priceFa, stockFa } from '@/lib/format';
import type { Product } from '@/lib/types';

export function CatalogProductCard({
  product,
  seller,
  instagramId,
  whatsappNumber,
}: {
  product: Product;
  seller: CatalogSellerIdentity;
  instagramId: string | null;
  whatsappNumber: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <article className="flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`جزئیات ${product.productName}`}
          className="relative block aspect-[4/3] w-full"
        >
          <ProductImage
            photos={product.photos}
            thumbs={product.photoThumbs}
            alt={product.productName}
            className="h-full w-full object-cover"
            iconSize={40}
          />
          <span className="absolute bottom-1.5 start-1.5 inline-flex max-w-[85%] items-center gap-0.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10.5px] font-medium text-white backdrop-blur-sm">
            <MapPin size={10} className="shrink-0" />
            <span className="truncate">{product.cityName.trim()}</span>
          </span>
        </button>

        <div className="flex flex-1 flex-col gap-1.5 p-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="line-clamp-2 min-h-10 text-start text-[13px] font-bold leading-5 hover:text-primary"
          >
            {product.productName}
          </button>

          <div className="flex flex-col gap-1 text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <Package size={12} className="shrink-0 text-primary/70" />
              <span className="shrink-0 text-muted-foreground">موجودی:</span>
              <span className="min-w-0 truncate font-num font-semibold">{stockFa(product.stock, product.unit)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShoppingCart size={12} className="shrink-0 text-primary/70" />
              <span className="shrink-0 text-muted-foreground">حداقل سفارش:</span>
              <span className="min-w-0 truncate font-num font-semibold">{stockFa(product.minSaleAmount, product.unit)}</span>
            </span>
          </div>

          {/* قیمت — در کاتالوگِ خودِ فروشنده بدون گیت عضویت دیده می‌شود */}
          <div className="mt-auto border-t border-border/70 pt-2">
            {product.minSalePrice ? (
              <p className="font-num flex min-w-0 flex-wrap items-baseline gap-x-1">
                <span className="text-[15px] font-extrabold leading-6 text-primary">
                  {priceFa(product.minSalePrice).replace(' تومان', '')}
                </span>
                <span className="text-[10.5px] font-medium text-muted-foreground">
                  تومان / {product.unit}
                </span>
              </p>
            ) : (
              <p className="text-[13px] font-extrabold leading-6 text-foreground">تماس بگیرید</p>
            )}
          </div>
        </div>
      </article>

      {/* مودال جزئیات — عکس بزرگ + توضیح + مشخصات + تماسِ همان کاتالوگ */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader className="text-start">
            <DialogTitle className="text-start text-base">{product.productName}</DialogTitle>
          </DialogHeader>

          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-secondary">
            <ProductImage
              photos={product.photos}
              thumbs={product.photoThumbs}
              alt={product.productName}
              className="h-full w-full object-cover"
              iconSize={48}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border bg-card p-3 text-center">
              <p className="font-num text-sm font-extrabold">{stockFa(product.stock, product.unit)}</p>
              <p className="mt-0.5 text-[10.5px] text-muted-foreground">موجودی</p>
            </div>
            <div className="rounded-lg border bg-card p-3 text-center">
              <p className="font-num text-sm font-extrabold">{stockFa(product.minSaleAmount, product.unit)}</p>
              <p className="mt-0.5 text-[10.5px] text-muted-foreground">حداقل سفارش</p>
            </div>
          </div>

          {product.minSalePrice ? (
            <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-center">
              <p className="text-[11px] text-muted-foreground">قیمت هر {product.unit}</p>
              <p className="font-num mt-0.5 text-lg font-extrabold text-primary">
                {priceFa(product.minSalePrice)}
              </p>
            </div>
          ) : (
            <p className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-center text-sm font-extrabold text-primary">
              برای اطلاع از قیمت تماس بگیرید
            </p>
          )}

          {product.description?.trim() && (
            <p className="whitespace-pre-line rounded-lg border bg-card p-3 text-[13px] leading-6 text-foreground/90">
              {product.description.trim()}
            </p>
          )}

          <CatalogContactButtons
            seller={seller}
            instagramId={instagramId}
            whatsappNumber={whatsappNumber}
            className="grid-cols-2"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
