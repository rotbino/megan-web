import { redirect } from 'next/navigation';

/**
 * دفتر خرید من → درخواست‌های خرید دوره‌ای (خواستهٔ مالک ۸-۱۱):
 * دفتر خرید از منو حذف و به‌عنوان تب دوم «درخواست‌های خرید من» زندگی
 * می‌کند؛ این مسیر قدیمی برای لینک‌های ذخیره‌شده حفظ شده و ریدایرکت می‌شود.
 */
export default function BuyerBookRedirectPage() {
  redirect('/panel/my-requests?tab=book');
}
