import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { BuyRequestsScreen } from '@/components/buy-requests/buy-requests-screen';
import { parsePageNo, pageTitleSuffix } from '@/lib/pagination';

/**
 * صفحات ۲ به بعد درخواست‌های خرید — /buyAd-requests/2 و… (خواستهٔ مالک ۱۴-۱۱):
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
  const title = pageTitleSuffix('درخواست‌های خرید عمده', n);
  return {
    title,
    description:
      'فهرست درخواست‌های خرید عمده ثبت‌شده خریداران در ایمچ؛ با ثبت محصول، به هزاران درخواست فعال دسترسی پیدا کنید.',
    alternates: { canonical: n > 1 ? `/buyAd-requests/${n}` : '/buyAd-requests' },
    openGraph: {
      title: `${title} | ایمچ`,
      description: 'فهرست درخواست‌های خرید عمده ثبت‌شده خریداران؛ تماس مستقیم با خریداران احرازشده.',
      type: 'website',
    },
  };
}

export default async function BuyRequestsPagedPage({ params }: Props) {
  const { pageno } = await params;
  const n = parsePageNo(pageno);
  if (n === null) notFound();
  if (n === 1) permanentRedirect('/buyAd-requests');
  return <BuyRequestsScreen page={n} />;
}
