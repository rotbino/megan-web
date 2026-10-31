'use client';

/**
 * مودال «نیاز به خرید اشتراک / شارژ کیف پول» — الگوی همیشگی ایمچ (خواسته مالک ۱-۱۱):
 *  • هر جای سایت که کاربر برای انجام کاری به بستهٔ اشتراک فعال یا شارژ کیف پول
 *    نیاز داشته باشد، همین مودال باز می‌شود — نه توست، نه لینک خاموش.
 *  • ساختار ثابت: پیام توضیحی + دکمهٔ «بستن» + دکمهٔ اقدام که به صفحهٔ خرید
 *    بسته (panel/pricing) یا شارژ کیف پول (panel/wallet) می‌برد.
 *  • دو گونه: kind="package" (اشتراک) و kind="wallet" (شارژ کیف پول)؛
 *    message قابل تنظیم است تا متن دقیق همان موقعیت را بدهد
 *    (مثلاً «برای ارسال پیشنهاد تامین…» یا «موجودی برای نردبان ۲ ماهه کافی نیست…»).
 */

import Link from 'next/link';
import { Crown, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type NeedPackageKind = 'package' | 'wallet';

export function NeedPackageModal({
  open,
  onClose,
  kind,
  message,
  ctaLabel,
}: {
  open: boolean;
  onClose: () => void;
  /** package = نیاز به بسته اشتراک؛ wallet = نیاز به شارژ کیف پول */
  kind: NeedPackageKind;
  /** پیام مشخص همان موقعیت — پیش‌فرض متن عمومی همان گونه */
  message?: string;
  /** برچسب دکمهٔ اقدام — پیش‌فرض «خرید اشتراک» / «شارژ کیف پول» */
  ctaLabel?: string;
}) {
  if (!open) return null;

  const isPackage = kind === 'package';
  const href = isPackage ? '/panel/pricing' : '/panel/wallet';
  const fallbackMessage = isPackage
    ? 'برای انجام این کار، بستهٔ اشتراک فعال لازم است. با فعال‌سازی یکی از بسته‌های اشتراک ایمچ، به این قابلیت و امکانات ویژهٔ فروشندگان دسترسی پیدا می‌کنید.'
    : 'موجودی کیف پول شما برای این کار کافی نیست. لطفاً کیف پول خود را شارژ کنید تا بتوانید ادامه دهید.';
  const label = ctaLabel ?? (isPackage ? 'خرید اشتراک' : 'شارژ کیف پول');

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isPackage ? 'نیاز به بسته اشتراک' : 'نیاز به شارژ کیف پول'}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-xl border bg-card p-5 text-center shadow-2xl">
        <span
          className={`mx-auto grid size-14 place-items-center rounded-full ${
            isPackage ? 'bg-amber-50 text-amber-500' : 'bg-primary/10 text-primary'
          }`}
        >
          {isPackage ? <Crown size={26} /> : <Wallet size={25} />}
        </span>

        <h2 className="mt-3 text-sm font-extrabold">
          {isPackage ? 'بستهٔ اشتراک فعال لازم است' : 'شارژ کیف پول لازم است'}
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
