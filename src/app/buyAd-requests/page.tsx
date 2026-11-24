import type { Metadata } from 'next';
import { BuyRequestsScreen } from '@/components/buy-requests/buy-requests-screen';

/** ISR — صفحه عمومی سئو، هر ۶۰ ثانیه بازتولید پس‌زمینه؛ صفحه‌های ۲ به بعد از [pageno] */
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'درخواست‌های خرید عمده',
  description:
    'فهرست درخواست‌های خرید عمده ثبت‌شده خریداران در ایمچ؛ با ثبت محصول، به هزاران درخواست فعال دسترسی پیدا کنید.',
  alternates: { canonical: '/buyAd-requests' },
  openGraph: {
    title: 'درخواست‌های خرید عمده | ایمچ',
    description: 'فهرست درخواست‌های خرید عمده ثبت‌شده خریداران؛ تماس مستقیم با خریداران احرازشده.',
    type: 'website',
  },
};

export default function BuyRequestsPage() {
  return <BuyRequestsScreen page={1} />;
}
