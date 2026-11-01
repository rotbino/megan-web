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

  // ─── کارت لیست — قیمت (یا دکمهٔ مهمان) + ردیف ریز زمان ───
  return (
    <div className="w-full">
      {user ? (
        <div className="flex h-10 w-full items-center justify-center gap-1 rounded-md bg-secondary font-extrabold text-primary">
          {product.minSalePrice ? (
            <>
              <span className="text-base">{priceFa(product.minSalePrice).replace(' تومان', '')}</span>
              <span className="text-[11px] font-medium text-muted-foreground">تومان / {product.unit}</span>
            </>
          ) : (
            <span className="text-sm">تماس بگیرید</span>
          )}
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => requireAuth('price')}
          className="h-10 w-full rounded-md font-medium"
          aria-label={`مشاهده قیمت ${product.productName}`}
        >
          مشاهده قیمت
        </Button>
      )}
      {/* زمان آخرین به‌روزرسانی — همهٔ کارت‌ها (مهمان/عضو) یک ردیف ثابت h-4 دارند
          تا ارتفاع کارت‌های هم‌گرید برابر بماند (قانون تناسب RULES.md §۱) */}
      <p
        className="mt-1 flex h-4 items-center justify-center gap-1 text-[10.5px] text-muted-foreground"
        title="آخرین به‌روزرسانی قیمت"
      >
        <History size={11} className="shrink-0 text-primary/60" />
        <RelativeTime date={updated} />
      </p>
    </div>
  );
}
