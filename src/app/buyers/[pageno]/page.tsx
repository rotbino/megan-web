import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { BuyersScreen } from '@/components/buyers/buyers-screen';
import { parsePageNo, pageTitleSuffix } from '@/lib/pagination';

/**
 * صفحات ۲ به بعد خریداران عمده — /buyers/2 و… (خواستهٔ مالک ۱۴-۱۱):
 * هر پیج URL اختصاصی + کنونیکال/عنوان جدا برای ایندکس جداگانهٔ گوگل؛
 * صفحهٔ ۱ به‌صورت دائمی به آدرس تمیز پایه ریدایرکت می‌شود.
 */
export const revalidate = 60;

interface Props {
  params: Promise<{ pageno: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pageno } = await params;
  const n = parsePageNo(pageno) ?? 1;
  const title = pageTitleSuffix('خریداران عمده | ایمچ', n);
  return {
    title,
    description:
      'مرور نیازهای خرید خریداران عمده ایمچ — کالا، حداقل سفارش، دوره و موقعیت؛ فروشندگان دارنده بسته می‌توانند پیشنهاد تامین بفرستند.',
    alternates: { canonical: n > 1 ? `/buyers/${n}` : '/buyers' },
    openGraph: {
      title,
      description: 'خریداران عمده را بر اساس دسته کالا، دوره و حداقل سفارش مرور کنید و پیشنهاد تامین بفرستید.',
      type: 'website',
    },
  };
}

export default async function BuyersPagedPage({ params }: Props) {
  const { pageno } = await params;
  const n = parsePageNo(pageno);
  if (n === null) notFound();
  if (n === 1) permanentRedirect('/buyers');
  return <BuyersScreen page={n} />;
}
