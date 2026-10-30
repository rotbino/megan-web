/**
 * ثابت‌های UI ایمچ — برچسب‌ها، پکیج‌ها و شماره کارت.
 *
 * ⚠️ دیتای ماک حذف شده است: محصولات، کاربران، دسته‌ها، استان‌ها/شهرها،
 * درخواست‌های خرید، پروفایل پنل، نشان‌شده‌ها و کیف پول همگی از
 * دیتابیس واقعی (بک‌اند مگان) می‌آیند — مسیرشان src/lib/mock/api.ts است.
 */

import type { ChargePackage, MembershipPlan, SavedUserStatusKey } from '@/lib/types';

// ─── آگهی‌ها ─────────────────────────────────────────────────────────────────

/** ظرفیت بسته رایگان — قبلاً ۵؛ حالا ۱۰ (خواسته مالک). بسته فعال = نامحدود (-۱ از بک‌اند). */
export const PRODUCT_CAPACITY = 10;

// ─── بسته‌های اشتراک (عضویت ویژه) ──────────────────────────────────────────

/** پلن‌های اشتراک — فقط fallback وقتی سرور خاموش است؛ منبع حقیقت جدول Plan
 *  بک‌اند است (ادمین تعریف/ویرایش می‌کند — خواسته مالک ۳۱-۱۰).
 *  قیمت پایه دوبرابر + کمپین ۵۰٪ = قیمت قبلی (خواسته مالک). */
export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  { key: 'p2m', months: 2, amount: 398_000, title: 'دو ماهه', pakageType: 1, discountPercent: 0, finalAmount: 398_000 },
  { key: 'p6m', months: 6, amount: 998_000, title: 'شش ماهه', pakageType: 2, bestSeller: true, discountPercent: 0, finalAmount: 998_000 },
  { key: 'p12m', months: 12, amount: 1_598_000, title: 'یک‌ساله', pakageType: 3, discountPercent: 0, finalAmount: 1_598_000 },
];

/** امکانات بسته رایگانِ همیشگی — قابل مقایسه با بسته‌های پولی (خواسته مالک) */
export const FREE_PACKAGE = {
  title: 'رایگان (همیشگی)',
  price: 0,
  features: {
    productCapacity: PRODUCT_CAPACITY, // ثبت تا ۱۰ محصول
    canSeeBuyers: false, // خریداران دیده نمی‌شود
    unlimitedBuyRequests: true, // ثبت درخواست خرید نامحدود
  },
} as const;

/** قابلیت‌های مشترک همه بسته‌های پولی — ردیف‌های کارت قیمت */
export const PAID_PLAN_FEATURES = [
  'ثبت تعداد نامحدود محصول',
  'دسترسی نامحدود به همه خریداران',
  'ثبت درخواست خرید نامحدود',
  'درج نشان فروشنده ویژه روی محصولات و پروفایل',
  'نمایش محصولات بالاتر از رقبا',
  'اولویت بررسی و پشتیبانی ویژه',
] as const;

/** دلایل رد شدن آگهی — عین جعبه باسکول */
export const REJECTION_REASONS = [
  'تصاویر بی کیفیت و نامناسب (تصاویری نامرتبط با محصول، تصاویر شخصی و ...)',
  'درج شماره تماس یا لوگوی برند روی تصاویر محصول',
  'وارد کردن میزان موجودی نامناسب محصول (مقیاس های خرده فروشی قابل قبول نیستند.)',
];

/** گزینه‌های «جزئیات نهایی» — عین باسکول */
export const PRODUCT_FEATURE_KEYS = [
  'بسته بندی',
  'کیفیت',
  'رنگ',
  'اندازه یا ابعاد',
  'گواهی کیفی، سلامت',
  'تازگی',
  'نوع فروش',
  'روش نگهداری یا ماندگاری',
  'مزایا نسبت به محصولات مشابه',
];

// ─── CRM نشان‌شده‌ها ─────────────────────────────────────────────────────────

/** برچسب وضعیت‌های CRM — عین چیپ‌های باسکول */
export const SAVED_USER_STATUS_LABELS: Record<SavedUserStatusKey, string> = {
  following: 'در حال پیگیری',
  not_needed: 'فعلا نیاز نداشت',
  unresponsive: 'پاسخگو نبود',
  out_of_stock: 'موجودی نداشت',
  priority_high: 'اولویت زیاد',
  priority_medium: 'اولویت متوسط',
  priority_low: 'اولویت کم',
};

// ─── درخواست‌های خرید ────────────────────────────────────────────────────────

/** دلایل رد شدن درخواست های خرید — عین جعبه باسکول */
export const BUY_REQUEST_REJECTION_REASONS = [
  'ثبت درخواست خرید تکراری پشت سرهم',
  'وارد کردن میزان نامناسب مقدار مورد نیاز محصول (مقیاس های خرده قابل قبول نیستند.)',
];

// ─── کیف پول — کارت به کارت (بدون درگاه؛ فیش → تایید ادمین) ─────────────────

/** پکیج‌های شارژ: ۱۰۰ هزار / ۲۰۰ هزار (+۱۰٪) / ۴۰۰ هزار (+۲۰٪) + «سایر» */
export const CHARGE_PACKAGES: ChargePackage[] = [
  { key: 'p100', amount: 100_000, bonusPercent: 0, charge: 100_000 },
  { key: 'p200', amount: 200_000, bonusPercent: 10, charge: 220_000 },
  { key: 'p400', amount: 400_000, bonusPercent: 20, charge: 480_000 },
];

/** شارژ دلخواه (دکمه «سایر» — خواسته مالک ۳۱-۱۰):
 *  حداقل ۴۰۰ هزار؛ ۳۰٪ شارژ اضافه تا ۱ میلیون و ۵۰٪ بالاتر. */
export const CUSTOM_CHARGE_MIN = 400_000;
export const CUSTOM_CHARGE_MAX = 100_000_000;
export const CUSTOM_CHARGE_TIER2_AT = 1_000_000;
export const CUSTOM_CHARGE_TIER1_PERCENT = 30;
export const CUSTOM_CHARGE_TIER2_PERCENT = 50;

/** درصد شارژ اضافه مبلغ دلخواه — ۳۰٪ تا ۱ میلیون، ۵۰٪ بالاتر */
export function customBonusPercent(amount: number): number {
  return amount > CUSTOM_CHARGE_TIER2_AT ? CUSTOM_CHARGE_TIER2_PERCENT : CUSTOM_CHARGE_TIER1_PERCENT;
}

/** حداقل شارژ پکیجی — برابر هزینه نردبان یک‌ماهه (۵۰ هزار) */
export const MIN_CHARGE = 50_000;

/** نردبان هر آگهی برای یک ماه — ۵۰ هزار تومان، از کیف پول کسر می‌شود.
 *  حداکثر ۴ ماه (خواسته مالک ۳۱-۱۰). */
export const LADDER_MONTHLY_PRICE = 50_000;
export const LADDER_MAX_MONTHS = 4;

/** برچسب فارسی تعداد ماه نردبان */
export function ladderMonthsLabel(months: number): string {
  const n = Math.min(12, Math.max(1, Math.round(months)));
  return n === 1 ? 'یک‌ماهه' : n === 2 ? 'دو ماهه' : n === 3 ? 'سه ماهه' : 'چهار ماهه';
}

/** شماره کارت برای واریز کارت به کارت — به نام مالک سایت (سعید یوسفی) */
export const AIMCH_CARD_NUMBER = '6037-9975-1234-5678';
export const AIMCH_CARD_OWNER = 'سعید یوسفی';
