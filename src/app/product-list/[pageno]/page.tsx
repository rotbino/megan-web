import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import {
  ProductListScreen,
  PRODUCT_LIST_TITLE,
  PRODUCT_LIST_DESC,
  PRODUCT_LIST_PAGE1_HREF,
} from '@/components/products/product-list-screen';
import { parsePageNo, pageTitleSuffix } from '@/lib/pagination';

/**
 * صفحات ۲ به بعد لیست محصولات — /product-list/2، /product-list/3 و…
 * (خواستهٔ مالک ۱۴-۱۱): هر پیج URL اختصاصی + کنونیکال و عنوان جدا تا
 * گوگل تک‌تک صفحه‌ها را جداگانه ایندکس کند. رندر سروری همان اسکرین مشترک؛
 * صفحهٔ ۱ (/product-list/1) به‌صورت دائمی به آدرس تمیز پایه ریدایرکت می‌شود
 * تا کنونیکال تکراری نداشته باشیم.
 */
export const revalidate = 300;

interface Props {
  params: Promise<{ pageno: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pageno } = await params;
  const n = parsePageNo(pageno) ?? 1;
  const title = pageTitleSuffix(PRODUCT_LIST_TITLE, n);
  return {
    title,
    description: PRODUCT_LIST_DESC,
    alternates: { canonical: n > 1 ? `/product-list/${n}` : PRODUCT_LIST_PAGE1_HREF },
    openGraph: {
      title: `${title} | ایمچ`,
      description: 'آگهی‌های فروش عمده با قیمت روز؛ فیلتر دسته‌بندی، استان و شهر.',
      type: 'website',
    },
  };
}

export default async function ProductListPagedPage({ params }: Props) {
  const { pageno } = await params;
  const n = parsePageNo(pageno);
  if (n === null) notFound(); // مسیر غیرعددی/صفر — 404
  if (n === 1) permanentRedirect(PRODUCT_LIST_PAGE1_HREF); // کنونیکال واحد
  return <ProductListScreen page={n} />;
}
