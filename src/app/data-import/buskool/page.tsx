import { ImporterView } from '@/components/importer/importer-view';

/**
 * ایمپورتر باسکول — از پنل ادمین به بخش جدای «دیتا ایمپورت» منتقل شد
 * (خواستهٔ مالک ۱۳-۱۱). گارد نقش ارشد داخل خود کامپوننت است؛ آدرس قدیمی
 * /admin/importer به این‌جا ریدایرکت می‌شود.
 */
export default function DataImportBuskoolPage() {
  return <ImporterView />;
}
