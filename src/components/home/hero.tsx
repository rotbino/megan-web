import Link from 'next/link';
import { ChevronsLeft } from 'lucide-react';

/** هیرو صفحه اصلی — همان متن و چیدمان باسکول (h1 + h2 + دکمه شروع معاملات) */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary-deep text-white">
      {/* تصویر پس‌زمینه + پوشش سرمه‌ای برای خوانایی */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[url('/images/hero.webp')] bg-cover bg-center opacity-45"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-primary-deep/85 via-primary-deep/70 to-primary-deep/90"
      />

      <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-5 px-4 py-16 sm:py-24 lg:px-6">
        <h1 className="max-w-2xl text-2xl font-bold leading-snug sm:text-3xl lg:text-4xl">
          ایمچ | بازار خرید و فروش عمده محصولات
        </h1>
        <h2 className="max-w-xl text-sm font-normal leading-6 text-white/85 sm:text-base">
          ارتباط مستقیم با خریداران و فروشندگان عمده
        </h2>
        <Link
          href="/product-list"
          className="inline-flex items-center gap-1.5 rounded-md bg-white px-5 py-2.5 text-sm font-bold text-primary-deep transition-colors hover:bg-white/90"
        >
          شروع معاملات عمده
          <ChevronsLeft size={20} />
        </Link>
      </div>
    </section>
  );
}
