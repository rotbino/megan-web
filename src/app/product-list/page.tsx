import type { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ProductListing } from '@/components/products/product-listing';
import { Breadcrumb } from '@/components/shared/breadcrumb';

export const metadata: Metadata = {
  title: 'لیست محصولات و قیمت عمده محصولات',
  description:
    'مشاهده لیست کامل آگهی‌های فروش عمده در مِگان؛ فیلتر بر اساس دسته‌بندی، استان و شهر و مقایسه قیمت روز بازار.',
};

export default function ProductListPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 pt-6 lg:px-6">
          <Breadcrumb items={[{ label: 'خانه', href: '/' }, { label: 'همه محصولات' }]} />
          <h1 className="mt-3 text-2xl font-extrabold">خرید عمده محصولات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            قیمت‌ها به‌روزرسانی لحظه‌ای دارند؛ برای قیمت نهایی با فروشنده در ارتباط باشید.
          </p>
        </div>
        <ProductListing />
      </main>
      <Footer />
    </>
  );
}
