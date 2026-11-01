import { permanentRedirect } from 'next/navigation';

/**
 * علاقه‌مندی‌ها حذف شد (خواسته مالک ۱-۱۱ دور هفتم): ذخیره/علاقه‌مندی و نشان
 * کردن یک مفهوم‌اند — فقط «نشان شده ها» (CRM) داریم. لینک‌های قدیمی برای همیشه
 * به همان صفحه می‌روند (۳۰۸ — سیگنال‌های سئو حفظ می‌شود).
 */
export default function FavoritesRedirect() {
  permanentRedirect('/panel/saved');
}
