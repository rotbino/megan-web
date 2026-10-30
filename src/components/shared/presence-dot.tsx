'use client';

/**
 * نشان آنلاین/آفلاین — نقطه سبز تپنده + برچسب؛ همه‌جا یک شکل و یک حس.
 *
 * online === undefined/null → حالت «نامشخص» (در حال گرفتن وضعیت) — نقطه خاکستری
 * کم‌رنگ بدون متن، تا لِی‌اوت نپرد.
 */

import { cn } from '@/lib/utils';
import { timeAgoFa } from '@/lib/format';

export function PresenceDot({
  online,
  lastSeenAt,
  className,
  size = 'sm',
  showLabel = true,
  offlineLabel,
}: {
  online: boolean | null | undefined;
  lastSeenAt?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  /** متن حالت آفلاین — پیش‌فرض «آخرین بازدید …» یا «آفلاین» */
  offlineLabel?: string;
}) {
  const dotSize = size === 'lg' ? 'size-3' : size === 'md' ? 'size-2.5' : 'size-2';
  const known = online === true || online === false;

  const label = !known
    ? null
    : online
      ? 'آنلاین'
      : offlineLabel ??
        (lastSeenAt ? `آخرین بازدید ${timeAgoFa(lastSeenAt)}` : 'آفلاین');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 align-middle',
        showLabel && known && 'rounded-full px-1.5 py-0.5',
        known && online && 'bg-emerald-500/10',
        known && !online && 'bg-secondary',
        className,
      )}
      title={label ?? undefined}
      aria-label={label ?? undefined}
      role={showLabel ? 'text' : 'img'}
    >
      <span className="relative inline-flex shrink-0">
        {online === true && (
          <span className={cn('absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60', dotSize)} />
        )}
        <span
          className={cn(
            'relative inline-flex rounded-full',
            dotSize,
            known
              ? online
                ? 'bg-emerald-500'
                : 'bg-muted-foreground/40'
              : 'bg-muted-foreground/25',
          )}
        />
      </span>
      {showLabel && label && (
        <span
          className={cn(
            'whitespace-nowrap text-[11px] font-medium leading-none',
            known && online ? 'text-emerald-600' : 'text-muted-foreground',
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}
