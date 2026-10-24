import { BadgeCheck, Crown, AlertTriangle, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** نشان «فروشنده ویژه» — طلایی متمایز از برند تیل */
export function SpecialSellerBadge({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md bg-gold-soft px-2 py-0.5 text-[11px] font-bold text-gold-foreground ring-1 ring-gold/30',
        className,
      )}
    >
      <Crown size={12} strokeWidth={2.4} />
      {!compact && 'فروشنده ویژه'}
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
        'inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200',
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
  if (m < 60) return 'لحظه‌ای پیش';
  const h = Math.floor(m / 60);
  if (h < 24) return `${fa(h)} ساعت پیش`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${fa(d)} روز پیش`;
  return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' }).format(new Date(iso));
}

const fa = (n: number) => new Intl.NumberFormat('fa-IR').format(n);
