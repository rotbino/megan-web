import { notFound, permanentRedirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ProductListing } from '@/components/products/product-listing';
import { SearchPing } from '@/components/products/search-ping';
import { JsonLd } from '@/components/shared/json-ld';
import { SeoCityLinks } from '@/components/seo/city-links';
import { getProductsSSR } from '@/lib/mock/api';
import { searchPath, stripSearchNoise } from '@/lib/popular-searches';
import { normalizeQuery } from '@/lib/search-log';
import { resolveCityByName } from '@/lib/city-resolver';
import { SITE_URL } from '@/lib/site';

/**
 * اسکرین مشترک «جستجوی سئو» — /product-list/search/[q] و
 * /product-list/search/[q]/page/[pageno] (خواستهٔ مالک ۱۴-۱۱: هر پیج URL
 * جداگانه مثل /product-list/search/سیب/page/2). اینجا پوشه/page لازم است چون
 * [q] در همان سطح برخورد «شهر» دارد و [pageno] لخت مبهم می‌شد.
 *
 * هر جستجوی کاربر (هدر، فوتر، گوگل) به یک URL اختصاصی و ایندکس‌پذیر می‌رسد:
 * عنوان/توضیحات/کنونیکال اختصاصی + ItemList ساخت‌یافته + رندر سروری
 * نتایج (ISR ۵ دقیقه‌ای). ورودی‌های گوگل اغلب کلمات اضافه دارند؛ عبارت با
 * stripSearchNoise پاکسازی می‌شود و آدرس شنی با ریدایرکت ۳۰۸ دائمی به آدرس
 * یکتای همان کالا می‌رسد (شمارهٔ صفحه در ریدایرکت حفظ می‌شود).
 */

/** پارامتر مسیر ممکن است کدشده یا پیش‌تر دیکدشده برسد — هر دو پشتیبانی می‌شود */
function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export async function SearchScreen({ rawQ, page }: { rawQ: string; page: number }) {
  const q = normalizeQuery(safeDecode(rawQ));
  if (!q) notFound();

  // ورودی گوگل / سرچ باکس → عبارت هسته‌ای؛ آدرس شنی برای همیشه به آدرس یکتا
  // (کنونیکال) ریدایرکت می‌شود — با حفظ شمارهٔ صفحه
  const clean = stripSearchNoise(q);
  if (clean && clean !== q) {
    permanentRedirect(page > 1 ? `${searchPath(clean)}/page/${page}` : searchPath(clean));
  }

  // کوئری پیش‌فرض اولیه — عین ساختار کلاینت تا queryKey یکی باشد و initialData بخورد
  const initial = await getProductsSSR({ s: clean, sort: 'related', page }, 300);
  if (page > 1 && initial && initial.items.length === 0) notFound();

  const base = searchPath(clean);

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 pt-4 lg:px-6 lg:pt-6">
          <h1 className="text-lg font-extrabold lg:text-2xl">
            {/عمده\s*$/.test(clean) ? clean : `${clean} عمده`}
          </h1>
          <p className="mt-1.5 max-w-3xl text-xs leading-6 text-muted-foreground lg:text-sm">
            خرید و فروش عمده «{clean}» مستقیم از تولیدکننده و عرضه‌کننده ایرانی در بازار عمده ایمچ؛
            قیمت‌ها را مقایسه کنید و بدون واسطه با فروشنده در تماس باشید.
          </p>
        </div>
        <ProductListing
          searchQuery={clean}
          initialData={initial ?? undefined}
          initialPage={page}
          page1Href={base}
          pageHrefPattern={`${base}/page/{p}`}
        />
        {/* لینک‌های داخلی سئو: شهرها × این کالا + انواع — سرور-رندر برای کرال گوگل */}
        <div className="mt-6">
          <SeoCityLinks core={clean} />
        </div>
      </main>
      <Footer />
      {/* ثبت ورودی برای آمار «ورودی‌های گوگل» — بعد از هیدریشن، بی‌صدا */}
      <SearchPing q={clean} />
      {initial && initial.items.length > 0 && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `آگهی‌های فروش عمده ${clean}`,
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

/**
 * اسکرین مشترک «صفحهٔ فرود شهری» — /product-list/search/[q]/[city] و
 * /product-list/search/[q]/[city]/[pageno] (خواستهٔ مالک ۱-۱۱ + ۱۴-۱۱).
 *
 * نتایج واقعاً با city_id همان شهر فیلتر می‌شوند (SSR)؛ کنونیکال خودارجاع
 * (آدرس شهر مستقل از صفحهٔ کشوری ایندکس می‌شود)؛ شهر ناشناخته → 404؛
 * عبارت شنی → ریدایرکت ۳۰۸ به آدرس هسته‌ای همان شهر (با حفظ شمارهٔ صفحه).
 */
export async function CitySearchScreen({
  rawQ,
  rawCity,
  page,
}: {
  rawQ: string;
  rawCity: string;
  page: number;
}) {
  const q = normalizeQuery(safeDecode(rawQ));
  const city = await resolveCityByName(safeDecode(rawCity));
  if (!q || !city) notFound();

  // عبارت شنی → آدرس هسته‌ایِ همان شهر (کنونیکال واحد برای گوگل)
  const clean = stripSearchNoise(q);
  const citySeg = encodeURIComponent(city.name);
  if (clean && clean !== q) {
    permanentRedirect(page > 1 ? `${searchPath(clean)}/${citySeg}/${page}` : `${searchPath(clean)}/${citySeg}`);
  }

  // نتایج SSR با فیلتر واقعی شهر — عین ساختار کلاینت تا initialData بخورد
  const initial = await getProductsSSR(
    { s: clean, sort: 'related', page, cityId: city.id, provinceId: city.provinceId },
    300,
  );
  if (page > 1 && initial && initial.items.length === 0) notFound();

  const base = `${searchPath(clean)}/${citySeg}`;

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 pt-4 lg:px-6 lg:pt-6">
          <h1 className="text-lg font-extrabold lg:text-2xl">
            خرید و فروش عمده {clean} در {city.name}
          </h1>
          <p className="mt-1.5 max-w-3xl text-xs leading-6 text-muted-foreground lg:text-sm">
            خرید عمده و فروش عمده «{clean}» در {city.name} مستقیم از تولیدکننده و عرضه‌کننده ایرانی؛
            قیمت‌ها را مقایسه کنید و بدون واسطه با فروشنده در {city.name} در تماس باشید.
          </p>
        </div>
        <ProductListing
          searchQuery={clean}
          initialData={initial ?? undefined}
          initialProvinceId={city.provinceId}
          initialCityId={city.id}
          initialPage={page}
          page1Href={base}
          pageHrefPattern={`${base}/{p}`}
        />
        {/* لینک‌های داخلی سئو: بقیهٔ شهرها × همین کالا + انواع هم‌گروه */}
        <div className="mt-6">
          <SeoCityLinks core={clean} excludeCity={city.name} />
        </div>
      </main>
      <Footer />
      {/* ثبت ورودی برای آمار «ورودی‌های گوگل» — شمارنده روی عبارت هسته‌ای */}
      <SearchPing q={clean} />
      {initial && initial.items.length > 0 && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `آگهی‌های فروش عمده ${clean} در ${city.name}`,
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
