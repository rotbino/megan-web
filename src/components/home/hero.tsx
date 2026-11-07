import Link from 'next/link';
import { ChevronsLeft } from 'lucide-react';

/**
 * هیرو صفحه اصلی (خواسته مالک ۷-۱۱ دور هفدهم):
 *  • موبایل: بنر اختصاصی hero-mobile.jpg — نام «ایمچ»، نشان M با نقطه و
 *    شعار روی خودِ عکس بیک‌شده‌اند؛ متن روی‌هیرو نمایش داده نمی‌شود (تکرار
 *    ممنوع) و فقط دکمهٔ سفید CTA روی ناحیهٔ خلوتِ پایین تصویر می‌نشیند.
 *    نسبت تصویر با aspect حفظ می‌شود تا برند و شعار هیچ‌وقت کراپ نشوند.
 *  • دسکتاپ: همان hero.webp قبلی + پوشش تیره + h1/h2 و دکمه (عین باسکول).
 * h1 برای سئو در DOM می‌ماند و فقط در موبایل پنهان می‌شود (محتوایش روی
 * خود بنر دیده می‌شود).
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary-deep text-white">
      {/* تصویر پس‌زمینه — art-direction با <picture>: موبایل بنر برنددار،
          دسکتاپ همان عکس صحنه. fetchPriority=high جایگزین priority_next/image
          می‌شود تا LCP از head preload بماند */}
      <picture>
        <source media="(max-width: 991.98px)" srcSet="/images/hero-mobile.jpg" />
        {/* eslint-disable-next-line @next/next/no-img-element -- سوییچ مصنوعهٔ تصویر بین موبایل/دسکتاپ؛ عکس‌های محلی از قبل بهینه‌اند */}
        <img
          src="/images/hero.webp"
          alt=""
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>

      {/* پوشش تیرهٔ متنی — فقط دسکتاپ؛ بنر موبایل خودش تیره و برنددار است */}
      <div
        aria-hidden
        className="absolute inset-0 hidden bg-gradient-to-b from-primary-deep/75 via-primary-deep/55 to-primary-deep/80 nav-desktop:block"
      />

      {/* موبایل: بنر برنددار — فقط دکمهٔ CTA روی ناحیهٔ تیرهٔ پایین تصویر */}
      <div className="relative flex aspect-[780/820] items-end justify-center pb-7 nav-desktop:hidden">
        <Link
          href="/product-list"
          className="inline-flex h-11 w-[210px] items-center justify-center gap-1.5 rounded-md bg-white text-[13px] font-bold text-primary-deep shadow-[0_6px_20px_rgba(5,20,32,0.45)] transition-colors hover:bg-white/90"
        >
          شروع معاملات عمده
          <ChevronsLeft size={19} />
        </Link>
      </div>

      {/* دسکتاپ: همان پیام باسکول — h1 + h2 + دکمه */}
      <div className="relative mx-auto hidden max-w-7xl flex-col items-start px-4 py-16 lg:px-6 nav-desktop:flex">
        <h1 className="text-4xl font-bold leading-[61px]">
          ایمچ | بازار خرید و فروش عمده
        </h1>
        <h2 className="mt-4 max-w-xl text-xl font-normal leading-9 text-white/85">
          ارتباط مستقیم با خریداران و فروشندگان عمده
        </h2>
        <Link
          href="/product-list"
          className="mt-12 inline-flex h-12 w-[204px] items-center justify-center gap-1.5 rounded-md bg-white text-base font-medium text-primary-deep transition-colors hover:bg-white/90"
        >
          شروع معاملات عمده
          <ChevronsLeft size={20} />
        </Link>
      </div>
    </section>
  );
}
