import Link from 'next/link';
import { Search, UserRound } from 'lucide-react';
import { getLandingLinks, getSearchUniverse } from '@/lib/search-universe';
import { searchPath } from '@/lib/popular-searches';

/**
 * «جستجوهای مرتبط» انتهای صفحهٔ محصول (خواسته مالک ۱-۱۱ دور هفتم):
 * به‌جای کلمات عمومی، دقیقاً عبارت‌هایی که به «این کالا × این شهر × این فروشنده»
 * مربوط‌اند — سیگنال ایندکس قوی برای گوگل و مسیر رسیدن کاربران جستجو به آگهی.
 *
 * سه گروه (همه سرور-رندر، anchor = عبارت واقعی جستجوی کاربر گوگل):
 *  ۱) خودِ آگهی — خرید/قیمت عمده {نام کالا} [در {شهر خود آگهی}]
 *  ۲) دسته و نوع کالا — شهرهای ایران × انواع (از جهان سئو)
 *  ۳) فروشنده — جستجوی نام کاربر (رتبه‌گیری پروفایل در گوگل)
 */
export async function RelatedSearches({
  productName,
  subCategoryName,
  cityName,
  sellerUserName,
  sellerName,
}: {
  productName: string;
  subCategoryName: string;
  cityName: string;
  sellerUserName: string;
  sellerName: string;
}) {
  // مسیرهای جستجوی خودِ این کالا — هستهٔ پاک‌شده نام آگهی
  const corePath = searchPath(productName);
  const productLinks = [
    { phrase: `خرید عمده ${productName}`, url: corePath },
    { phrase: `قیمت عمده ${productName} در ${cityName}`, url: `${corePath}/${encodeURIComponent(cityName)}` },
  ];

  // دسته × شهر × نوع — از جهان سئو (شهر خودِ آگهی از لینک‌های شهری کنار می‌رود)
  let categoryLinks: { phrase: string; url: string }[] = [];
  let varietyLinks: { phrase: string; url: string }[] = [];
  try {
    const universe = await getSearchUniverse();
    const links = getLandingLinks(universe, subCategoryName, cityName);
    categoryLinks = links.cityLinks;
    varietyLinks = links.varietyLinks;
  } catch {
    // بک‌اند در دسترس نیست — گروه دوم حذف می‌شود، بقیه می‌مانند
  }

  // ددوبلیکیشن عبارت‌ها — «خرید عمده سیب زمینی آگریا» ممکن است هم در لینک‌های
  // خودِ آگهی باشد هم در انواع دسته؛ فقط اولین مورد می‌ماند (بدون key تکراری)
  const seenPhrases = new Set<string>();
  const unique = (arr: { phrase: string; url: string }[]) =>
    arr.filter((l) => {
      if (seenPhrases.has(l.phrase)) return false;
      seenPhrases.add(l.phrase);
      return true;
    });
  const shownProductLinks = unique(productLinks);
  const shownVarietyLinks = unique(varietyLinks);
  const shownCategoryLinks = unique(categoryLinks);

  if (shownProductLinks.length + shownCategoryLinks.length + shownVarietyLinks.length === 0) return null;

  return (
    <section
      className="mx-auto max-w-7xl px-4 pb-8 lg:px-6"
      aria-label="جستجوهای مرتبط با این آگهی"
    >
      <div className="rounded-lg border bg-card p-4 lg:p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-bold">
          <Search size={15} className="text-primary" />
          جستجوهای مرتبط با خرید عمده {subCategoryName}
        </h2>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {shownProductLinks.map((l) => (
            <Link
              key={l.phrase}
              href={l.url}
              className="rounded px-1.5 py-1 text-[12.5px] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
              title={l.phrase}
            >
              {l.phrase}
            </Link>
          ))}
          {shownVarietyLinks.map((l) => (
            <Link
              key={l.phrase}
              href={l.url}
              className="rounded px-1.5 py-1 text-[12.5px] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
              title={l.phrase}
            >
              {l.phrase}
            </Link>
          ))}
        </div>

        {shownCategoryLinks.length > 0 && (
          <>
            <h3 className="mt-5 flex items-center gap-1.5 text-[13px] font-bold text-foreground/80">
              <UserRound size={13} className="text-primary" />
              خرید عمده {subCategoryName} در شهرهای ایران
            </h3>
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
              {/* پروفایل فروشنده — جستجوی نام کاربر در گوگل به اینجا می‌رسد */}
              <Link
                href={`/c/${sellerUserName}`}
                className="rounded px-1.5 py-1 text-[12.5px] font-medium text-primary/90 transition-colors hover:bg-accent/60 hover:text-primary"
                title={`${sellerName} — فروشنده ${subCategoryName} در ${cityName}`}
              >
                {sellerName}، فروشندهٔ {subCategoryName} در {cityName}
              </Link>
              {shownCategoryLinks.map((l) => (
                <Link
                  key={l.phrase}
                  href={l.url}
                  className="rounded px-1.5 py-1 text-[12.5px] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                  title={l.phrase}
                >
                  {l.phrase}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
