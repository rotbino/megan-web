import Link from 'next/link';
import { MapPin, Tags } from 'lucide-react';
import { getLandingLinks, getSearchUniverse, type LandingLinks } from '@/lib/search-universe';

/**
 * لینک‌های داخلی سئو روی صفحات فرود کالا — خواستهٔ مالک ۱-۱۱ (دور جدید):
 * «در صفحه برنج این لینک‌های مربوط به برنج رو از دیتابیس بکشیم بیرون و در
 * صفحه طبق قوانین سئو بذاریم» — برای تک تک دسته‌ها و تک تک شهرها.
 *
 * قوانین سئو رعایت‌شده:
 *  · HTML خالص سرور-رندر (بدون جاوااسکریپت — اولین کرال گوگل همه را می‌بیند)؛
 *  · anchor دقیقاً عبارت جستجوی کاربر («خرید عمده برنج در تهران»)؛
 *  · هر مقصد صفحهٔ ایندکس‌پذیر مستقل با محتوای متفاوت (فیلتر واقعی شهر)؛
 *  · جای‌گذاری انتهای صفحه (الگوی فوتر سئو باسکول) — مزاحم تجربه نمی‌شود.
 *
 * async server component است؛ universe در هر پروسه یک‌بار ساخته می‌شود.
 */
export async function SeoCityLinks({ core, excludeCity }: { core: string; excludeCity?: string }) {
  let links: LandingLinks = { cityLinks: [], varietyLinks: [] };
  try {
    const universe = await getSearchUniverse();
    links = getLandingLinks(universe, core, excludeCity);
  } catch {
    return null; // بک‌اند در دسترس نیست — بلوک حذف می‌شود، صفحه سالم می‌ماند
  }

  const { cityLinks, varietyLinks } = links;
  if (cityLinks.length === 0 && varietyLinks.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-8 lg:px-6" aria-label="خرید و فروش عمده در شهرها">
      <div className="rounded-lg border bg-card p-4 lg:p-5">
        {/* شهرها — خرید عمده {کالا} در {شهر} */}
        {cityLinks.length > 0 && (
          <>
            <h2 className="flex items-center gap-1.5 text-sm font-bold">
              <MapPin size={15} className="text-primary" />
              خرید و فروش عمده {core} در شهرهای ایران
            </h2>
            <nav aria-label={`شهرهای ${core}`} className="mt-3">
              <ul className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cityLinks.map((l) => (
                  <li key={l.phrase}>
                    <Link
                      href={l.url}
                      className="block truncate rounded px-1.5 py-1 text-[12.5px] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                      title={l.phrase}
                    >
                      {l.phrase}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </>
        )}

        {/* انواع کالا — خرید عمده برنج هاشمی و… */}
        {varietyLinks.length > 0 && (
          <>
            <h2 className="mt-5 flex items-center gap-1.5 text-sm font-bold">
              <Tags size={15} className="text-primary" />
              خرید و فروش عمده انواع {core}
            </h2>
            <nav aria-label={`انواع ${core}`} className="mt-3">
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {varietyLinks.map((l) => (
                  <li key={l.phrase}>
                    <Link
                      href={l.url}
                      className="block truncate rounded px-1.5 py-1 text-[12.5px] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                      title={l.phrase}
                    >
                      {l.phrase}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </>
        )}
      </div>
    </section>
  );
}
