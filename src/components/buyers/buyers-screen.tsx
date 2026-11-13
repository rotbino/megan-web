import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { BuyersView } from '@/components/buyers/buyers-view';
import { JsonLd } from '@/components/shared/json-ld';
import { serverPost } from '@/lib/api/client';
import { SITE_URL } from '@/lib/site';
import type { BuyerDirectoryPage } from '@/lib/types';

/**
 * اسکرین مشترک «خریداران عمده» — /buyers و /buyers/[pageno]
 * (خواستهٔ مالک ۱۴-۱۱: هر پیج URL جداگانه مثل /buyers/2 برای ایندکس
 * جداگانهٔ گوگل).
 */
export async function BuyersScreen({ page }: { page: number }) {
  // کوئری پیش‌فرض اولیه — عین ساختار کلاینت تا queryKey یکی باشد و initialData بخورد
  const initial = await serverPost<BuyerDirectoryPage>('/buyers/directory', { page, perPage: 12 }, 60).catch(
    () => undefined,
  );

  // آدرس دست‌ساز/کهنهٔ بعد از آخرین صفحه → 404
  if (page > 1 && initial && (initial.items ?? []).length === 0) notFound();

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* عنوان و تب‌های کوچک داخل BuyersView رندر می‌شوند (خواستهٔ مالک ۱-۱۱) */}
        <BuyersView
          initialData={initial}
          initialPage={page}
          page1Href="/buyers"
          pageHrefPattern="/buyers/{p}"
        />
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
