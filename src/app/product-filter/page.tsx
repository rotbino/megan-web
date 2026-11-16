import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ProductFilterClient } from './product-filter-client';

/**
 * صفحهٔ فیلتر محصولات عمده — /product-filter (خواستهٔ مالک ۱۶-۱۱ شب):
 * صفحهٔ «گزارش آگهی‌ها» از پنل ادمین بیرون آمد تا به‌صورت واقعی و با شکل
 * و شمایل نهایی (الگوی پروتوتایپ تامینان + بازطراحی برای بازار عمده)
 * ساخته شود؛ پس از تکمیل جای /product-list و زیرمجموعه‌هایش را می‌گیرد.
 *
 *  • دیتا: کاتالوگ عمومی v2 (catalog/v2) — آگهی‌های confirmed روی درخت
 *    عمیق جدید (تا خودِ کالا)، فیلتر شهر/استان/جستجو/ویژگی‌ها/سورت؛
 *  • noindex تا وقتی سوییچ عمومی اعلام شود — محتوای تکراری با
 *    /product-list (که فعلاً روی دستهٔ باسکول است) ایندکس نشود.
 */
export const metadata: Metadata = {
  title: 'خرید و فروش عمده | دسته‌بندی جدید ایمچ',
  description:
    'فهرست آگهی‌های فروش عمده با دسته‌بندی جدید ایمچ — درخت عمیق تا خودِ کالا، فیلتر شهر و ویژگی‌های کالا (نوع، عمل‌آوری، بسته‌بندی…).',
  alternates: { canonical: '/product-filter' },
  robots: { index: false, follow: false },
};

export default function ProductFilterPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* useSearchParams زیر Suspense — رندر سرور پایدار می‌ماند */}
        <Suspense
          fallback={
            <div className="mx-auto w-full max-w-[1240px] px-4 py-8">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            </div>
          }
        >
          <ProductFilterClient />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
