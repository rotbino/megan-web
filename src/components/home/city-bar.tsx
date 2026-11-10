import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { listMajorCities } from '@/lib/city-markets';

/**
 * باکس «بازار عمده شهرها» در صفحه اول (خواستهٔ مالک ۹-۱۱ دور جدید):
 * نوار شهرهای بزرگ به ترتیب اهمیت — ورودی مستقیم به بازار عمده هر شهر
 * (imach.ir/city/tehran …) الگوی «شهرهای پربازدید» دیوار.
 *
 *  · دیتا فقط از دیتابیس: listMajorCities → رزولور شهرهای بک‌اند —
 *    «همه چیز باید از دیتابیس بیاد» (خواستهٔ مالک)؛
 *  · بک‌اند در دسترس نیست → باکس حذف می‌شود (null) تا صفحه سالم بماند؛
 *  · موبایل: اسکرول افقی روان (no-scrollbar)؛ دسکتاپ: چیپ‌ها wrap می‌شوند؛
 *  · مینیمال — بدون رنگ اضافه؛ همان زبان کارت‌های صفحه اول.
 */
export async function CityBar() {
  const majors = await listMajorCities();
  if (majors.length === 0) return null;

  return (
    <section
      aria-labelledby="city-markets"
      className="mx-auto max-w-7xl px-4 pt-6 lg:px-6 lg:pt-6"
    >
      <div className="rounded-lg border border-border/70 bg-card shadow-sm">
        <div className="flex items-center justify-between px-4 pt-3 lg:px-5 lg:pt-3.5">
          <h2 id="city-markets" className="flex items-center gap-1.5 text-sm font-bold leading-7 lg:text-base">
            <MapPin size={16} className="text-primary" />
            بازار عمده شهرها
          </h2>
          <Link
            href="/city"
            className="shrink-0 text-xs font-medium leading-7 text-primary transition-colors hover:text-primary/80 lg:text-sm"
          >
            همه شهرها
          </Link>
        </div>
        <nav
          aria-label="بازار عمده شهرهای ایران"
          className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 pt-2.5 lg:flex-wrap lg:overflow-visible lg:px-5 lg:pb-4 lg:pt-3"
        >
          {majors.map((c) => (
            <Link
              key={c.slug}
              href={`/city/${c.slug}`}
              title={`بازار عمده ${c.name}`}
              className="shrink-0 rounded-full border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent lg:text-[13px]"
            >
              {c.name}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
