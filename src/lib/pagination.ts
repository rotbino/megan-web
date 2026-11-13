/**
 * پارامتر شمارهٔ صفحه در مسیر (خواستهٔ مالک ۱۴-۱۱ — صفحه‌بندی سئو-فرندلی).
 * هر صفحهٔ لیست یک URL اختصاصی دارد: /product-list/2، /buyAd-requests/3،
 * /city/tehran/2 و… پارس سخت‌گیر: فقط عدد صحیح ≥ ۱ (و سقف ۱۰۰۰ برای
 * جلوگیری از URLهای ساختگی بی‌انتها).
 */
import { toFa } from '@/lib/format';

export function parsePageNo(raw: string | undefined): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  if (n < 1 || n > 1000) return null;
  return n;
}

/** پسوند عنوان متادیتا برای صفحات ۲ به بعد — «| صفحهٔ ۲» با رقم فارسی */
export function pageTitleSuffix(title: string, page: number): string {
  return page > 1 ? `${title} | صفحهٔ ${toFa(page)}` : title;
}
