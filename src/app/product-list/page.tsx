import type { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ProductListing } from '@/components/products/product-listing';

export const metadata: Metadata = {
  title: 'لیست محصولات و قیمت عمده محصولات',
  description:
    'مشاهده لیست کامل آگهی‌های فروش عمده در ایمچ؛ فیلتر بر اساس دسته‌بندی، استان و شهر و مقایسه قیمت روز بازار.',
  alternates: { canonical: '/product-list' },
};

export default function ProductListPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 pt-6 lg:px-6">
          <h1 className="text-2xl font-bold">خرید عمده محصولات</h1>
        </div>
        <ProductListing />
      </main>
      <Footer />
    </>
  );
}
