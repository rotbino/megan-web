import { redirect } from 'next/navigation';

/**
 * ایمپورتر باسکول به بخش جدای «دیتا ایمپورت» منتقل شد (خواستهٔ مالک ۱۳-۱۱) —
 * آدرس قدیمی برای لینک‌های ذخیره‌شده به آن‌جا ریدایرکت می‌شود.
 */
export default function AdminImporterRedirect() {
  redirect('/data-import/buskool');
}
