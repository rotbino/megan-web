import Link from 'next/link';
import { ChevronLeft, MapPin } from 'lucide-react';
import { cityMarketHref, listMajorCities, listTopCityMarkets } from '@/lib/city-markets';

/**
 * باکس «بازار عمده شهرها» در صفحه اول — ورودی مستقیم به بازار عمده هر شهر
 * (imach.ir/city/tehran …).
 *
 *  · ۵۰ شهری که بیشترین آگهی عمومی را دارند، از بیشترین اول (خواستهٔ مالک
 *    ۱۶-۱۱) — دیتا فقط از دیتابیس: /locations/getTopCities (کش بک ۱۰ دقیقه +
 *    کش دادهٔ نکست ۱ ساعت ⇒ صفحهٔ اول هیچ هزینهٔ اضافه‌ای نمی‌پردازد)؛
 *  · بک‌اند قدیمی/در دسترس نیست → فالبک رجیستری شهرهای بزرگ؛ آن هم نبود →
 *    باکس حذف می‌شود (null) تا صفحه سالم بماند؛
 *  · «همه شهرها» دکمهٔ رنگی پر است تا بیشتر به چشم بیاید (خواستهٔ مالک ۱۶-۱۱)؛
 *  · موبایل: اسکرول افقی روان (no-scrollbar)؛ دسکتاپ: چیپ‌ها wrap می‌شوند.
 */
export async function CityBar() {
  // ۱) شهرهای پربازار (۵۰ شهر، نزولی به تعداد آگهی) — ۲) فالبک رجیستری
  const top = await listTopCityMarkets(50);
  const cities: { name: string; href: string }[] = top.map((c) => ({
    name: c.name,
    href: cityMarketHref(c.name),
  }));
  if (cities.length === 0) {
    const majors = await listMajorCities();
    for (const m of majors) cities.push({ name: m.name, href: `/city/${m.slug}` });
  }
  if (cities.length === 0) return null;

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
          {/* دکمهٔ رنگی پر — بیشتر به چشم بیاید (خواستهٔ مالک ۱۶-۱۱) */}
          <Link
            href="/city"
            className="flex shrink-0 items-center gap-0.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold leading-5 text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 lg:text-[13px]"
          >
            همه شهرها
            <ChevronLeft size={14} className="shrink-0" />
          </Link>
        </div>
        <nav
          aria-label="بازار عمده شهرهای ایران"
          className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 pt-2.5 lg:flex-wrap lg:overflow-visible lg:px-5 lg:pb-4 lg:pt-3"
        >
          {cities.map((c) => (
            <Link
              key={c.href}
              href={c.href}
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
