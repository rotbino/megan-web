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
