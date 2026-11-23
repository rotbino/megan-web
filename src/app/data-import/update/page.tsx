import type { Metadata } from 'next';
import { UpdateManager } from '@/components/data-import/update-manager';

/**
 * صفحهٔ «آپدیت» — دیتا ایمپورت (خواستهٔ مالک ۲۱-۱۱ و نوسازی ۲۲-۱۱):
 * آپدیت قیمت‌های آخرین آگهی‌های پاسکال + ثبت بی‌درنگ کاربران جدید در
 * دیتابیس («کاربران در انتظار ایمپورت» — بدون موبایل، لیست ماندگار) +
 * استخراج تک‌کاربر.
 * noindex مثل بقیهٔ صفحات دیتا ایمپورت؛ گارد نقش ارشد داخل DataImportShell.
 */
export const metadata: Metadata = {
  title: 'آپدیت قیمت‌ها — دیتا ایمپورت ایمچ',
  robots: { index: false, follow: false, nocache: true },
};

export default function DataImportUpdatePage() {
  return <UpdateManager />;
}
