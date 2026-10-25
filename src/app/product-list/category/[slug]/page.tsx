import type { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ProductListing } from '@/components/products/product-listing';
import { findCategoryBySlug } from '@/lib/mock/data';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = findCategoryBySlug(decodeURIComponent(slug));
  const name = cat?.categoryName ?? 'دسته‌بندی';
  return {
    title: `${name} - خرید و قیمت ${name} عمده | ارزان‌ترین قیمت`,
    description: `خرید عمده ${name} با بهترین قیمت از فروشندگان احرازشده؛ مشاهده لیست قیمت ${name} و ارتباط مستقیم با تامین‌کنندگان.`,
    alternates: { canonical: `/product-list/category/${slug}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const cat = findCategoryBySlug(decodeURIComponent(slug));
  const name = cat?.categoryName ?? 'دسته‌بندی';

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 pt-4 lg:px-6 lg:pt-6">
          <h1 className="text-lg font-extrabold lg:text-2xl">خرید {name} عمده</h1>
        </div>
        <ProductListing categorySlug={decodeURIComponent(slug)} />
      </main>
      <Footer />
    </>
  );
}
