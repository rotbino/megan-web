import type { Metadata } from 'next';
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
 * صفحهٔ فرود شهری سئو — /product-list/search/{کالا}/{شهر}
 *
 * خواستهٔ مالک ۱-۱۱ (دور جدید): «تک تک شهرها با تک تک دسته ها … اینطوری ما
 * می‌تونیم به مرجع عمده خرید در شهرها تبدیل بشیم». هر عبارت شهریِ جهان
 * جستجو (خرید عمده برنج در تهران) به همین‌جا لینک می‌شود:
 *
 *  · نتایج واقعاً با city_id همان شهر فیلتر می‌شوند (SSR) — محتوای متفاوت؛
 *  · h1/عنوان/توضیحات اختصاصی با نام کالا + شهر — کلیدواژهٔ کامل؛
 *  · کنونیکال خودارجاع (آدرس شهر مستقل از صفحهٔ کشوری ایندکس می‌شود)؛
 *  · ISR مثل صفحهٔ کشوری (revalidate ۳۰۰ ثانیه) — مسیر-محور، بدون searchParams
 *    تا رندر ایستا و کرال‌پذیری حفظ شود؛
 *  · لینک‌های داخلی: بقیهٔ شهرها (همان کالا) + انواع هم‌گروه — شبکهٔ برای
 *    گوگل که با اولین کرال هزاران صفحه را کشف کند.
 *
 * شهر ناشناخته → 404 (جلوگیری از URL های جعلی)؛ عبارت شنی → ریدایرکت ۳۰۸
 * به آدرس هسته‌ای همان شهر.
 */
export const revalidate = 300;

interface Props {
  params: Promise<{ q: string; city: string }>;
}

/** پارامتر مسیر ممکن است کدشده یا پیش‌تر دیکدشده برسد — هر دو پشتیبانی می‌شود */
function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { q: rawQ, city: rawCity } = await params;
  const clean = normalizeQuery(safeDecode(rawQ));
  const cityName = safeDecode(rawCity);
  const city = await resolveCityByName(cityName);
  if (!clean || !city) return { title: 'جستجو در ایمچ' };
  const title = `خرید عمده ${clean} در ${city.name} | قیمت روز فروش عمده — ایمچ`;
  return {
    title,
    description: `خرید عمده و فروش عمده ${clean} در ${city.name} با قیمت روز از تولیدکنندگان و فروشندگان ${city.name}؛ لیست آگهی‌ها، مقایسه قیمت و ارتباط مستقیم با تامین‌کننده در بازار عمده ایمچ.`,
    alternates: { canonical: `${searchPath(clean)}/${encodeURIComponent(city.name)}` },
    openGraph: {
      title,
      description: `آگهی‌های فروش عمده ${clean} در ${city.name}`,
      type: 'website',
    },
  };
}

export default async function CitySearchPage({ params }: Props) {
  const { q: rawQ, city: rawCity } = await params;
  const q = normalizeQuery(safeDecode(rawQ));
  const city = await resolveCityByName(safeDecode(rawCity));
  if (!q || !city) notFound();

  // عبارت شنی → آدرس هسته‌ایِ همان شهر (کنونیکال واحد برای گوگل)
  const clean = stripSearchNoise(q);
  if (clean && clean !== q) permanentRedirect(`${searchPath(clean)}/${encodeURIComponent(city.name)}`);

  // نتایج SSR با فیلتر واقعی شهر — عین ساختار کلاینت تا initialData بخورد
  const initial = await getProductsSSR(
    { s: clean, sort: 'related', page: 1, cityId: city.id, provinceId: city.provinceId },
    300,
  );

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
