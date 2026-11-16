/**
 * ناوبری داخل خانوادهٔ /product-list با حفظ فیلترهای فعال (خواستهٔ مالک ۱۷-۱۱):
 * فیلترها (استان/شهر/مرتب‌سازی/جستجو/زمینهٔ نیاز) در URL زندگی می‌کنند
 * (?province= &city= &sort=newest &s= &type=&amount=&unit=&provinceId=&cityId=).
 * هر ناوبری بین صفحه‌های این خانواده — تعویض دسته از سایدبار/مگامنو/شیت
 * موبایل، «همه دسته‌ها»، لینک بازار نوار پایین — آن‌ها را به مقصد می‌بَرد؛
 * خارج از /product-list لینک تمیز برمی‌گردد (فیلتر لیست برای صفحهٔ دیگر
 * بی‌معنی است).
 */
export function productListHref(path: string): string {
  if (typeof window === 'undefined') return path;
  if (!window.location.pathname.startsWith('/product-list')) return path;
  const qs = window.location.search.replace(/^\?/, '');
  if (!qs) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${qs}`;
}

/** پارامتر عددی مثبت URL (شناسه استان/شهر) */
const numParam = (raw: string | null): number | undefined => {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

/** فیلترهای مکان/مرتب‌سازی از URL — فقط هنگام mount خوانده می‌شود */
export function readUrlFilters(): { provinceId?: number; cityId?: number; sort?: 'newest' } {
  if (typeof window === 'undefined') return {};
  const sp = new URLSearchParams(window.location.search);
  const hasNeed = ['type', 'amount', 'unit', 'provinceId', 'cityId'].some((k) => !!sp.get(k));
  return {
    provinceId: numParam(sp.get('province')),
    cityId: numParam(sp.get('city')),
    // سورت «مطابق نیاز من» از پارامترهای نیاز مشتق می‌شود — seed مستقیم ندارد
    ...(sp.get('sort') === 'newest' && !hasNeed ? { sort: 'newest' as const } : {}),
  };
}

/**
 * به‌روزرسانی فیلترها در URL بدون ناوبری — history.replaceState بومی که
 * Next 16 آن را پچ کرده است: مقدار جدید به useSearchParams می‌رسد، هیچ
 * درخواست سروری/اسکلتنی در کار نیست و هدر و فیلتر بار سر جایشان می‌مانند؛
 * فقط کوئری لیست (React Query) با مقادیر تازه دوباره اجرا می‌شود.
 */
export function writeUrlFilters(updates: Record<string, string | null>): void {
  if (typeof window === 'undefined') return;
  const next = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(updates)) {
    if (v == null || v === '') next.delete(k);
    else next.set(k, v);
  }
  const qs = next.toString();
  window.history.replaceState(null, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
}
