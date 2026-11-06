/**
 * متادیتای «پیگیری‌ها» — CRM کوچک ایمچ.
 * قیف تماس عمده: در بررسی → تماس گرفتم → در مذاکره → نهایی شد / منصرف شدم.
 * برای هر دو طرف بازار: فروشنده (درخواست‌های خرید) و خریدار (آگهی‌های فروش).
 */

import type { FollowStatus, FollowTargetType } from '@/lib/types';

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

/** برچسب نوع هدف */
export const FOLLOW_TARGET_LABEL: Record<FollowTargetType, string> = {
  buy_request: 'درخواست خرید',
  product: 'آگهی فروش',
};

/** کلید یکتای هدف برای نقشه‌ی «چه چیزهایی ذخیره شده» */
export function followKey(targetType: FollowTargetType, targetId: number): string {
  return `${targetType}:${targetId}`;
}
