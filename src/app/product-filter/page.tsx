import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ProductFilterClient } from './product-filter-client';

/**
 * صفحهٔ فیلتر پیشرفتهٔ عمده — /product-filter (بازطراحی کامل ۲۸-۱۱ بر اساس
 * پروتوتایپ «تامینان» ارسالی مالک): پس از تکمیل و رضایت، جای /product-list
 * و زیرمجموعه‌هایش را می‌گیرد — تمایز اصلی ایمچ نسبت به باسکول.
 *
 *  • دیتا: کاتالوگ عمومی v2 (catalog/v2) — آگهی‌های confirmed روی درخت
 *    عمیق جدید (تا خودِ کالا) با فیلتر استان/شهر/جستجو/ویژگی‌های تخصصی
 *    هر دسته (ارث‌بری سطح‌دار)/بازهٔ قیمت/بازهٔ حجم خرید/۵ سورت + شمارش
 *    زندهٔ گزینه‌ها (فاست) از سرور؛
 *  • noindex تا وقتی سوییچ عمومی اعلام شود — محتوای تکراری با
 *    /product-list (که فعلاً روی دستهٔ پاسکال است) ایندکس نشود.
 */
export const metadata: Metadata = {
  title: 'خرید و فروش عمده | فیلتر پیشرفته بازار B2B ایمچ',
  description:
    'آگهی‌های فروش عمده با فیلتر پیشرفته — ویژگی‌های تخصصی هر کالا (نوع، درجه، عمل‌آوری، بسته‌بندی…)، بازهٔ قیمت و حجم خرید، شمارش زندهٔ هر گزینه و فیلتر استان/شهر.',
  alternates: { canonical: '/product-filter' },
  robots: { index: false, follow: false },
};

export default function ProductFilterPage() {
  return (
    <>
      {/* هدر مخصوص صفحهٔ فیلتر (خواستهٔ مالک ۲۸-۱۱ دور ۴):
          • filterSearch — سرچ‌باکس هدر همین‌جا فیلتر می‌زند (نه /product-list/search)؛
          • hideNavRow — نوار «دسته بندی | فروشنده شوید» حذف؛ جای آن را زیر-هدرِ
            چسبانِ خودِ صفحه (نوار فیلتر + فیلترهای منتخب) می‌گیرد که موقع اسکرول
            غیب نمی‌شود (دسکتاپ و موبایل). */}
      <Header filterSearch hideNavRow />
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
