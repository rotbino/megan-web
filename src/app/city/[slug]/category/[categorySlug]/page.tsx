import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import {
  CityMarketView,
  marketCanonical,
  parseCitiesParam,
} from '@/components/city/city-market-view';
import { resolveMarketCity } from '@/lib/city-markets';
import { getCategoryTreeSSR } from '@/lib/mock/api';
import { findCategoryPath } from '@/lib/categories';

/**
 * دستهٔ داخل بازار شهری — /city/{slug}/category/{categorySlug}
 * (خواستهٔ مالک ۹-۱۱): ساختار عین صفحهٔ دستهٔ لیست ملی، فقط اختصاصی‌شده
 * برای یک شهر. فیلتر فقط روی دسته/مرتب‌سازی/صفحه است — شهر ثابت، و
 * «شهرهای استان» (تیک چندشهری پایدار در ?cities=) به‌جای فیلتر مکان.
 *
 * این صفحات پتانسیل سئو بالایی دارند: «خرید عمده برنج در تهران»،
 * «قیمت سیب در همدان» و… — هر جفت (شهر، دسته) یک URL یکتا.
 */
export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string; categorySlug: string }>;
  searchParams: Promise<{ cities?: string | string[] }>;
}

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

/** رزولوشن شهر + دسته — هر دو باید در دیتابیس باشند وگرنه 404 */
async function resolveCityCategory(rawSlug: string, rawCatSlug: string) {
  const city = await resolveMarketCity(rawSlug);
  if (!city) return null;
  const tree = (await getCategoryTreeSSR(3600)) ?? [];
  const path = findCategoryPath(tree, safeDecode(rawCatSlug));
  if (!path || path.length === 0) return null;
  return { city, path };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, categorySlug } = await params;
  const resolved = await resolveCityCategory(slug, categorySlug);
  if (!resolved) return { title: 'بازار عمده شهر' };
  const { city, path } = resolved;
  const cat = path.at(-1)!;
  const title = `خرید عمده ${cat.categoryName} در ${city.name} | قیمت ${cat.categoryName} ${city.name}`;
  return {
    title,
    description: `خرید و فروش عمده ${cat.categoryName} در ${city.name} — لیست قیمت و آگهی‌های فروشندگان، تولیدکنندگان و شرکت‌های پخش ${city.name}؛ ارتباط بی‌واسطه با تامین‌کننده در ایمچ.`,
    alternates: {
      canonical: `${marketCanonical(city)}/category/${encodeURIComponent(cat.slug)}`,
    },
    openGraph: {
      title,
      description: `آگهی‌های فروش عمده ${cat.categoryName} در ${city.name}`,
      type: 'website',
    },
  };
}

export default async function CityMarketCategoryPage({ params, searchParams }: Props) {
  const { slug, categorySlug } = await params;
  const resolved = await resolveCityCategory(slug, categorySlug);
  if (!resolved) notFound();

  // تیک‌های چندشهری از URL — اعتبارسنجی در ویو
  const sp = await searchParams;
  const raw = Array.isArray(sp.cities) ? sp.cities.join(',') : sp.cities;
  const requestedCityIds = parseCitiesParam(raw);

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* صفحهٔ ۱ — آدرس تمیز دستهٔ شهری؛ صفحه‌های بعدی از [pageno] (۱۴-۱۱) */}
        <CityMarketView
          city={resolved.city}
          categoryPath={resolved.path}
          requestedCityIds={requestedCityIds}
          page={1}
        />
      </main>
      <Footer />
    </>
  );
}
