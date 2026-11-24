import type { Metadata } from 'next';
import { CategoryScreen, resolveCategory } from '@/components/products/category-screen';

// ISR (F5): مثل لیست محصولات — کش با بازتولید پس‌زمینه ۵ دقیقه‌ای؛ TTFB داغ.
// دسته‌های ناشناخته notFound می‌شوند (404 کش می‌شود تا بازتولید بعدی).
export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { path } = await resolveCategory(decodeURIComponent(slug));
  const name = path?.at(-1)?.categoryName ?? 'دسته‌بندی';
  const title = `${name} - خرید و قیمت ${name} عمده | ارزان‌ترین قیمت`;
  return {
    title,
    description: `خرید عمده ${name} با بهترین قیمت از فروشندگان احرازشده؛ مشاهده لیست قیمت ${name} و ارتباط مستقیم با تامین‌کنندگان.`,
    alternates: { canonical: `/product-list/category/${slug}` },
    openGraph: { title, description: `لیست قیمت و آگهی‌های فروش عمده ${name} در ایمچ`, type: 'website' },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  // صفحهٔ ۱ — آدرس تمیز پایه؛ صفحه‌های بعدی از [pageno]
  return <CategoryScreen slug={slug} page={1} />;
}
