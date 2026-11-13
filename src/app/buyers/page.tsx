import type { Metadata } from 'next';
import { BuyersScreen } from '@/components/buyers/buyers-screen';

/** ISR — صفحه عمومی سئو، هر ۶۰ ثانیه بازتولید پس‌زمینه؛ صفحه‌های ۲ به بعد از [pageno] */
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'خریداران عمده | ایمچ',
  description:
    'مرور نیازهای خرید خریداران عمده ایمچ — کالا، حداقل سفارش، دوره و موقعیت؛ فروشندگان دارنده بسته می‌توانند پیشنهاد تامین بفرستند.',
  alternates: { canonical: '/buyers' },
  openGraph: {
    title: 'خریداران عمده | ایمچ',
    description: 'خریداران عمده را بر اساس دسته کالا، دوره و حداقل سفارش مرور کنید و پیشنهاد تامین بفرستید.',
    type: 'website',
  },
};

export default function BuyersPage() {
  return <BuyersScreen page={1} />;
}
