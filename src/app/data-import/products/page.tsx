import { ListingsManager } from '@/components/data-import/listings-manager';

/**
 * مدیریت آگهی‌ها — «دیتا ایمپورت → آگهی‌ها» (خواستهٔ مالک ۱۳-۱۱):
 * کدام آگهی از باسکول آمده، کدام طبیعی ثبت شده، کدام فروشنده‌اش لاگین کرده
 * و کدام توسط خود کاربرش ویرایش شده — با فیلترهای مدیریتی.
 * گارد نقش ارشد داخل DataImportShell (layout) است.
 */
export default function DataImportProductsPage() {
  return <ListingsManager />;
}
