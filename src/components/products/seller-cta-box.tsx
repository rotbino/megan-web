import Link from 'next/link';
import { ArrowLeft, PackageOpen } from 'lucide-react';

/**
 * کادر دعوت به ثبت محصول — برای کاربرانی که از گوگل به صفحهٔ آگهی رسیده‌اند
 * (خواسته مالک ۱-۱۱ دور هفتم — طرح مرجع: گرادیان مایل + کارتن‌ها).
 * سرور-رندر خالص؛ کپی عمده‌محور (سئو) و مقصد: ثبت آگهی رایگان.
 */
export function SellerCtaBox() {
  return (
    <section aria-labelledby="seller-cta" className="mx-auto max-w-7xl px-4 lg:px-6">
      <div className="relative overflow-hidden rounded-lg border border-emphasis/20">
        {/* زمینه: سفید + گرادیان مایلِ ملایم رنگ تمایز (عکس مرجع) */}
        <div className="absolute inset-0 bg-gradient-to-l from-emphasis/15 via-emphasis/5 to-transparent" aria-hidden />
        {/* موج جداکنندهٔ مایل — عمق بصری بدون شلوغی */}
        <svg
          className="pointer-events-none absolute inset-y-0 left-1/2 h-full w-24 -translate-x-1/2 text-emphasis/10"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d="M50 0 C30 35 70 65 50 100" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>

        <div className="relative flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:justify-between sm:p-6 sm:text-start">
          <div className="min-w-0">
            <h2 id="seller-cta" className="flex items-center justify-center gap-2 text-base font-extrabold text-emphasis sm:justify-start lg:text-lg">
              <PackageOpen size={19} className="shrink-0" />
              محصولی برای فروش دارید؟
            </h2>
            <p className="mt-1.5 max-w-xl text-xs leading-6 text-muted-foreground lg:text-[13px]">
              ثبت آگهی فروش عمده در ایمچ رایگان است؛ خریداران عمده سراسر ایران در همان روز محصول شما را می‌بینند و مستقیم با شما تماس می‌گیرند.
            </p>
          </div>
          {/* دکمهٔ CTA — هم‌قد استاندارد h-11 (قانون تناسب) + رنگ تمایز */}
          <Link
            href="/panel/products/new"
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-emphasis px-6 text-sm font-bold text-emphasis-foreground shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-colors hover:bg-emphasis-deep"
          >
            تبلیغ رایگان محصول عمده
            <ArrowLeft size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
