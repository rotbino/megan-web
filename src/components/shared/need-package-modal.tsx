'use client';

/**
 * مودال «نیاز به خرید اشتراک / شارژ کیف پول / ثبت کالا» — الگوی همیشگی ایمچ (خواستهٔ مالک ۱-۱۱):
 *  • هر جای سایت که کاربر برای انجام کاری به بستهٔ اشتراک فعال، شارژ کیف پول
 *    یا ثبت کالا نیاز داشته باشد، همین مودال باز می‌شود — نه توست، نه لینک خاموش.
 *  • ساختار ثابت: پیام توضیحی + دکمهٔ «بستن» + دکمهٔ اقدام که به صفحهٔ خرید
 *    بسته (panel/pricing) یا شارژ کیف پول (panel/wallet) یا ویزارد ثبت کالا
 *    (panel/products/new) می‌برد.
 *  • سه گونه: kind="package" (اشتراک)، kind="wallet" (شارژ کیف پول) و
 *    kind="product" (ثبت کالا — خواستهٔ مالک ۷-۱۱: دیدن خریداران آزاد است،
 *    اما ارسال تامین/تماس/پیام فقط با ثبت کالای فروش)؛ message قابل تنظیم
 *    است تا متن دقیق همان موقعیت را بدهد.
 */

import Link from 'next/link';
import { Crown, PackagePlus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type NeedPackageKind = 'package' | 'wallet' | 'product';

export function NeedPackageModal({
  open,
  onClose,
  kind,
  message,
  ctaLabel,
}: {
  open: boolean;
  onClose: () => void;
  /** package = نیاز به بسته اشتراک؛ wallet = نیاز به شارژ کیف پول؛ product = نیاز به ثبت کالا */
  kind: NeedPackageKind;
  /** پیام مشخص همان موقعیت — پیش‌فرض متن عمومی همان گونه */
  message?: string;
  /** برچسب دکمهٔ اقدام — پیش‌فرض «خرید اشتراک» / «شارژ کیف پول» / «ثبت کالا» */
  ctaLabel?: string;
}) {
  if (!open) return null;

  const isPackage = kind === 'package';
  const isProduct = kind === 'product';
  const href = isProduct ? '/panel/products/new' : isPackage ? '/panel/pricing' : '/panel/wallet';
  const fallbackMessage = isProduct
    ? 'برای ارسال تامین یا تماس یا پیام، باید کالاهای خود را برای فروش ثبت کنید تا خریداران مرتبط به شما نمایش داده شوند.'
    : isPackage
      ? 'برای انجام این کار، بستهٔ اشتراک فعال لازم است. با فعال‌سازی یکی از بسته‌های اشتراک ایمچ، به این قابلیت و امکانات ویژهٔ فروشندگان دسترسی پیدا می‌کنید.'
      : 'موجودی کیف پول شما برای این کار کافی نیست. لطفاً کیف پول خود را شارژ کنید تا بتوانید ادامه دهید.';
  const label = ctaLabel ?? (isProduct ? 'ثبت کالا' : isPackage ? 'خرید اشتراک' : 'شارژ کیف پول');
  const dialogLabel = isProduct
    ? 'نیاز به ثبت کالا'
    : isPackage
      ? 'نیاز به بسته اشتراک'
      : 'نیاز به شارژ کیف پول';

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={dialogLabel}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-xl border bg-card p-5 text-center shadow-2xl">
        <span
          className={`mx-auto grid size-14 place-items-center rounded-full ${
            isProduct
              ? 'bg-emerald-50 text-emerald-600'
              : isPackage
                ? 'bg-amber-50 text-amber-500'
                : 'bg-primary/10 text-primary'
          }`}
        >
          {isProduct ? <PackagePlus size={26} /> : isPackage ? <Crown size={26} /> : <Wallet size={25} />}
        </span>

        <h2 className="mt-3 text-sm font-extrabold">
          {isProduct ? 'ثبت کالا لازم است' : isPackage ? 'بستهٔ اشتراک فعال لازم است' : 'شارژ کیف پول لازم است'}
        </h2>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">{message ?? fallbackMessage}</p>

        <div className="mt-4 flex gap-2">
          <Button asChild className="flex-1 rounded-md">
            <Link href={href} onClick={onClose}>
              {label}
            </Link>
          </Button>
          <Button variant="outline" className="rounded-md" onClick={onClose}>
            بستن
          </Button>
        </div>
      </div>
    </div>
  );
}
