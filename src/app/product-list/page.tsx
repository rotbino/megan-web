import type { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ProductListing } from '@/components/products/product-listing';
import { CategoryFilter } from '@/components/products/category-filter';
import { JsonLd } from '@/components/shared/json-ld';
import { getCategoryTreeSSR, getProductsSSR } from '@/lib/mock/api';
import { SITE_URL } from '@/lib/site';

// ISR (F5): صفحه بعد از اولین رندر کش می‌شود و در پس‌زمینه هر ۵ دقیقه
// بازتولید می‌شود — TTFB همیشه چند میلی‌ثانیه (به‌جای ~۶۰۰ms سردِ force-dynamic).
// useSearchParams داخل Suspense موجود است → با ISR سازگار؛ کوئری‌های فیلتر/جستجو
// مثل قبل فقط سمت کلاینت اجرا می‌شوند (SSR از اول فقط کوئری پیش‌فرض را می‌پخت).
export const revalidate = 300;

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
  // درخت دسته‌ها برای سایدبار سرور-رندر (F5) — همان کش داده‌ی layout، بدون fetch اضافه
  const tree = (await getCategoryTreeSSR(3600)) ?? [];
  const initial = await getProductsSSR({ ...INITIAL_QUERY }, 300);

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 pt-6 lg:px-6">
          <h1 className="text-2xl font-bold">خرید عمده محصولات</h1>
        </div>
        <ProductListing initialData={initial ?? undefined} sidebar={<CategoryFilter tree={tree} />} />
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
