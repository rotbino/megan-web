import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { BuyRequestsView } from '@/components/buy-requests/buy-requests-view';
import { JsonLd } from '@/components/shared/json-ld';
import { getBuyRequestsSSR } from '@/lib/mock/api';
import { SITE_URL } from '@/lib/site';

/**
 * اسکرین مشترک «درخواست‌های خرید» — /buyAd-requests و /buyAd-requests/[pageno]
 * (خواستهٔ مالک ۱۴-۱۱: هر پیج URL جداگانه مثل /buyAd-requests/2 برای ایندکس
 * جداگانهٔ گوگل).
 */
export async function BuyRequestsScreen({ page }: { page: number }) {
  // کوئری پیش‌فرض اولیه — عین ساختار کلاینت تا queryKey یکی باشد و initialData بخورد
  const initial = await getBuyRequestsSSR({ s: '', page });

  // آدرس دست‌ساز/کهنهٔ بعد از آخرین صفحه → 404
  if (page > 1 && initial && initial.items.length === 0) notFound();

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 pt-6 lg:px-6">
          <h1 className="text-2xl font-bold">درخواست‌های خرید</h1>
        </div>
        <BuyRequestsView
          initialData={initial ?? undefined}
          initialPage={page}
          page1Href="/buyAd-requests"
          pageHrefPattern="/buyAd-requests/{p}"
        />
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
