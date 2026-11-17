import type { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ServicesView } from '@/components/services/services-view';

/**
 * سرویس‌های تخصصی ایمچ برای فروش عمده (بازطراحی ۱۷-۱۱):
 * معرفی ۴ طرح آینده — میدان‌یار، خرید از کارخانه، پخشیار و همخرید.
 * همهٔ سرویس‌ها فعلاً در مرحلهٔ ثبت‌نام و نیازسنجی هستند؛ خریداران و
 * فروشندگان علاقه‌مندی خود را با دو دکمهٔ هر طرح اعلام می‌کنند و
 * نتیجه در پنل ادمین (service-signups) دیده می‌شود.
 */
export const metadata: Metadata = {
  title: 'سرویس‌های تخصصی ایمچ برای فروش عمده',
  description:
    'طرح‌های آیندهٔ ایمچ برای فروش عمده — میدان‌یار: تأمین بار میدان‌های تره‌بار و خریداران بزرگ محصولات کشاورزی؛ خرید از کارخانه: خرید تکی به قیمت تولید؛ پخشیار: اتصال خرده‌فروشان به تولیدکننده و واردکننده؛ همخرید: خرید گروهی با مناقصهٔ تأمین‌کنندگان. همهٔ طرح‌ها فعلاً در مرحلهٔ ثبت‌نام و نیازسنجی هستند — علاقه‌مندی خود را همین حالا اعلام کنید.',
  alternates: { canonical: '/services' },
  openGraph: {
    title: 'سرویس‌های تخصصی ایمچ برای فروش عمده',
    description:
      'میدان‌یار، خرید از کارخانه، پخشیار و همخرید — چهار طرح آیندهٔ ایمچ، فعلاً در مرحلهٔ ثبت‌نام و نیازسنجی. اگر علاقه‌مند هستید، نقش خود را اعلام کنید.',
    type: 'website',
  },
};

export default function ServicesPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <ServicesView />
      </main>
      <Footer />
    </>
  );
}
