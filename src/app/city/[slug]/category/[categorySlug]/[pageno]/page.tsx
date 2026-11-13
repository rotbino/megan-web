import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
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
import { parsePageNo, pageTitleSuffix } from '@/lib/pagination';

/**
 * صفحات ۲ به بعد دستهٔ بازار شهری — /city/tehran/category/berenge/2 و…
 * (خواستهٔ مالک ۱۴-۱۱): هر پیج URL اختصاصی برای ایندکس جداگانهٔ گوگل؛
 * صفحهٔ ۱ ریدایرکت دائمی به آدرس تمیز دسته.
 */
export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string; categorySlug: string; pageno: string }>;
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
  const { slug, categorySlug, pageno } = await params;
  const n = parsePageNo(pageno) ?? 1;
  const resolved = await resolveCityCategory(slug, categorySlug);
  if (!resolved) return { title: 'بازار عمده شهر' };
  const { city, path } = resolved;
  const cat = path.at(-1)!;
  const base = `${marketCanonical(city)}/category/${encodeURIComponent(cat.slug)}`;
  const title = pageTitleSuffix(`خرید عمده ${cat.categoryName} در ${city.name} | قیمت ${cat.categoryName} ${city.name}`, n);
  return {
    title,
    description: `خرید و فروش عمده ${cat.categoryName} در ${city.name} — لیست قیمت و آگهی‌های فروشندگان، تولیدکنندگان و شرکت‌های پخش ${city.name}؛ ارتباط بی‌واسطه با تامین‌کننده در ایمچ.`,
    alternates: { canonical: n > 1 ? `${base}/${n}` : base },
    openGraph: {
      title,
      description: `آگهی‌های فروش عمده ${cat.categoryName} در ${city.name}`,
      type: 'website',
    },
  };
}

export default async function CityMarketCategoryPagedPage({ params, searchParams }: Props) {
  const { slug, categorySlug, pageno } = await params;
  const resolved = await resolveCityCategory(slug, categorySlug);
  if (!resolved) notFound();

  const n = parsePageNo(pageno);
  if (n === null) notFound();
  if (n === 1) {
    const cat = resolved.path.at(-1)!;
    permanentRedirect(`${marketCanonical(resolved.city)}/category/${encodeURIComponent(cat.slug)}`);
  }

  // تیک‌های چندشهری از URL — اعتبارسنجی در ویو
  const sp = await searchParams;
  const raw = Array.isArray(sp.cities) ? sp.cities.join(',') : sp.cities;
  const requestedCityIds = parseCitiesParam(raw);

  return (
    <>
      <Header />
      <main className="flex-1">
        <CityMarketView
          city={resolved.city}
          categoryPath={resolved.path}
          requestedCityIds={requestedCityIds}
          page={n}
        />
      </main>
      <Footer />
    </>
  );
}
