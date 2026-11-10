import type { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { BuyRequestsView } from '@/components/buy-requests/buy-requests-view';
import { JsonLd } from '@/components/shared/json-ld';
import { getBuyRequestsSSR } from '@/lib/mock/api';
import { SITE_URL } from '@/lib/site';

/** ISR — صفحه عمومی سئو، هر ۶۰ ثانیه بازتولید پس‌زمینه */
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'درخواست‌های خرید عمده',
  description:
    'فهرست درخواست‌های خرید عمده ثبت‌شده خریداران در ایمچ؛ با ثبت محصول، به هزاران درخواست فعال دسترسی پیدا کنید.',
  alternates: { canonical: '/buyAd-requests' },
  openGraph: {
    title: 'درخواست‌های خرید عمده | ایمچ',
    description: 'فهرست درخواست‌های خرید عمده ثبت‌شده خریداران؛ تماس مستقیم با خریداران احرازشده.',
    type: 'website',
  },
};

export default async function BuyRequestsPage() {
  // کوئری پیش‌فرض اولیه — عین ساختار کلاینت تا queryKey یکی باشد و initialData بخورد
  const initial = await getBuyRequestsSSR({ s: '', page: 1 });

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 pt-6 lg:px-6">
          <h1 className="text-2xl font-bold">درخواست‌های خرید</h1>
        </div>
        <BuyRequestsView initialData={initial ?? undefined} />
      </main>
      <Footer />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'ایمچ', item: SITE_URL },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'درخواست‌های خرید',
              item: `${SITE_URL}/buyAd-requests`,
            },
          ],
        }}
      />
    </>
  );
}
