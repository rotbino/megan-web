import type { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { BuyRequestsView } from '@/components/buy-requests/buy-requests-view';
import { Breadcrumb } from '@/components/shared/breadcrumb';

export const metadata: Metadata = {
  title: 'درخواست‌های خرید عمده',
  description:
    'فهرست درخواست‌های خرید عمده ثبت‌شده خریداران در ایمچ؛ با ثبت محصول، به هزاران درخواست فعال دسترسی پیدا کنید.',
  alternates: { canonical: '/buyAd-requests' },
};

export default function BuyRequestsPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 pt-6 lg:px-6">
          <Breadcrumb items={[{ label: 'خانه', href: '/' }, { label: 'درخواست‌های خرید' }]} />
          <h1 className="mt-3 text-2xl font-bold">درخواست‌های خرید</h1>
        </div>
        <BuyRequestsView />
      </main>
      <Footer />
    </>
  );
}
