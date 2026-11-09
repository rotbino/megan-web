import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { CityMarketListing, type ProvinceCityOption } from '@/components/city/city-market-listing';
import { CategoryFilter } from '@/components/products/category-filter';
import { JsonLd } from '@/components/shared/json-ld';
import { getCategoryTreeSSR, getCityMarketProductsSSR, getProvincesSSR } from '@/lib/mock/api';
import { listCitiesOfProvince } from '@/lib/city-resolver';
import { compareProvinceCities, listMajorCities, majorSlugOf, type MarketCity } from '@/lib/city-markets';
import { toFa } from '@/lib/format';
import { SITE_URL } from '@/lib/site';
import type { Category } from '@/lib/types';

/**
 * پوستهٔ سرور «بازار عمدهٔ شهری» — مشترک بین ریشهٔ بازار (/city/tehran)
 * و دسته‌های داخل بازار (/city/tehran/category/berenge) (خواستهٔ مالک ۹-۱۱).
 *
 * ساختار عین صفحهٔ فیلتر لیست ملی است (سایدبار دسته + نوار مرتب‌سازی + گرید
 * + صفحه‌بندی) با دو تفاوت کلیدی:
 *  · فیلتر استان/شهر نیست — شهرِ صفحه ثابت است (چیپ قفل‌شده)؛
 *  · به‌جایش «شهرهای استان» تیک‌خوران است (چندشهری، پایدار در ?cities=).
 * جایگاه‌های تبلیغاتی/ریل ویژه عمداً نیست — کاربر ویژه و نردبان با سورت
 * related بالاتر دیده می‌شوند، عین لیست ملی (خواستهٔ مالک).
 */
export interface CityMarketViewProps {
  city: MarketCity;
  /** مسیر دستهٔ فعال — در صفحهٔ دستهٔ شهری پر می‌شود */
  categoryPath?: Category[];
  /** تیک‌های چندشهری از URL (?cities=) — پیش از اعتبارسنجی */
  requestedCityIds?: number[];
}

/** آدرس کنونیکال بازار — اسلاگ لاتین شهرهای بزرگ، نام فارسی کدشدهٔ بقیه */
export function marketCanonical(city: { slug: string | null; name: string }): string {
  return city.slug ? `/city/${city.slug}` : `/city/${encodeURIComponent(city.name)}`;
}

/** cities=102,103 → [102,103] — فقط ارقام سالم */
export function parseCitiesParam(raw?: string): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

