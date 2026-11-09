'use client';

import Link from 'next/link';
import { History, MapPin, Package, Share2 } from 'lucide-react';
import { LadderBadge, VerifiedBadge } from '@/components/shared/badges';
import { ProductImage } from '@/components/shared/product-image';
import { ProductPrice } from '@/components/shared/product-price';
import { RelativeTime } from '@/components/shared/relative-time';
import { SaveFollowButton } from '@/components/panel/follow/save-follow-button';
import { useToast } from '@/hooks/use-toast';
import { parseServerDate, stockFa } from '@/lib/format';
import type { Product } from '@/lib/types';

/**
 * کارت آگهی محصول — همان اطلاعات باسکول (نام، مکان، موجودی، قیمت).
 *
 * موبایل (بازطراحی اختصاصی، خواستهٔ مالک ۹-۱۱): کارت افقی دوطبقه —
 *  · طبقهٔ بالا: عکس (راست) + عنوان/مکان/موجودی (چپ)؛
 *  · طبقهٔ پایین «نوار اقدام» زیر عکس: قیمت (متن ساده — فقط CTA مهمان
 *    دکمه است)، زمان به‌روزرسانی و دکمه‌های ذخیره/اشتراک‌گذاری — دیگر
 *    روی عکس نیستند تا توازن عمودی کارت برقرار بماند؛
 * دسکتاپ: کارت عمودی گرید — عکس بالا (ذخیره روی عکس)، قیمت پایین کارت.
 * قیمت فقط برای اعضا: مهمان دکمهٔ «مشاهده قیمت» می‌بیند (ProductPrice).
 */
export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { toast } = useToast();
  const href = `/product-view/${product.slug}/${product.categoryName}/${product.id}`;
  // تاریخ بک‌اند «YYYY-MM-DD HH:mm:ss» بدون منطقهٔ زمانی است — UTC خوانده شود
  const updated = parseServerDate(product.updatedAt);

  // اشتراک‌گذاری — موبایل: شیت اشتراک سیستمی؛ دسکتاپ: کپی لینک + توست
  const share = async () => {
    const url = `${window.location.origin}${href}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: product.productName, url });
      } catch {
        /* کاربر شیت سیستمی را بست — کاری نکن */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ description: 'لینک آگهی کپی شد.' });
    } catch {
      toast({ description: 'کپی لینک ممکن نشد.' });
    }
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-md border bg-card transition-shadow hover:shadow-md">
      {/* ─── بدنهٔ بالا — موبایل: عکس+مشخصات افقی / دسکتاپ: عکس سپس مشخصات ─── */}
      <div className="flex flex-1 md:block">
        <div className="relative h-28 w-28 shrink-0 md:h-auto md:w-full">
          <Link href={href} className="block h-full w-full" aria-label={product.productName}>
            <ProductImage
              photos={product.photos}
              thumbs={product.photoThumbs}
              alt={product.productName}
              className="h-full w-full object-cover md:aspect-[4/3] md:h-auto"
              iconSize={48}
              priority={priority}
            />
            {/* «فروشنده ویژه» — مستطیل طلایی چسبیده به گوشهٔ بالا-چپ عکس (خواسته مالک
                ۲-۱۱: طلایی = رنگ ثابت این نشان)؛ فقط گوشهٔ آخر (پایین-راست) کمی گرد است */}
            {product.isElevated && (
              <span className="absolute left-0 top-0 rounded-br-[6px] bg-amber-400 px-2 py-1 text-[10px] font-bold leading-none text-white shadow-sm ring-1 ring-amber-500/50">
                فروشنده ویژه
              </span>
            )}
            {product.hasVideo && (
              <span className="absolute end-1.5 top-1.5 rounded-sm bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur md:end-2 md:top-2">
                ویدیو دارد
              </span>
            )}
          </Link>
          {/* ذخیره در پیگیری‌ها — دسکتاپ: روی عکس (موبایل: نوار پایین)؛
              بیرون از لینک تا کلیکِ آگهی را باز نکند؛ ۴۴px (RULES §۱) */}
          <SaveFollowButton
            variant="icon"
            targetType="product"
            targetId={product.id}
            suggestedFolderName={product.subCategoryName || product.productName}
            className="absolute bottom-2 end-2 hidden size-11 md:block"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 md:gap-2">
          {/* عنوان + نشان نردبان — نردبان رو‌به‌روی عنوان (انتهای چپ ردیف)؛
              عنوان همیشه دو خط رزرو می‌کند تا کارت‌های با عنوان کوتاه/بلند هم‌قد بمانند */}
          <div className="flex items-start justify-between gap-2">
            <Link href={href} className="line-clamp-2 min-h-10 text-sm font-bold leading-5 hover:text-primary">
              {product.productName}
            </Link>
            {product.isLadder && (
              <span className="mt-0.5 shrink-0" title="نردبان">
                <LadderBadge compact />
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} className="shrink-0 text-primary/70" />
              <span className="truncate">{product.provinceName}، {product.cityName.trim()}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Package size={13} className="shrink-0 text-primary/70" />
              <span className="truncate font-num">{stockFa(product.stock, product.unit)}</span>
            </span>
          </div>

          {/* احراز هویت — فقط برای تأییدشده‌ها نوشته می‌شود؛ ارتفاع ردیف ثابت است
              تا کارت‌های بدون احراز هویت کوتاه‌تر و ناهماهنگ نشوند (خواسته مالک ۱-۱۱) */}
          <div className="flex h-5 items-center">
            {product.seller.isVerified && <VerifiedBadge />}
          </div>

          {/* قیمت — دسکتاپ: انتهای ستون مشخصات (موبایل: نوار پایین) */}
          <div className="mt-auto hidden pt-1 md:block">
            <ProductPrice product={product} />
            {/* زمان به‌روزرسانی — دسکتاپ زیر قیمت (موبایل: نوار پایین) */}
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

      {/* ─── نوار اقدام (موبایل) — زیر عکس: قیمت + زمان + ذخیره/اشتراک ───
          توازن کارت: آیکون‌ها از روی عکس به اینجا آمدند تا عکس تمیز و کارت
          هم‌وزن بماند (خواستهٔ مالک ۹-۱۱) */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-border/70 px-3 py-2 md:hidden">
        <ProductPrice product={product} />
        <div className="flex shrink-0 items-center gap-0.5">
          <span
            className="me-1 flex items-center gap-1 text-[10.5px] text-muted-foreground"
            title="آخرین به‌روزرسانی قیمت"
          >
            <History size={11} className="shrink-0 text-primary/60" />
            <RelativeTime date={updated} />
          </span>
          {/* ذخیره در پیگیری‌ها — بیرون از لینک تا کلیکِ آگهی را باز نکند؛
              فشرده (۳۲px) چون کنار قیمت است، نه روی بندانگشتی */}
          <SaveFollowButton
            variant="icon"
            targetType="product"
            targetId={product.id}
            suggestedFolderName={product.subCategoryName || product.productName}
            className="size-8 shadow-none backdrop-blur-none"
          />
          <button
            type="button"
            onClick={share}
            aria-label={`اشتراک‌گذاری ${product.productName}`}
            title="اشتراک‌گذاری آگهی"
            className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
          >
            <Share2 size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
