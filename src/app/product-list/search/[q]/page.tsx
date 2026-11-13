import type { Metadata } from 'next';
import { SearchScreen } from '@/components/products/search-screen';
import { searchPath, stripSearchNoise } from '@/lib/popular-searches';
import { normalizeQuery } from '@/lib/search-log';

/**
 * صفحه جستجوی سئو-پسند — /product-list/search/{عبارت}
 *
 * هر جستجوی کاربر (هدر، فوتر، گوگل) به یک URL اختصاصی و ایندکس‌پذیر می‌رسد:
 * عنوان/توضیحات/کنونیکال اختصاصی + ItemList ساخت‌یافته + رندر سروری
 * نتایج (ISR ۵ دقیقه‌ای). صفحه‌های ۲ به بعد از /page/[pageno] می‌آیند
 * (خواستهٔ مالک ۱۴-۱۱ — هر پیج آدرس جدا برای ایندکس جداگانه).
 */
export const revalidate = 300;

interface Props {
  params: Promise<{ q: string }>;
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
  const q = normalizeQuery(safeDecode((await params).q));
  if (!q) return { title: 'جستجو در ایمچ' };
  const title = `${stripSearchNoise(q)} | خرید عمده و فروش عمده در ایمچ`;
  return {
    title,
    description: `خرید عمده و فروش عمده ${stripSearchNoise(q)} با بهترین قیمت از تولیدکنندگان و عرضه‌کنندگان سراسر ایران؛ مشاهده لیست قیمت روز، مقایسه آگهی‌ها و ارتباط مستقیم با تامین‌کننده در بازار عمده ایمچ.`,
    alternates: { canonical: searchPath(q) },
    openGraph: {
      title,
      description: `آگهی‌های فروش عمده با قیمت روز در ایمچ`,
      type: 'website',
    },
  };
}

export default async function SearchPage({ params }: Props) {
  const { q } = await params;
  return <SearchScreen rawQ={q} page={1} />;
}
