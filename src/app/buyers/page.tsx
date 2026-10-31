import type { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { BuyersView } from '@/components/buyers/buyers-view';
import { JsonLd } from '@/components/shared/json-ld';
import { serverPost } from '@/lib/api/client';
import { SITE_URL } from '@/lib/site';
import type { BuyerDirectoryPage } from '@/lib/types';

/** ISR — صفحه عمومی سئو، هر ۶۰ ثانیه بازتولید پس‌زمینه */
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'خریداران عمده | ایمچ',
  description:
    'فهرست خریداران عمده ایمچ — بر اساس دسته کالا، استان و حجم خرید ماهانه. فروشندگان دارنده بسته می‌توانند پیشنهاد تامین بفرستند.',
  alternates: { canonical: '/buyers' },
  openGraph: {
    title: 'خریداران عمده | ایمچ',
    description: 'خریداران عمده را بر اساس دسته کالا، استان و حجم خرید پیدا کنید و پیشنهاد تامین بفرستید.',
    type: 'website',
  },
};

export default async function BuyersPage() {
  // کوئری پیش‌فرض اولیه — عین ساختار کلاینت تا queryKey یکی باشد و initialData بخورد
  const initial = await serverPost<BuyerDirectoryPage>('/buyers/directory', { page: 1, perPage: 12 }, 60).catch(
    () => undefined,
  );

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 pt-6 lg:px-6">
          <h1 className="text-2xl font-bold">خریداران</h1>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            خریداران عمده و خرد ثبت‌شده در ایمچ — بر اساس دسته کالا، استان و حجم خرید ماهانه. برای ارسال پیشنهاد
            تامین، بسته اشتراک فعال لازم است.
          </p>
        </div>
        <BuyersView initialData={initial} />
      </main>
      <Footer />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'ایمچ', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'خریداران', item: `${SITE_URL}/buyers` },
          ],
        }}
      />
    </>
  );
}
