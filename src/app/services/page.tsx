import type { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ServicesView } from '@/components/services/services-view';

/**
 * سرویس‌های تخصصی ارزش‌افزوده (خواستهٔ مالک ۱۱-۱۲ — دور ۲):
 * فرم سرویس‌های تخصصی عمده‌فروشی برای آینده — فعلاً عنوان سرویس‌ها (ریتو و
 * همخرید) + ثبت‌نام علاقه‌مندی فروشندگان (صنف + نام کسب‌وکار).
 */
export const metadata: Metadata = {
  title: 'سرویس‌های تخصصی ارزش‌افزوده',
  description:
    'سرویس‌های تخصصی عمده‌فروشی ایمچ — ریتو: سفارش‌گیری مستقیم خرده‌فروش از تولیدکنندگان به قیمت تولید؛ همخرید: خرید گروهی از تولیدکنندگان به قیمت تولید؛ و به‌زودی فرصت‌های خرید ویژه. تولیدکنندگان می‌توانند از هم‌اکنون ثبت‌نام کنند.',
  alternates: { canonical: '/services' },
  openGraph: {
    title: 'سرویس‌های تخصصی ارزش‌افزوده | ایمچ',
    description:
      'ریتو و همخرید — اتصال مستقیم خریداران به تولیدکنندگان، به قیمت تولید. ثبت‌نام فروشندگان آغاز شده است.',
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
