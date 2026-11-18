import type { Metadata } from 'next';
import { SellersFeed } from '@/components/sellers/sellers-feed';

/**
 * صفحهٔ «فروشندگان» خریدار (خواستهٔ مالک ۱۸-۱۱) — فید شخصی‌شدهٔ آگهی‌های
 * فروش بر اساس درخواست‌های خرید دوره‌ای و فوری کاربر؛ دادهٔ شخصی است →
 * ایندکس موتور جستجو ممنوع (عین صفحات پنل).
 */
export const metadata: Metadata = {
  title: 'فروشندگان مطابق درخواست‌های خرید شما | ایمچ',
  description:
    'تامین‌کنندگان و آگهی‌های فروش عمده مطابق با درخواست‌های خرید دوره‌ای و فوری شما — با تطابق حجم خرید، نزدیکی و تازگی.',
  robots: { index: false, follow: false },
};

export default function SellersPage() {
  return <SellersFeed />;
}
