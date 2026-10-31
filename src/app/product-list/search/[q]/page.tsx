import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ProductListing } from '@/components/products/product-listing';
import { SearchPing } from '@/components/products/search-ping';
import { JsonLd } from '@/components/shared/json-ld';
import { getProductsSSR } from '@/lib/mock/api';
import { searchPath, stripSearchNoise } from '@/lib/popular-searches';
import { normalizeQuery } from '@/lib/search-log';
import { SITE_URL } from '@/lib/site';

/**
 * صفحه جستجوی سئو-پسند — /product-list/search/{عبارت}
 *
 * هر جستجوی کاربر (هدر، فوتر، گوگل) به یک URL اختصاصی و ایندکس‌پذیر می‌رسد:
 * عنوان/توضیحات/کنونیکال اختصاصی + ItemList ساخت‌یافته + رندر سروری
 * نتایج (ISR ۵ دقیقه‌ای).
 *
 * ورودی‌های گوگل اغلب کلمات اضافه دارند («خرید سیب زمینی عمده در تهران»)؛
 * چون کلمه «عمده» در نام هیچ آگهی‌ای نیست، نتیجه خالی می‌شد. اینجا عبارت
 * با stripSearchNoise پاکسازی می‌شود و آدرس شنی با ریدایرکت ۳۰۸ دائمی به
 * آدرس یکتای همان کالا می‌رسد — کنونیکال واحد برای گوگل + نتیجه همیشه پُر:
 *   /search/خرید سیب زمینی عمده در تهران  →  /search/سیب زمینی
 */
export const revalidate = 300;

interface Props {
  params: Promise<{ q: string }>;
}

/** پارامتر مسیر ممکن است کدشده یا پیش‌تر دیکدشده برسد — هر دو پشتیبانی می‌شود */
function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const q = normalizeQuery(safeDecode((await params).q));
  if (!q) return { title: 'جستجو در ایمچ' };
  const title = `${stripSearchNoise(q)} | خرید عمده و فروش عمده در ایمچ`;
  return {
    title,
    description: `خرید عمده و فروش عمده ${stripSearchNoise(q)} با بهترین قیمت از تولیدکنندگان و عرضه‌کنندگان سراسر ایران؛ مشاهده لیست قیمت روز، مقایسه آگهی‌ها و ارتباط مستقیم با تامین‌کننده در بازار عمده ایمچ.`,
    alternates: { canonical: searchPath(q) },
    openGraph: {
      title,
      description: `آگهی‌های فروش عمده با قیمت روز در ایمچ`,
      type: 'website',
    },
  };
}

export default async function SearchPage({ params }: Props) {
  const q = normalizeQuery(safeDecode((await params).q));
  if (!q) notFound();

  // ورودی گوگل / سرچ باکس → عبارت هسته‌ای: «خرید سیب زمینی عمده در تهران»
  // می‌شود «سیب زمینی». آدرس شنی برای همیشه به آدرس یکتا (کنونیکال)
  // ریدایرکت می‌شود تا گوگل سیگنال‌ها را روی یک صفحه جمع کند.
  const clean = stripSearchNoise(q);
  if (clean && clean !== q) permanentRedirect(searchPath(clean));

  // کوئری پیش‌فرض اولیه — عین ساختار کلاینت تا queryKey یکی باشد و initialData بخورد
  const initial = await getProductsSSR({ s: clean, sort: 'related', page: 1 }, 300);

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 pt-4 lg:px-6 lg:pt-6">
          <h1 className="text-lg font-extrabold lg:text-2xl">
            {/عمده\s*$/.test(clean) ? clean : `${clean} عمده`}
          </h1>
          <p className="mt-1.5 max-w-3xl text-xs leading-6 text-muted-foreground lg:text-sm">
            خرید و فروش عمده «{clean}» مستقیم از تولیدکننده و عرضه‌کننده ایرانی در بازار عمده ایمچ؛
            قیمت‌ها را مقایسه کنید و بدون واسطه با فروشنده در تماس باشید.
          </p>
        </div>
        <ProductListing searchQuery={clean} initialData={initial ?? undefined} />
      </main>
      <Footer />
      {/* ثبت ورودی برای آمار «ورودی‌های گوگل» — بعد از هیدریشن، بی‌صدا */}
      <SearchPing q={clean} />
      {initial && initial.items.length > 0 && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `آگهی‌های فروش عمده ${clean}`,
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
