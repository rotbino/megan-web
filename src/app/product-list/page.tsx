import type { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ProductListing } from '@/components/products/product-listing';
import { JsonLd } from '@/components/shared/json-ld';
import { getProductsSSR } from '@/lib/mock/api';
import { SITE_URL } from '@/lib/site';

// داینامیک SSR (مثل product-view): useSearchParams داخل کامپوننت کلاینت در
// پیش‌رندر استاتیک به CSR می‌افتد و کارت‌ها از HTML می‌روند؛ رندر پویا کارت‌ها
// را در HTML می‌گذارد (سئو) و کش داده ۶۰ثانیه‌ای سرعت را تامین می‌کند.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'لیست محصولات و قیمت عمده محصولات',
  description:
    'مشاهده لیست کامل آگهی‌های فروش عمده در ایمچ؛ فیلتر بر اساس دسته‌بندی، استان و شهر و مقایسه قیمت روز بازار.',
  alternates: { canonical: '/product-list' },
  openGraph: {
    title: 'لیست محصولات و قیمت عمده محصولات | ایمچ',
    description:
      'آگهی‌های فروش عمده با قیمت روز؛ فیلتر دسته‌بندی، استان و شهر.',
    type: 'website',
  },
};

/** کوئری پیش‌فرض اولیه — عین ساختار کلاینت تا queryKey یکی باشد و initialData بخورد */
const INITIAL_QUERY = {
  s: '',
  provinceId: undefined,
  cityId: undefined,
  sort: 'related',
  page: 1,
} as const;

export default async function ProductListPage() {
  const initial = await getProductsSSR({ ...INITIAL_QUERY });

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 pt-6 lg:px-6">
          <h1 className="text-2xl font-bold">خرید عمده محصولات</h1>
        </div>
        <ProductListing initialData={initial ?? undefined} />
      </main>
      <Footer />
      {initial && initial.items.length > 0 && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'آگهی‌های فروش عمده ایمچ',
            numberOfItems: initial.total,
            itemListElement: initial.items.slice(0, 20).map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `${SITE_URL}/product-view/${p.slug}/${p.categoryName}/${p.id}`,
              name: p.productName,
            })),
          }}
        />
      )}
    </>
  );
}
