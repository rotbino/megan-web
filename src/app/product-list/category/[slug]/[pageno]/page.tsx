import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { CategoryScreen, resolveCategory } from '@/components/products/category-screen';
import { parsePageNo, pageTitleSuffix } from '@/lib/pagination';

/**
 * صفحات ۲ به بعد دستهٔ لیست محصولات — /product-list/category/[slug]/2 و…
 * (خواستهٔ مالک ۱۴-۱۱): هر پیج URL اختصاصی + کنونیکال/عنوان جدا؛
 * صفحهٔ ۱ به‌صورت دائمی به آدرس تمیز دسته ریدایرکت می‌شود.
 */
export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string; pageno: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, pageno } = await params;
  const n = parsePageNo(pageno) ?? 1;
  const { path } = await resolveCategory(decodeURIComponent(slug));
  const name = path?.at(-1)?.categoryName ?? 'دسته‌بندی';
  const title = pageTitleSuffix(`${name} - خرید و قیمت ${name} عمده | ارزان‌ترین قیمت`, n);
  return {
    title,
    description: `خرید عمده ${name} با بهترین قیمت از فروشندگان احرازشده؛ مشاهده لیست قیمت ${name} و ارتباط مستقیم با تامین‌کنندگان.`,
    alternates: { canonical: n > 1 ? `/product-list/category/${slug}/${n}` : `/product-list/category/${slug}` },
    openGraph: { title, description: `لیست قیمت و آگهی‌های فروش عمده ${name} در ایمچ`, type: 'website' },
  };
}

export default async function CategoryPagedPage({ params }: Props) {
  const { slug, pageno } = await params;
  const n = parsePageNo(pageno);
  if (n === null) notFound();
  if (n === 1) permanentRedirect(`/product-list/category/${slug}`);
  return <CategoryScreen slug={slug} page={n} />;
}
