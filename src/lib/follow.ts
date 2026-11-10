/**
 * متادیتای «پیگیری‌ها» — CRM کوچک ایمچ.
 * قیف تماس عمده: در بررسی → تماس گرفتم → در مذاکره → نهایی شد / منصرف شدم.
 * برای هر دو طرف بازار: فروشنده (درخواست‌های خرید) و خریدار (آگهی‌های فروش).
 */

import type { FollowFolderKind, FollowPriority, FollowStatus, FollowTargetType } from '@/lib/types';

export interface FollowStatusMeta {
  key: FollowStatus;
  label: string;
  /** توضیح کوتاه برای راهنمای داخل دیالوگ */
  hint: string;
  /** کلاس چیپ روشن (رنگ ملایم) */
  tone: string;
  /** کلاس نقطه رنگی */
  dot: string;
  /** ترتیب قیف */
  order: number;
}

export const FOLLOW_STATUSES: readonly FollowStatusMeta[] = [
  {
    key: 'reviewing',
    label: 'در بررسی',
    hint: 'ذخیره کردم، هنوز تماس نگرفته‌ام',
    tone: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
    order: 1,
  },
  {
    key: 'contacted',
    label: 'تماس گرفتم',
    hint: 'اولین تماس انجام شد',
    tone: 'bg-sky-50 text-sky-600 border-sky-200',
    dot: 'bg-sky-500',
    order: 2,
  },
  {
    key: 'negotiating',
    label: 'در مذاکره',
    hint: 'در حال قیمت و شرایط',
    tone: 'bg-amber-50 text-amber-600 border-amber-200',
    dot: 'bg-amber-500',
    order: 3,
  },
  {
    key: 'closed',
    label: 'نهایی شد',
    hint: 'معامله انجام شد',
    tone: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    dot: 'bg-emerald-500',
    order: 4,
  },
  {
    key: 'dropped',
    label: 'منصرف شدم',
    hint: 'منتفی یا بی‌جواب',
    tone: 'bg-red-50 text-red-600 border-red-200',
    dot: 'bg-red-500',
    order: 5,
  },
] as const;

export const FOLLOW_STATUS_MAP: Record<FollowStatus, FollowStatusMeta> = Object.fromEntries(
  FOLLOW_STATUSES.map((s) => [s.key, s]),
) as Record<FollowStatus, FollowStatusMeta>;

export const FOLLOW_STATUS_KEYS = FOLLOW_STATUSES.map((s) => s.key);

/** ─── اولویت (خواسته مالک ۷-۱۱) ───────────────────────────────
 *  «تغییر اولویت» زیر سه‌نقطه و در مودال ذخیره/جزئیات؛ فیلتر اولویت در
 *  نوار فیلتر؛ اولویت‌های بالا در لیست بالاتر (مرتب‌سازی پیش‌فرض). */
export interface FollowPriorityMeta {
  key: FollowPriority;
  label: string;
  /** کلاس چیپ روشن */
  tone: string;
  /** کلاس آیکون فلش */
  icon: string;
  /** توضیح کوتاه */
  hint: string;
}

export const FOLLOW_PRIORITIES: readonly FollowPriorityMeta[] = [
  {
    key: 1,
    label: 'بالا',
    tone: 'bg-rose-50 text-rose-600 border-rose-200',
    icon: 'text-rose-500',
    hint: 'مشتری داغ — همین امروز پیگیری کن',
  },
  {
    key: 2,
    label: 'متوسط',
    tone: 'bg-amber-50 text-amber-600 border-amber-200',
    icon: 'text-amber-500',
    hint: 'عادی — سر فرصت تماس بگیر',
  },
  {
    key: 3,
    label: 'کم',
    tone: 'bg-slate-100 text-slate-500 border-slate-200',
    icon: 'text-slate-400',
    hint: 'اولویت پایین — اگر فرصت شد',
  },
] as const;

export const FOLLOW_PRIORITY_MAP: Record<FollowPriority, FollowPriorityMeta> = Object.fromEntries(
  FOLLOW_PRIORITIES.map((p) => [p.key, p]),
) as Record<FollowPriority, FollowPriorityMeta>;

/** نرمال‌سازی اولویت — رکوردهای قدیمی بدون priority → متوسط */
export function followPriorityOf(item: { priority?: number | null }): FollowPriority {
  return item.priority === 1 || item.priority === 3 ? item.priority : 2;
}

/** ─── «پیگیری بعدی N روز دیگر» + فیلتر «پیگیری‌های امروز» ──────
 *  تاریخ بک‌اند «YYYY-MM-DD HH:mm:ss» (UTC-مانند) با parseServerDate نرمال می‌شود. */

/** سررسیده است؟ — یادآور ثبت‌شده و امروز یا گذشته (پایان امروز سقف است) */
export function isFollowDueToday(nextFollowAt: string | null | undefined): boolean {
  if (!nextFollowAt) return false;
  const due = new Date(nextFollowAt.replace(' ', 'T'));
  if (Number.isNaN(due.getTime())) return false;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return due.getTime() <= endOfToday.getTime();
}

/** برچسب کوتاه یادآور — «امروز» / «فردا» / «N روز دیگر» / تاریخ */
export function followDueLabel(nextFollowAt: string | null | undefined): string | null {
  if (!nextFollowAt) return null;
  const due = new Date(nextFollowAt.replace(' ', 'T'));
  if (Number.isNaN(due.getTime())) return null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - startOfToday.getTime()) / 86_400_000);
  if (days <= 0) return 'پیگیری امروز';
  if (days === 1) return 'پیگیری فردا';
  if (days <= 30) return `پیگیری ${days} روز دیگر`;
  return `پیگیری ${due.toLocaleDateString('fa-IR')}`;
}

/** برچسب نوع هدف */
export const FOLLOW_TARGET_LABEL: Record<FollowTargetType, string> = {
  buy_request: 'درخواست خرید',
  product: 'آگهی فروش',
};

/** ─── مستقل‌سازی سرنخ خرید/فروش (خواستهٔ مالک ۸-۱۱ دور ۲۸) ─────
 *  دو نوع سرنخ کاملاً جدا از هم زندگی می‌کنند — صفحات، پرونده‌ها و همه‌چیز.
 *  مثلاً کارخانه‌ای رب می‌فروشد (سرنخ فروش از درخواست‌های خرید) و گوجه
 *  می‌خرد (سرنخ خرید از آگهی‌های فروش). نوع (FollowFolderKind) در types است. */

/** نوع سرنخ متناظر هر نوع هدف — آگهی (product) → خرید، درخواست خرید → فروش */
export function followKindOfTarget(targetType: FollowTargetType): FollowFolderKind {
  return targetType === 'buy_request' ? 'sell' : 'buy';
}

/** نوع هدف متناظر هر نوع سرنخ — برعکسِ بالا */
export function followTargetOfKind(kind: FollowFolderKind): FollowTargetType {
  return kind === 'sell' ? 'buy_request' : 'product';
}

/** برچسب فارسی نوع سرنخ */
export const FOLLOW_KIND_LABEL: Record<FollowFolderKind, string> = {
  buy: 'خرید',
  sell: 'فروش',
};

/** کلید یکتای هدف برای نقشه‌ی «چه چیزهایی ذخیره شده» */
export function followKey(targetType: FollowTargetType, targetId: number): string {
  return `${targetType}:${targetId}`;
}
