import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ProductListing } from '@/components/products/product-listing';
import { CategoryFilter } from '@/components/products/category-filter';
import { JsonLd } from '@/components/shared/json-ld';
import { CategoryViewPing } from '@/components/shared/category-view-ping';
import { getCategoryTreeSSR, getProductsSSR } from '@/lib/mock/api';
import { findCategoryPath } from '@/lib/categories';
import { SITE_URL } from '@/lib/site';
import type { Category } from '@/lib/types';

/**
 * اسکرین مشترک «دستهٔ لیست محصولات» — /product-list/category/[slug] و
 * /product-list/category/[slug]/[pageno] (خواستهٔ مالک ۱۴-۱۱: هر پیج URL
 * جداگانه مثل /product-list/category/میوه/2 برای ایندکس جداگانهٔ گوگل).
 */

/** مسیر دسته: فقط از درخت زنده بک‌اند — بدون فالبک ماک */
export async function resolveCategory(slug: string): Promise<{ tree: Category[]; path: Category[] | null }> {
  const tree = (await getCategoryTreeSSR(3600)) ?? [];
  return { tree, path: findCategoryPath(tree, slug) };
}

export async function CategoryScreen({ slug, page }: { slug: string; page: number }) {
  const decoded = decodeURIComponent(slug);
  const { tree, path } = await resolveCategory(decoded);
  if (!path) notFound();

  const cat = path.at(-1)!;

  // کوئری پیش‌فرض اولیه — عین ساختار کلاینت تا queryKey یکی باشد و initialData بخورد
  const initial = await getProductsSSR(
    {
      categorySlug: decoded,
      s: '',
      provinceId: undefined,
      cityId: undefined,
      sort: 'related',
      page,
    },
    300,
  );

  // آدرس دست‌ساز/کهنهٔ بعد از آخرین صفحه → 404
  if (page > 1 && initial && initial.items.length === 0) notFound();

  const base = `/product-list/category/${encodeURIComponent(decoded)}`;

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ایمچ', item: SITE_URL },
      ...path.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 2,
        name: c.categoryName,
        item: `${SITE_URL}/product-list/category/${encodeURIComponent(c.slug)}`,
      })),
    ],
  };

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* عنوان و مسیر بالای محتوا حذف شد (خواسته مالک ۴-۱۱) — تکراری و زشت؛
            مسیر دسته برای موتور جستجو در JsonLd BreadcrumbList همان‌جا هست */}
        <ProductListing
          categorySlug={decoded}
          categoryName={cat.categoryName}
          initialData={initial ?? undefined}
          sidebar={<CategoryFilter tree={tree} path={path} />}
          initialPage={page}
          page1Href={base}
          pageHrefPattern={`${base}/{p}`}
        />
        {/* ثبت انتخاب دسته در فعالیت‌ها (پنل ادمین — خواستهٔ مالک ۳۰-۱۰) */}
        <CategoryViewPing categoryName={cat.categoryName} />
      </main>
      <Footer />
      <JsonLd data={breadcrumbLd} />
      {initial && initial.items.length > 0 && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `آگهی‌های فروش عمده ${cat.categoryName}`,
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
