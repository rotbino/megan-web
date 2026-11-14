/** قالب‌بندی فارسی — اعداد فارسی، قیمت، تاریخ شمسی و زمان نسبی */

const faNumber = new Intl.NumberFormat('fa-IR');

/** ۳۷۰۰۰۰۰ → «۳٫۷۰۰٫۰۰۰» */
export function toFa(n: number | string): string {
  return typeof n === 'string' ? n : faNumber.format(n);
}

/** ۳۷۰۰۰۰۰ → «۳٫۷۰۰٫۰۰۰ تومان» */
export function priceFa(toman: number | null | undefined): string {
  if (toman == null) return '—';
  return `${faNumber.format(toman)} تومان`;
}

/** موجودی‌ها به‌صورت خوانا: 1000 → «۱ تن»، 500 → «۵۰۰ کیلوگرم» */
export function stockFa(amount: number, unit = 'کیلوگرم'): string {
  if (unit === 'کیلوگرم' && amount >= 1000) {
    const tons = amount / 1000;
    const t = Number.isInteger(tons) ? tons.toString() : tons.toFixed(1);
    // اعشار فارسی + ارقام فارسی (toFa روی رشته، آن را دست‌نخورده برمی‌گرداند)
    return `${faNumber.format(Number(t)).replace('.', '٫')} تن`;
  }
  return `${toFa(amount)} ${unit}`;
}

/** تاریخ شمسی خوانا: 2026-10-21 → «۳۰ مهر ۱۴۰۵» */
export function dateFa(iso: string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(iso));
}

/**
 * تاریخ‌های بک‌اند (باسکول-قالب) «YYYY-MM-DD HH:mm:ss» در UTC هستند اما
 * نشان منطقهٔ زمانی ندارند — مرورگر آن را زمانِ محلی می‌خواند و
 * «۱ روز پیش» ساعت‌ها خطا می‌زند. این تابع Z مناسب را می‌چسباند
 * (خواسته مالک ۲-۱۱: زمان به‌روزرسانی به اندازهٔ خود قیمت مهم است).
 */
export function parseServerDate(s: string): string {
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s) ? `${s.replace(' ', 'T')}Z` : s;
}

/** «۳ روز پیش»، «۲ ساعت پیش» */
export function timeAgoFa(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return minutes < 2 ? 'لحظه‌ای پیش' : `${toFa(minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${toFa(hours)} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${toFa(days)} روز پیش`;
  return dateFa(iso);
}

export function relativeFa(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return timeAgoFa(d.toISOString());
}

/** واژه‌های فارسی ۱ تا ۱۱ — «بیش از {یک|دو|…} ماه/سال» */
const FA_COUNT_WORDS = ['یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه', 'ده', 'یازده'];

/**
 * هشدار کهنگی قیمت (خواستهٔ مالک ۱۳-۱۱): اگر بیش از یک ماه از آخرین آپدیت
 * قیمت گذشته باشد «این قیمت بیش از یک ماه است که آپدیت نشده» می‌سازد —
 * دو ماه، سه ماه … تا یازده ماه، بعد «بیش از یک سال»، «دو سال» و …
 * کمتر از یک ماه → null (هیچی). ماه = ۳۰.۴۴ روز، سال = ۳۶۵.۲۵ روز.
 */
export function stalePriceFa(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  if (days < 30.44) return null;
  if (days >= 365.25) {
    const years = Math.floor(days / 365.25);
    const word = years <= FA_COUNT_WORDS.length ? FA_COUNT_WORDS[years - 1] : toFa(years);
    return `این قیمت بیش از ${word} سال است که آپدیت نشده`;
  }
  const months = Math.min(Math.floor(days / 30.44), FA_COUNT_WORDS.length);
  return `این قیمت بیش از ${FA_COUNT_WORDS[months - 1]} ماه است که آپدیت نشده`;
}

/** تاریخ + ساعت شمسی: «۳۰ مهر ۱۴۰۵، ۱۴:۲۵» — جدول‌های آمار */
export function dateTimeFa(iso: string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** تاریخ کوتاه شمسی: 2026-10-21 → «۳۰ مهر» — برچسب‌های نمودار آمار */
export function dateShortFa(iso: string): string {
  return new Intl.DateTimeFormat('fa-IR', { month: 'long', day: 'numeric' }).format(new Date(iso));
}

/** فقط ماه شمسی: 2026-10-21 → «مهر» — سطل‌های ماهانهٔ نمودار */
export function monthFa(iso: string): string {
  return new Intl.DateTimeFormat('fa-IR', { month: 'long' }).format(new Date(iso));
}

/** ماه + سال شمسی: 2026-10-21 → «مهر ۱۴۰۵» — تولتیپ سطل‌های ماهانه */
export function monthYearFa(iso: string): string {
  return new Intl.DateTimeFormat('fa-IR', { month: 'long', year: 'numeric' }).format(new Date(iso));
}

/**
 * راهنمای تبدیل واحد کنار ورودی عدد — مثل «۱۰۰۰ کیلوگرم (≈ ۱ تن)».
 * فقط واحدهای رایج؛ بقیه واحدها راهنمایی ندارند.
 */
export function unitHintFa(amount: number, unit: string): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (unit === 'کیلوگرم' && amount >= 1000) {
    return `≈ ${toFa(Number((amount / 1000).toFixed(2)))} تن`;
  }
  if (unit === 'گرم' && amount >= 1000) {
    return `≈ ${toFa(Number((amount / 1000).toFixed(2)))} کیلوگرم`;
  }
  if (unit === 'تن' && amount >= 1) {
    return `≈ ${toFa(amount * 1000)} کیلوگرم`;
  }
  return null;
}

// ─── پاکسازی توضیحات HTML-مانند (خواستهٔ مالک ۱۴-۱۱) ─────────────────────────
// باسکول خطوط توضیح آگهی را با <hr/> جدا می‌کند. بک‌اند حالا موقع ایمپورت
// نرمال می‌کند و دیتای قدیمی backfill شده؛ این تابع تورِ ایمنیِ نمایش است —
// هر <hr>/<br>/تگ بلوکی باقیمانده را به خط نو (\n) می‌برد تا با
// whitespace-pre-line درست بیفتد و تگ خام در UI دیده نشود.

const DESC_NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  zwnj: '\u200c',
  lrm: '\u200e',
  rlm: '\u200f',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
  laquo: '«',
  raquo: '»',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  middot: '·',
  bull: '•',
};

const DESC_LINE_BREAK_TAG =
  /<(?:hr|br)\b[^>]*>|<\/?(?:p|div|li|ul|ol|h[1-6]|tr|table|blockquote)\b[^>]*>/gi;

function safeCodePoint(code: number): string {
  return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
}

/** متن سادهٔ چندخطی از توضیحات — جداکننده‌ها → \n، تگ‌ها حذف، موجودیت‌ها دیکد */
export function descToText(input: string | null | undefined): string {
  let t = String(input ?? '');
  if (!t.includes('<') && !t.includes('&')) return t.trim();
  t = t
    .replace(/\r\n?/g, '\n')
    .replace(DESC_LINE_BREAK_TAG, '\n')
    .replace(/<[^>]*>/g, '');
  t = t
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z#0-9]+);/gi, (m, name: string) => DESC_NAMED_ENTITIES[name.toLowerCase()] ?? m);
  return t
    .split('\n')
    .map((line) => line.replace(/[ \t\u00a0]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
