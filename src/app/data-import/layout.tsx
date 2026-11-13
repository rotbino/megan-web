import type { Metadata } from 'next';
import { DataImportShell } from '@/components/data-import/shell';

/**
 * بخش «دیتا ایمپورت» — کاملاً جدا از پنل ادمین و اپ عمومی (خواستهٔ مالک
 * ۱۳-۱۱): ایمپورتر باسکول + مدیریت کاربران ایمپورت‌شده. بعدها ایمپورترهای
 * سایت‌های دیگر هم همین‌جا اضافه می‌شوند.
 * SEO لازم ندارد — noindex مثل پنل ادمین؛ گارد نشست داخل DataImportShell.
 */
export const metadata: Metadata = {
  title: 'دیتا ایمپورت — ایمچ',
  robots: { index: false, follow: false, nocache: true },
};

export default function DataImportLayout({ children }: { children: React.ReactNode }) {
  return <DataImportShell>{children}</DataImportShell>;
}
