import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * پاک‌سازی ورودی برند (خواسته مالک ۳-۱۱) — کاربر گاهی به‌جای نام برند،
 * واژهٔ «برند» را هم تایپ می‌کند («برند چیتوز»)؛ این واژه و جداکننده‌هایش
 * حذف می‌شود تا عنوان آگهی تمیز بماند: «برند چیتوز» → «چیتوز».
 * موقع blur فیلد و موقع ثبت نهایی هر دو اجرا می‌شود.
 */
export function stripBrandWord(v: string): string {
  return v
    .replace(/برند[\s\u200c:،.\-–_]*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * اسکرول به بالای صفحهٔ پنل (خواسته مالک ۸-۱۱) — پوستهٔ پنل از lg به بعد
 * اپ‌طور است: <main> خودش ظرف اسکرول است و body اسکرول نمی‌خورد؛ در موبایل
 * همچنان body اسکرول می‌شود. هر دو را می‌پوشانیم تا ویزاردها (مرحلهٔ بعد/قبلی)
 * در همهٔ حالت‌ها به بالا برگردند.
 */
export function scrollPanelTop(behavior: ScrollBehavior = 'smooth'): void {
  if (typeof window === 'undefined') return;
  window.scrollTo({ top: 0, behavior });
  document.querySelector('main')?.scrollTo({ top: 0, behavior });
}
