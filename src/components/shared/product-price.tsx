'use client';

import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RelativeTime } from '@/components/shared/relative-time';
import { useAuth } from '@/lib/mock/auth';
import { parseServerDate, priceFa } from '@/lib/format';
import type { Product } from '@/lib/types';

/**
 * قیمت آگهی + زمان آخرین به‌روزرسانی (خواسته مالک ۲-۱۱):
 * «هر جایی که قیمت هست، زمانِ به‌روزرسانی هم باشد — به اندازهٔ خود قیمت مهم».
 *   صفحهٔ محصول: کادر مینیمال — فقط قیمت، واحد و زمان (حداقل خرید/موجودی
 *   بالای صفحه کنار عکس هست و اینجا تکرار نمی‌شود — قانون عدم تکرار RULES.md §۱-ب).
 *   کارت لیست: زیر قیمت، ریزمتنِ زمان.
 * قیمت فقط برای اعضا: مهمان دکمهٔ «مشاهده قیمت» می‌بیند (مودال ورود نیات‌محور).
 */
export function ProductPrice({
  product,
  variant = 'card',
}: {
  product: Product;
  variant?: 'card' | 'page';
}) {
  const { user, requireAuth } = useAuth();
  // تاریخ بک‌اند «YYYY-MM-DD HH:mm:ss» بدون منطقهٔ زمانی است — UTC خوانده شود
  const updated = parseServerDate(product.updatedAt);

  if (variant === 'page') {
    if (!user) {
      return (
        <div>
          <Button
            variant="outline"
            onClick={() => requireAuth('price')}
            className="h-12 w-full rounded-md text-base font-medium"
            aria-label={`مشاهده قیمت ${product.productName}`}
          >
            مشاهده قیمت
          </Button>
          {/* تازگی آگهی برای مهمان هم پیام مفیدی است — همان ردیف زمان، جمع‌وجور */}
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <History size={13} className="shrink-0 text-primary/70" />
            آخرین به‌روزرسانی
            <RelativeTime date={updated} />
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-md border border-primary/25 bg-primary/5 p-4">
        <p className="text-xs font-medium text-muted-foreground">کف قیمت هر {product.unit}</p>
        {product.minSalePrice ? (
          <p className="font-num mt-1 text-2xl font-extrabold leading-9 text-primary">
            {priceFa(product.minSalePrice)}
          </p>
        ) : (
          <p className="mt-1 text-xl font-extrabold leading-9 text-primary">تماس بگیرید</p>
        )}
        {/* زمان به‌روزرسانی قیمت — به اندازهٔ خود قیمت مهم (خواسته مالک ۲-۱۱) */}
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/70 pt-2.5">
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
            <History size={14} className="shrink-0 text-primary/70" />
            آخرین به‌روزرسانی
          </span>
          <RelativeTime date={updated} className="font-num text-[13px] font-bold text-foreground" />
        </div>
      </div>
    );
  }

  // ─── کارت لیست — قیمت؛ دکمه فقط برای CTA مهمان ───
  // خواستهٔ مالک ۹-۱۱: «مشاهده قیمت» دکمه است، اما وقتی قیمت پیدا شد دیگر
  // شکل دکمه ندارد — متن پررنگ ساده بدون قاب/بکگراند (کادر خاکستری قبلی
  // شبیه دکمه بود). ردیف زمان به‌روزرسانی هم از اینجا به خود کارت رفت
  // (زیر قیمت جای خوبی نبود — خواستهٔ مالک ۹-۱۱).
  return user ? (
    product.minSalePrice ? (
      <div className="font-num flex min-w-0 flex-wrap items-baseline gap-x-1.5">
        <span className="text-[15px] font-extrabold leading-6 text-primary md:text-base">
          {priceFa(product.minSalePrice).replace(' تومان', '')}
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">
          تومان / {product.unit}
        </span>
      </div>
    ) : (
      <p className="text-sm font-extrabold leading-6 text-foreground">تماس بگیرید</p>
    )
  ) : (
    <Button
      variant="outline"
      onClick={() => requireAuth('price')}
      className="h-8 shrink-0 rounded-md px-3 text-xs font-medium md:h-10 md:w-full md:text-sm"
      aria-label={`مشاهده قیمت ${product.productName}`}
    >
      مشاهده قیمت
    </Button>
  );
}
