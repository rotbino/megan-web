/**
 * کاتالوگ محصول — ثابت‌ها و کمک‌تابع‌های مشترک (خواسته مالک ۱۰-۱۱).
 * API در lib/mock/api.ts و هوک‌ها در lib/mock/hooks.ts زندگی می‌کنند؛
 * این فایل «خالص» است تا هم سرور و هم کلاینت بدون هزینه import کنند.
 */

/** قاعدهٔ آیدی پیج — لاتین کوچک/عدد/خط تیره، ۳ تا ۳۰ نویسه، شروع با نویسه */
export const CATALOG_PAGEID_RE = /^[a-z0-9][a-z0-9-]{2,29}$/;

/** پیام خطای آیدی — یک متن برای فرم و استاب (قرینهٔ قاعدهٔ سرور) */
export const CATALOG_PAGEID_HINT = '۳ تا ۳۰ نویسه: حروف لاتین کوچک، عدد و خط تیره؛ مثال: chitoos-hamadan';

/** اعتبار آیدی پیج — trim و به‌ lowercase قبل از چک */
export function isValidPageId(v: string): boolean {
  return CATALOG_PAGEID_RE.test(v.trim().toLowerCase());
}

/** پالت رنگ برند — فلت و مینیمال؛ رنگ‌های اشباع میانه که متن سفید رویشان خواناست */
export const CATALOG_COLORS: { hex: string; name: string }[] = [
  { hex: '#0f766e', name: 'یشمی' },
  { hex: '#0891b2', name: 'فیروزه‌ای' },
  { hex: '#2563eb', name: 'آبی' },
  { hex: '#7c3aed', name: 'بنفش' },
  { hex: '#db2777', name: 'سرخابی' },
  { hex: '#dc2626', name: 'قرمز' },
  { hex: '#ea580c', name: 'نارنجی' },
  { hex: '#ca8a04', name: 'خردلی' },
  { hex: '#16a34a', name: 'سبز' },
  { hex: '#475569', name: 'ذغالی' },
];

/** رنگ پیش‌فرض کاتالوگ — اگر فروشنده انتخاب نکرد (یشمی؛ متمایز از سرمه‌ای ایمچ) */
export const CATALOG_DEFAULT_COLOR = CATALOG_COLORS[0].hex;

/** نرمال‌سازی آیدی اینستاگرام — @ و آدرس کامل و فاصله‌ها را می‌کندد */
export function normalizeInstagramId(v: string): string | null {
  const t = v.trim().replace(/^@+/, '').replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, '').replace(/\/+$/, '');
  return t || null;
}

/** نرمال‌سازی شماره واتساپ — فقط ارقام فارسی/لاتینی؛ ۰۰/۹۸+/۰۹ → قالب 09xxxxxxxxx */
export function normalizeWhatsappNumber(v: string): string | null {
  let d = v
    .replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
    .replace(/\D/g, '');
  if (d.startsWith('0098')) d = d.slice(4);
  else if (d.startsWith('98') && d.length === 12) d = d.slice(2);
  if (/^9\d{9}$/.test(d)) d = `0${d}`;
  return /^09\d{9}$/.test(d) ? d : null;
}

/** لینک گفتگو در واتساپ — wa.me قالب بین‌المللی بدون صفرِ اول می‌خواهد */
export function whatsappLink(number: string): string {
  const d = number.replace(/\D/g, '');
  return `https://wa.me/${d.startsWith('0') ? `98${d.slice(1)}` : d}`;
}

/** لینک پروفایل اینستاگرام — آیدی نرمال‌شده */
export function instagramLink(id: string): string {
  return `https://instagram.com/${encodeURIComponent(id)}`;
}

/** رنگ روشن‌شده با نسبت — برای هاله/سافتِ رنگ برند روی زمینهٔ روشن (color-mix CSS) */
export function brandSoft(color: string, pct = 10): string {
  return `color-mix(in srgb, ${color} ${pct}%, white)`;
}