export async function CityMarketView({ city, categoryPath, requestedCityIds }: CityMarketViewProps) {
  const category = categoryPath?.at(-1);

  // دیتای بازار — همهٔ فراخوانی‌ها موازی و مستقل (خرابی یکی بقیه را نمی‌اندازد)
  const [tree, provinces, allProvinceCities, majors, initial] = await Promise.all([
    getCategoryTreeSSR(3600),
    getProvincesSSR(3600),
    listCitiesOfProvince(city.provinceId),
    listMajorCities(),
    getCityMarketProductsSSR(
      { cityIds: [city.id], categorySlug: category?.slug, sort: 'related', page: 1 },
      300,
    ),
  ]);

  const provinceName =
    provinces?.find((p) => p.id === city.provinceId)?.name ?? '';
  const cityHref = marketCanonical(city);

  // شهرهای دیگر استان — بزرگ‌ها اول؛ برای تیک چندشهری و دسترسی سریع
  const provinceCities: ProvinceCityOption[] = allProvinceCities
    .filter((c) => c.id !== city.id)
    .map((c) => ({
      id: c.id,
      name: c.name,
      major: majorSlugOf(c.name) != null,
    }))
    .sort(compareProvinceCities);

  // اعتبارسنجی ?cities= — فقط شهرهای همان استان پذیرفته می‌شوند (لینک کهنه/ساختگی نه)
  const validCityIds = new Set(provinceCities.map((c) => c.id));
  const extraCityIds = (requestedCityIds ?? []).filter((id) => validCityIds.has(id));

  const sidebar =
    tree && tree.length > 0 ? (
      <CategoryFilter
        tree={tree}
        path={categoryPath}
        hrefBase={cityHref}
        categoryBase={`${cityHref}/category`}
        query={extraCityIds.length ? `cities=${extraCityIds.join(',')}` : undefined}
      />
    ) : undefined;

  const others = majors.filter((m) => m.id !== city.id && m.name !== city.name);
  const total = initial?.total ?? 0;
  const h1 = category
    ? `${category.categoryName} عمده در ${city.name}`
    : `بازار عمده ${city.name}`;

  const breadcrumbLd = category && {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ایمچ', item: SITE_URL },
      {
        '@type': 'ListItem',
        position: 2,
        name: `بازار عمده ${city.name}`,
        item: `${SITE_URL}${cityHref}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: category.categoryName,
        item: `${SITE_URL}${cityHref}/category/${encodeURIComponent(category.slug)}`,
      },
    ],
  };

  return (
    <>
      {/* ---------- هیرو مینیمال: هویت بازار + آمار واقعی ---------- */}
      <div className="mx-auto max-w-7xl px-4 pt-4 lg:px-6 lg:pt-6">
        <div className="rounded-lg border border-border/70 bg-card p-4 shadow-sm lg:p-5">
          <h1 className="text-lg font-extrabold lg:text-2xl">{h1}</h1>
          <p className="mt-1.5 max-w-3xl text-xs leading-6 text-muted-foreground lg:text-sm">
            {category ? (
              <>
                خرید و فروش عمده {category.categoryName} مستقیم از فروشندگان، تولیدکنندگان و
                شرکت‌های پخش {city.name}؛ قیمت‌ها را مقایسه کنید و بی‌واسطه با تامین‌کنندهٔ
                همشهرتان در تماس باشید.
              </>
            ) : (
              <>
                خرید و فروش عمده مستقیم از فروشندگان، تولیدکنندگان و شرکت‌های پخش {city.name}؛
                قیمت‌ها را مقایسه کنید و بی‌واسطه با تامین‌کنندهٔ همشهرتان در تماس باشید.
              </>
            )}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {total > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-secondary-foreground">
                {toFa(total)} آگهی فعال در {city.name}
              </span>
            )}
            {provinceName && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-secondary-foreground">
                <MapPin size={12} />
                استان {provinceName}
              </span>
            )}
            {extraCityIds.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-secondary-foreground">
                جستجو در {toFa(extraCityIds.length + 1)} شهر استان
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ---------- لیست چندشهری — ساختار عین صفحهٔ فیلتر ملی ---------- */}
      <CityMarketListing
        city={{ id: city.id, name: city.name, provinceName }}
        cityHref={cityHref}
        provinceCities={provinceCities}
        categorySlug={category?.slug}
        categoryName={category?.categoryName}
        initialData={initial ?? undefined}
        sidebar={sidebar}
        initialExtraCityIds={extraCityIds}
      />

      {/* ---------- لینک‌های داخلی سئو: بازار بقیهٔ شهرها ---------- */}
      {others.length > 0 && (
        <section
          aria-label="بازار عمده شهرهای دیگر"
          className="mx-auto max-w-7xl px-4 pb-8 pt-6 lg:px-6"
        >
          <div className="rounded-lg border bg-card p-4 lg:p-5">
            <h2 className="flex items-center gap-1.5 text-sm font-bold">
              <MapPin size={15} className="text-primary" />
              بازار عمده شهرهای دیگر
            </h2>
            <nav aria-label="بازار عمده شهرهای ایران" className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {others.map((m) => (
                <Link
                  key={m.slug}
                  href={`/city/${m.slug}`}
                  className="rounded px-1.5 py-1 text-[12.5px] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                >
                  بازار عمده {m.name}
                </Link>
              ))}
            </nav>
          </div>
        </section>
      )}

      {breadcrumbLd && <JsonLd data={breadcrumbLd} />}
      {initial && initial.items.length > 0 && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `آگهی‌های فروش عمده ${category ? `${category.categoryName} در ` : ''}${city.name}`,
            numberOfItems: initial.total,
            itemListElement: initial.items.slice(0, 20).map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `${SITE_URL}/product-view/${p.slug}/${p.categoryName}/${p.id}`,
              name: p.productName,
            })),
          }}
        />
      )}
    </>
  );
}
