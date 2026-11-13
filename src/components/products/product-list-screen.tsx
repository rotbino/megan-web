import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ProductListing } from '@/components/products/product-listing';
import { CategoryFilter } from '@/components/products/category-filter';
import { JsonLd } from '@/components/shared/json-ld';
import { getCategoryTreeSSR, getProductsSSR } from '@/lib/mock/api';
import { SITE_URL } from '@/lib/site';

/**
 * اسکرین مشترک «لیست محصولات» — /product-list و /product-list/[pageno]
 * (خواستهٔ مالک ۱۴-۱۱: هر پیج URL جداگانهٔ سئو-فرندلی مثل /product-list/2
 * تا گوگل تک‌تک صفحه‌ها را جدا ایندکس کند؛ صفحهٔ ۱ همان آدرس تمیز پایه است).
 */

export const PRODUCT_LIST_TITLE = 'لیست محصولات و قیمت عمده محصولات';
export const PRODUCT_LIST_DESC =
  'مشاهده لیست کامل آگهی‌های فروش عمده در ایمچ؛ فیلتر بر اساس دسته‌بندی، استان و شهر و مقایسه قیمت روز بازار.';

/** کوئری پیش‌فرض اولیه — عین ساختار کلاینت تا queryKey یکی باشد و initialData بخورد */
const INITIAL_QUERY = {
  s: '',
  provinceId: undefined,
  cityId: undefined,
  sort: 'related',
} as const;

/** آدرس‌های صفحه‌بندی — صفحهٔ ۱ تمیز، بقیه با شماره */
export const PRODUCT_LIST_PAGE1_HREF = '/product-list';
export const PRODUCT_LIST_PAGE_HREF_PATTERN = '/product-list/{p}';

export async function ProductListScreen({ page }: { page: number }) {
  // درخت دسته‌ها برای سایدبار سرور-رندر (F5) — همان کش داده‌ی layout، بدون fetch اضافه
  const tree = (await getCategoryTreeSSR(3600)) ?? [];
  const initial = await getProductsSSR({ ...INITIAL_QUERY, page }, 300);

  // آدرس دست‌ساز/کهنهٔ بعد از آخرین صفحه → 404 تا ایندکس گوگل تمیز بماند
  if (page > 1 && initial && initial.items.length === 0) notFound();

  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductListing
          initialData={initial ?? undefined}
          sidebar={<CategoryFilter tree={tree} />}
          initialPage={page}
          page1Href={PRODUCT_LIST_PAGE1_HREF}
          pageHrefPattern={PRODUCT_LIST_PAGE_HREF_PATTERN}
        />
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
