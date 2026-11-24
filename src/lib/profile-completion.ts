/**
 * میزان تکمیل پروفایل — منطق مشترک صفحهٔ ویو و فرم ویرایش (رفع باگ دور ۱۶:
 * «هر قدر پروفایل را کامل می‌کنم باز ۴۷٪ نشان می‌دهد»).
 *  • ریشه‌های باگ: (۱) وزن بخش‌ها جمعش ۹۲ بود نه ۱۰۰ — حتی پروفایل کامل هم
 *    ۹۲٪ می‌شد؛ (۲) آستانهٔ نامرئی «درباره ≥ ۱۰۰ حرف» هیچ‌جا گفته نمی‌شد؛
 *    (۳) آواتار اصلاً سنجه نداشت. اکنون وزن‌ها دقیقاً ۱۰۰ می‌شوند و ریز
 *    بخش‌ها با راهنما نمایش داده می‌شوند تا کاربر بداند چه چیزی مانده.
 *  • احراز هویت وزن کمتری گرفت (۳۴→۱۵): سنجهٔ «تکمیل پروفایل» باید با خودِ
 *    فرم قابل رسیدن باشد؛ احراز جریان جداگانه‌ای دارد و بیرون از فرم است.
 */

export interface CompletionSection {
  label: string;
  pct: number;
  done: boolean;
  /** چرا هنوز کامل نشده — فقط برای بخش‌های ناقص نمایش داده می‌شود */
  hint?: string;
}

export interface ProfileCompletionInput {
  firstName: string;
  lastName: string;
  provinceId: number | string | null;
  cityId: number | string | null;
  address: string | null;
  /** نام شرکت — پر کردنش «اطلاعات کسب و کار» را کامل می‌کند */
  companyName: string;
  about: string | null;
  avatarUrl: string | null;
  galleryCount: number;
  certificatesCount: number;
  isVerified: boolean;
}

/** وزن‌ها جمعاً ۱۰۰ — ثابت؛ ترتیب = ترتیب نمایش ریز بخش‌ها */
export function computeProfileCompletion(f: ProfileCompletionInput): {
  pct: number;
  quality: 'عالی' | 'متوسط' | 'ضعیف';
  sections: CompletionSection[];
} {
  const aboutLen = (f.about ?? '').trim().length;
  const sections: CompletionSection[] = [
    {
      label: 'اطلاعات پایه',
      pct: 20,
      done: Boolean(f.firstName.trim() && f.lastName.trim() && f.provinceId && f.cityId),
      hint: 'نام، استان و شهر',
    },
    { label: 'تصویر پروفایل', pct: 10, done: Boolean(f.avatarUrl) },
    { label: 'آدرس', pct: 10, done: Boolean((f.address ?? '').trim()) },
    {
      label: 'اطلاعات کسب و کار',
      pct: 10,
      done: Boolean(f.companyName.trim()),
      hint: 'نام شرکت یا مجموعه',
    },
    {
      label: 'درباره کسب و کار',
      pct: 15,
      done: aboutLen >= 100,
      hint: 'حداقل ۱۰۰ حرف بنویسید',
    },
    { label: 'تصاویر مربوطه', pct: 10, done: f.galleryCount > 0, hint: 'محصولات، شرکت، کارکنان' },
    { label: 'گواهی‌ها', pct: 10, done: f.certificatesCount > 0, hint: 'ثبت شرکت، استاندارد محصول' },
    { label: 'احراز هویت', pct: 15, done: f.isVerified, hint: 'ارسال مدارک در صفحه احراز هویت' },
  ];
  const pct = Math.min(100, sections.reduce((a, s) => a + (s.done ? s.pct : 0), 0));
  const quality = pct >= 85 ? 'عالی' : pct >= 55 ? 'متوسط' : 'ضعیف';
  return { pct, quality, sections };
}
