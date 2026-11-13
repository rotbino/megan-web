import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { SearchScreen } from '@/components/products/search-screen';
import { searchPath, stripSearchNoise } from '@/lib/popular-searches';
import { normalizeQuery } from '@/lib/search-log';
import { parsePageNo, pageTitleSuffix } from '@/lib/pagination';

/**
 * صفحات ۲ به بعد جستجوی سئو — /product-list/search/{عبارت}/page/2 و…
 * (خواستهٔ مالک ۱۴-۱۱). پوشهٔ/page چون [q] هم‌سطحش [city] است و شمارهٔ لخت
 * با نام شهر تباه می‌شد. صفحهٔ ۱ → ریدایرکت دائمی به آدرس تمیز جستجو.
 */
export const revalidate = 300;

interface Props {
  params: Promise<{ q: string; pageno: string }>;
}

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { q: rawQ, pageno } = await params;
  const n = parsePageNo(pageno) ?? 1;
  const q = normalizeQuery(safeDecode(rawQ));
  if (!q) return { title: 'جستجو در ایمچ' };
  const clean = stripSearchNoise(q);
  const title = pageTitleSuffix(`${clean} | خرید عمده و فروش عمده در ایمچ`, n);
  return {
    title,
    description: `خرید عمده و فروش عمده ${clean} با بهترین قیمت از تولیدکنندگان و عرضه‌کنندگان سراسر ایران؛ مشاهده لیست قیمت روز، مقایسه آگهی‌ها و ارتباط مستقیم با تامین‌کننده در بازار عمده ایمچ.`,
    alternates: { canonical: n > 1 ? `${searchPath(q)}/page/${n}` : searchPath(q) },
    openGraph: {
      title,
      description: `آگهی‌های فروش عمده با قیمت روز در ایمچ`,
      type: 'website',
    },
  };
}

export default async function SearchPagedPage({ params }: Props) {
  const { q, pageno } = await params;
  const n = parsePageNo(pageno);
  if (n === null) notFound();
  if (n === 1) permanentRedirect(searchPath(safeDecode(q)));
  return <SearchScreen rawQ={q} page={n} />;
}
