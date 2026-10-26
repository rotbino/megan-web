import Link from 'next/link';
import Image from 'next/image';
import { ChevronsLeft } from 'lucide-react';

/**
 * هیرو صفحه اصلی — تم سفیدِ فلت: متن + دکمه آبی (رنگ اصلی فقط در دکمه) +
 * تصویر با قاب ظریف. همان پیام باسکول: h1 + h2 + دکمه شروع معاملات.
 * اندازه‌فونت موبایل دقیقاً باسکول: عنوان ۱۸px/۳۱px، زیرعنوان ۱۲px، دکمه ۱۸۴×۴۰ با متن ۱۲px.
 */
export function Hero() {
  return (
    <section className="border-b bg-card">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 nav-desktop:grid-cols-2 nav-desktop:gap-12 nav-desktop:py-16 lg:px-6">
        <div>
          <h1 className="text-[18px] font-bold leading-[31px] nav-desktop:text-4xl nav-desktop:leading-[61px]">
            ایمچ | بازار خرید و فروش عمده
          </h1>
          <h2 className="mt-2 max-w-xl text-xs font-normal leading-5 text-muted-foreground nav-desktop:mt-4 nav-desktop:text-xl nav-desktop:leading-9">
            ارتباط مستقیم با خریداران و فروشندگان عمده
          </h2>
          <Link
            href="/product-list"
            className="mt-8 inline-flex h-10 w-[184px] items-center justify-center gap-1.5 rounded-lg bg-primary text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-deep nav-desktop:mt-12 nav-desktop:h-12 nav-desktop:w-[204px] nav-desktop:text-base"
          >
            شروع معاملات عمده
            <ChevronsLeft size={20} />
          </Link>
        </div>

        {/* تصویر (LCP صفحه اول) — next/image با priority تا در head preload
            شود؛ قاب ظریف بدون پوشش تیره — همان فایل بهینه ۲۷KB webp */}
        <div className="relative aspect-[16/9] overflow-hidden rounded-lg border bg-secondary nav-desktop:aspect-[5/3]">
          <Image
            src="/images/hero.webp"
            alt="بازار عمده ایمچ"
            fill
            priority
            sizes="(min-width: 992px) 50vw, 100vw"
            // فایل محلی از قبل بهینه (۲۷KB webp) — پاس مستقیم بدون hop بهینه‌ساز
            unoptimized
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
