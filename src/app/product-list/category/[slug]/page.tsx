import type { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ProductListing } from '@/components/products/product-listing';
import { Breadcrumb } from '@/components/shared/breadcrumb';
import { JsonLd } from '@/components/shared/json-ld';
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
          <Breadcrumb
            items={[
              { label: 'خانه', href: '/' },
              { label: 'همه محصولات', href: '/product-list' },
              { label: name },
            ]}
          />
          <h1 className="mt-2 text-lg font-extrabold lg:mt-3 lg:text-2xl">خرید {name} عمده</h1>
        </div>
        <ProductListing categorySlug={decodeURIComponent(slug)} />
      </main>
      <Footer />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'خانه', item: '/' },
            { '@type': 'ListItem', position: 2, name: 'همه محصولات', item: '/product-list' },
            { '@type': 'ListItem', position: 3, name },
          ],
        }}
      />
    </>
  );
}
