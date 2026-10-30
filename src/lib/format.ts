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
