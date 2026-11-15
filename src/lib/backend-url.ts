/**
 * آدرس بک‌اند — یک منبع حقیقت برای همهٔ محیط‌ها (خواستهٔ مالک ۱۶-۱۱):
 * «فرانت روی ورسل (imach.ir) همیشه به بک‌اند ورسل وصل شود؛ روی لوکال‌هاست
 * پیش‌فرض بک‌اند لوکالِ در حال اجرای خودم باشد و بتوانم دستی عوضش کنم.»
 *
 * قواعد (به‌ترتیب):
 *  ۱. استقرار ورسل (متغیر سیستمی VERCEL + NODE_ENV=production) → همیشه و
 *     بدون استثنا بک ابری https://megan-back.vercel.app — حتی اگر فایل .env
 *     چیز دیگری بگوید (فراز از .env کامیت‌شده هم مستقل می‌شود)؛
 *  ۲. لوکال → پیش‌فرض http://127.0.0.1:4000 (همان پورت `bun run start`)؛
 *  ۳. تغییر دستی لوکال: BACKEND_URL را در .env یا .env.local ست کنید
 *     (مثلاً BACKEND_URL=https://megan-back.vercel.app برای اتصال از لوکال
 *     به دیتای ابری) — فقط همان `next dev` را ری‌استارت کنید.
 *
 * کاربران این ماژول: next.config.ts (پروکسی /api + NEXT_PUBLIC_*)،
 * src/lib/api/client.ts (SSR) و src/lib/admin/api.ts (SSR پنل ادمین).
 */

/** بک‌اند پروداکشن (ابری) — در ورسل همیشه همین */
export const PRODUCTION_BACKEND_URL = 'https://megan-back.vercel.app';

/** بک‌اند لوکال — پیش‌فرض محیط توسعهٔ خودتان */
export const LOCAL_BACKEND_URL = 'http://127.0.0.1:4000';

/** آیا همین حالا روی استقرار واقعی ورسل هستیم؟ (vercel dev شبیه‌سازی نمی‌شود) */
export function isVercelProduction(): boolean {
  return Boolean(process.env.VERCEL) && process.env.NODE_ENV === 'production';
}

/** آدرس بک‌اند فعال — بدون / انتهایی */
export function resolveBackendUrl(): string {
  const clean = (u: string) => u.replace(/\/+$/, '');
  if (isVercelProduction()) {
    // فرار اضطراری برای روز مبادا (مثلاً بک دوم): VERCEL_BACKEND_URL در
    // تنظیمات پروژهٔ ورسل — بدون آن همیشه بک اصلی
    return clean(process.env.VERCEL_BACKEND_URL ?? PRODUCTION_BACKEND_URL);
  }
  return clean(process.env.BACKEND_URL ?? process.env.BACKEND_ORIGIN ?? LOCAL_BACKEND_URL);
}
