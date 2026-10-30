'use client';

/**
 * بج تعداد پیام‌های خوانده‌نشده — قرمز برند، روبه‌روی آیکون پیام.
 * مصرف: آیکون «پیام ها» هدر دسکتاپ + آیتم «پیام ها» فوتر موبایل.
 * عدد فارسی؛ سقف نمایش ۹۹+.
 */

import { cn } from '@/lib/utils';
import { toFa } from '@/lib/format';

export function UnreadBadge({ count, className }: { count: number; className?: string }) {
  const n = Number(count) || 0;
  if (n <= 0) return null;
  return (
    <span
      role="status"
      aria-label={`${toFa(n)} پیام خوانده‌نشده`}
      title={`${toFa(n)} پیام خوانده‌نشده`}
      className={cn(
        'pointer-events-none absolute -top-1.5 -end-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-full border-2 border-card bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground',
        className,
      )}
    >
      {n > 99 ? '۹۹+' : toFa(n)}
    </span>
  );
}
