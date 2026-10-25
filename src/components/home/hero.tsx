import Link from 'next/link';
import { ChevronsLeft } from 'lucide-react';

/**
 * هیرو صفحه اصلی — همان متن و چیدمان باسکول (h1 + h2 + دکمه شروع معاملات).
 * اندازه‌فونت موبایل دقیقاً باسکول: عنوان ۱۸px/۳۱px، زیرعنوان ۱۲px، دکمه ۱۸۴×۴۰ با متن ۱۲px.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary-deep text-white">
      {/* تصویر پس‌زمینه + پوشش تیره ملایم (الگوی باسکول: تصویر دیده شود) */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[url('/images/hero.webp')] bg-cover bg-center"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-primary-deep/75 via-primary-deep/55 to-primary-deep/80"
      />

      <div className="relative mx-auto flex max-w-7xl flex-col items-start px-4 pb-8 pt-8 nav-desktop:py-16 lg:px-6">
        <h1 className="text-[18px] font-bold leading-[31px] nav-desktop:text-4xl nav-desktop:leading-[61px]">
          ایمچ | بازار خرید و فروش عمده
        </h1>
        <h2 className="mt-2 max-w-xl text-xs font-normal leading-5 text-white/85 nav-desktop:mt-4 nav-desktop:text-xl nav-desktop:leading-9">
          ارتباط مستقیم با خریداران و فروشندگان عمده
        </h2>
        <Link
          href="/product-list"
          className="mt-8 inline-flex h-10 w-[184px] items-center justify-center gap-1.5 rounded-lg bg-white text-xs font-medium text-primary-deep transition-colors hover:bg-white/90 nav-desktop:mt-12 nav-desktop:h-12 nav-desktop:w-[204px] nav-desktop:text-base"
        >
          شروع معاملات عمده
          <ChevronsLeft size={20} />
        </Link>
      </div>
    </section>
  );
}
