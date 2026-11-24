import {
  Apple,
  Beef,
  Cake,
  Carrot,
  Coffee,
  Cookie,
  Factory,
  Fish,
  Flower2,
  Grape,
  Leaf,
  Milk,
  Nut,
  Package,
  ShoppingBasket,
  ShoppingCart,
  Sprout,
  Store,
  Tractor,
  Truck,
  Warehouse,
  Wheat,
  type LucideIcon,
} from 'lucide-react';

/**
 * برند کاتالوگ (خواستهٔ مالک ۱۰-۱۱ دور ۳) — فهرست رسمی آیکون‌ها و رنگ‌های
 * پیشنهادی برای شخصی‌سازی کاتالوگ. کلیدها همان چیزی است که در بک‌اند
 * (catalog/updateSettings → brandIcon) ذخیره می‌شود؛ اضافه‌کردن آیکون جدید
 * = یک خط در CATALOG_ICONS (بک‌اند فقط الگوی کلید را ولیدیت می‌کند).
 */

export interface CatalogIconDef {
  key: string;
  label: string;
  Icon: LucideIcon;
}

/** آیکون‌های مجاز برند — متمرکز بر کسب‌وکارهای غذایی/کشاورزی/عمده‌فروشی */
export const CATALOG_ICONS: CatalogIconDef[] = [
  { key: 'store', label: 'فروشگاه', Icon: Store },
  { key: 'shopping-basket', label: 'سبد خرید', Icon: ShoppingBasket },
  { key: 'shopping-cart', label: 'چرخ خرید', Icon: ShoppingCart },
  { key: 'package', label: 'بسته‌بندی', Icon: Package },
  { key: 'truck', label: 'حمل و نقل', Icon: Truck },
  { key: 'warehouse', label: 'انبار', Icon: Warehouse },
  { key: 'factory', label: 'کارخانه', Icon: Factory },
  { key: 'tractor', label: 'کشاورزی', Icon: Tractor },
  { key: 'wheat', label: 'غلات', Icon: Wheat },
  { key: 'apple', label: 'میوه', Icon: Apple },
  { key: 'grape', label: 'انگور', Icon: Grape },
  { key: 'carrot', label: 'سبزیجات', Icon: Carrot },
  { key: 'leaf', label: 'سبزینه', Icon: Leaf },
  { key: 'sprout', label: 'نهال', Icon: Sprout },
  { key: 'flower-2', label: 'گل', Icon: Flower2 },
  { key: 'fish', label: 'آبزیان', Icon: Fish },
  { key: 'beef', label: 'گوشت', Icon: Beef },
  { key: 'milk', label: 'لبنیات', Icon: Milk },
  { key: 'coffee', label: 'کافه', Icon: Coffee },
  { key: 'cake', label: 'قنادی', Icon: Cake },
  { key: 'cookie', label: 'تنقلات', Icon: Cookie },
  { key: 'nut', label: 'خشکبار', Icon: Nut },
];

/** آیکون برند با کلید — کلید ناشناخته = آیکون پیش‌فرض فروشگاه */
export function catalogIcon(key: string | null | undefined): CatalogIconDef {
  return CATALOG_ICONS.find((i) => i.key === key) ?? CATALOG_ICONS[0];
}

/** رنگ‌های پیشنهادی برند — پالت سنجیده: خنثی ایمچ + مکمل‌های شناخته‌شده */
export const CATALOG_COLORS: { hex: string; label: string }[] = [
  { hex: '', label: 'پیش‌فرض ایمچ' },
  { hex: '#0e9f6e', label: 'سبز' },
  { hex: '#0284c7', label: 'آبی' },
  { hex: '#7c3aed', label: 'بنفش' },
  { hex: '#db2777', label: 'صورتی' },
  { hex: '#ea580c', label: 'نارنجی' },
  { hex: '#b45309', label: 'قهوه‌ای' },
  { hex: '#334155', label: 'زغالی' },
];

/** رنگ برند معتبر؟ — hex ۶ رقمی یا رشتهٔ خالی (پیش‌فرض) */
export function isValidBrandColor(hex: string): boolean {
  return hex === '' || /^#[0-9a-fA-F]{6}$/.test(hex);
}

/** آیدی کاتالوگ معتبر؟ — حروف کوچک لاتین/رقم/خط تیره، ۳ تا ۳۰ نویسه */
export const CATALOG_ID_RE = /^[a-z0-9-]{3,30}$/;

/** فرمت نمایشی آیدی هنگام تایپ — به‌همراه پیام خطای فارسی */
export function catalogIdError(id: string): string | null {
  if (!id) return 'آیدی کاتالوگ را وارد کنید.';
  if (!CATALOG_ID_RE.test(id)) {
    return 'فقط حروف کوچک لاتین، رقم و خط تیره (-)؛ بین ۳ تا ۳۰ نویسه.';
  }
  if (/^-|-$/.test(id)) return 'آیدی نباید با خط تیره شروع یا تمام شود.';
  return null;
}

/** سبک درون‌خطیِ لهجهٔ رنگ برند — روی عنصرِ ریشهٔ صفحه (CSS var).
 *  رنگ خالی = هیچ (تم پیش‌فرض ایمچ برقرار می‌ماند). */
export function brandAccentStyle(brandColor: string | null | undefined): React.CSSProperties {
  return brandColor ? ({ ['--catalog-accent' as string]: brandColor } as React.CSSProperties) : {};
}
