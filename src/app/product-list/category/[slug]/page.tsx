import type { Metadata } from 'next';
import Link from 'next/link';
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

// ISR (F5): مثل لیست محصولات — کش با بازتولید پس‌زمینه ۵ دقیقه‌ای؛ TTFB داغ.
// دسته‌های ناشناخته notFound می‌شوند (404 کش می‌شود تا بازتولید بعدی).
export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

/** مسیر دسته: فقط از درخت زنده بک‌اند — بدون فالبک ماک */
async function resolveCategory(slug: string): Promise<{ tree: Category[]; path: Category[] | null }> {
  const tree = (await getCategoryTreeSSR(3600)) ?? [];
  return { tree, path: findCategoryPath(tree, slug) };
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
      page: 1,
    },
    300,
  );

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
        <div className="mx-auto max-w-7xl px-4 pt-4 lg:px-6 lg:pt-6">
          <h1 className="text-lg font-extrabold lg:text-2xl">خرید {cat.categoryName} عمده</h1>
          {/* مسیر دسته — قابل‌نمایش برای کاربر و موتور جستجو */}
          <nav aria-label="مسیر دسته‌بندی" className="mt-1.5 text-xs text-muted-foreground">
            {path.map((c, i) => (
              <span key={c.id}>
                {i > 0 && <span className="mx-1">/</span>}
                {i < path.length - 1 ? (
                  <Link href={`/product-list/category/${encodeURIComponent(c.slug)}`} className="hover:text-primary">
                    {c.categoryName}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground/80">{c.categoryName}</span>
                )}
              </span>
            ))}
          </nav>
        </div>
        <ProductListing
          categorySlug={decoded}
          categoryName={cat.categoryName}
          initialData={initial ?? undefined}
          sidebar={<CategoryFilter tree={tree} path={path} />}
        />
        {/* ثبت انتخاب دسته در فعالیت‌ها (پنل ادمین — خواسته مالک ۳۰-۱۰) */}
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
