import { BadgeCheck, Crown, TrendingUp, AlertTriangle, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * نشان‌های آگهی — نردبان و ویژه از ۳۱-۱۰ قرمز پررنگ شدند (خواسته مالک:
 * «با رنگ قرمز بهتره باشه که مشخص تره») و روی تصویر کارت می‌نشینند (batch).
 */

/** نشان «نردبان» — قرمز توپر؛ روی تصویر کارت و جزئیات آگهی */
export function LadderBadge({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white shadow-sm ring-1 ring-red-700/30',
        className,
      )}
    >
      <TrendingUp size={12} strokeWidth={2.6} />
      {!compact && 'نردبان'}
    </span>
  );
}

/** نشان «فروشنده ویژه» — قرمز توپر (خواسته مالک ۳۱-۱۰: مشخص‌تر روی لیست آگهی‌ها) */
export function PremiumSellerBadge({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white shadow-sm ring-1 ring-red-700/30',
        className,
      )}
    >
      <Crown size={12} strokeWidth={2.6} />
      {!compact && 'ویژه'}
    </span>
  );
}

/** نشان احراز هویت */
export function VerifiedBadge({ className, label = 'احراز هویت شده' }: { className?: string; label?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium text-primary', className)}>
      <BadgeCheck size={14} strokeWidth={2.2} />
      {label}
    </span>
  );
}

/** نشان آگهی کهنه (isOld باسکول — نیاز به به‌روزرسانی قیمت) */
export function OldAdBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200',
        className,
      )}
    >
      <AlertTriangle size={12} />
      نیازمند به‌روزرسانی قیمت
    </span>
  );
}

/** زمان نسبی + آیکون */
export function TimeAgo({ iso, className }: { iso: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)}>
      <Clock3 size={12} />
      <time dateTime={iso}>{timeAgo(iso)}</time>
    </span>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return 'امروز';
  const h = Math.floor(m / 60);
  if (h < 24) return 'امروز';
  const d = Math.floor(h / 24);
  if (d < 7) return `${fa(d)} روز پیش`;
  return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' }).format(new Date(iso));
}

const fa = (n: number) => new Intl.NumberFormat('fa-IR').format(n);
