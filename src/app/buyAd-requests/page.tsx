import type { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { BuyRequestsView } from '@/components/buy-requests/buy-requests-view';
import { Breadcrumb } from '@/components/shared/breadcrumb';

export const metadata: Metadata = {
  title: 'درخواست‌های خرید عمده',
  description:
    'فهرست درخواست‌های خرید عمده ثبت‌شده خریداران در مِگان؛ با ثبت محصول، به هزاران درخواست فعال دسترسی پیدا کنید.',
};

export default function BuyRequestsPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 pt-6 lg:px-6">
          <Breadcrumb items={[{ label: 'خانه', href: '/' }, { label: 'درخواست‌های خرید' }]} />
          <h1 className="mt-3 text-2xl font-extrabold">درخواست‌های خرید</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            فروشنده هستید؟ محصول خود را ثبت کنید تا درخواست‌های مرتبط را ببینید و مستقیم پیشنهاد بدهید.
          </p>
        </div>
        <BuyRequestsView />
      </main>
      <Footer />
    </>
  );
}
