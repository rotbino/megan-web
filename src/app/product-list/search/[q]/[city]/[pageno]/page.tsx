import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { CitySearchScreen } from '@/components/products/search-screen';
import { searchPath, stripSearchNoise } from '@/lib/popular-searches';
import { normalizeQuery } from '@/lib/search-log';
import { resolveCityByName } from '@/lib/city-resolver';
import { parsePageNo, pageTitleSuffix } from '@/lib/pagination';

/**
 * صفحات ۲ به بعد صفحهٔ فرود شهری — /product-list/search/{کالا}/{شهر}/2 و…
 * (خواستهٔ مالک ۱۴-۱۱). صفحهٔ ۱ → ریدایرکت دائمی به آدرس تمیز شهر.
 */
export const revalidate = 300;

interface Props {
  params: Promise<{ q: string; city: string; pageno: string }>;
}

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { q: rawQ, city: rawCity, pageno } = await params;
  const n = parsePageNo(pageno) ?? 1;
  const clean = normalizeQuery(safeDecode(rawQ));
  const city = await resolveCityByName(safeDecode(rawCity));
  if (!clean || !city) return { title: 'جستجو در ایمچ' };
  const base = `${searchPath(clean)}/${encodeURIComponent(city.name)}`;
  const title = pageTitleSuffix(`خرید عمده ${clean} در ${city.name} | قیمت روز فروش عمده — ایمچ`, n);
  return {
    title,
    description: `خرید عمده و فروش عمده ${clean} در ${city.name} با قیمت روز از تولیدکنندگان و فروشندگان ${city.name}؛ لیست آگهی‌ها، مقایسه قیمت و ارتباط مستقیم با تامین‌کننده در بازار عمده ایمچ.`,
    alternates: { canonical: n > 1 ? `${base}/${n}` : base },
    openGraph: {
      title,
      description: `آگهی‌های فروش عمده ${clean} در ${city.name}`,
      type: 'website',
    },
  };
}

export default async function CitySearchPagedPage({ params }: Props) {
  const { q, city: rawCity, pageno } = await params;
  const n = parsePageNo(pageno);
  if (n === null) notFound();
  if (n === 1) {
    const qClean = stripSearchNoise(normalizeQuery(safeDecode(q)));
    const city = await resolveCityByName(safeDecode(rawCity));
    permanentRedirect(city ? `${searchPath(qClean)}/${encodeURIComponent(city.name)}` : '/product-list');
  }
  return <CitySearchScreen rawQ={q} rawCity={rawCity} page={n} />;
}
