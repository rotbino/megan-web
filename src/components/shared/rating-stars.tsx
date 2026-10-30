'use client';

/**
 * ستاره‌های امتیاز — دو حالت:
 *  display: نمایش امتیاز (میانگین) با ستاره‌های پر/خالی + عدد اختیاری
 *  input: انتخاب امتیاز برای فرم ثبت نظر (کلیک/کیبورد)
 */

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toFa } from '@/lib/format';

export function RatingStars({
  value,
  size = 15,
  className,
  showValue = false,
  count,
}: {
  /** ۰ تا ۵ — کسری هم قبول (نمایش پرشدگی تقریبی) */
  value: number;
  size?: number;
  className?: string;
  /** نمایش عدد میانگین کنار ستاره‌ها */
  showValue?: boolean;
  /** شمار نظرها — «N نظر» کنار ستاره‌ها */
  count?: number;
}) {
  const v = Math.max(0, Math.min(5, value));
  return (
    <span className={cn('inline-flex items-center gap-1', className)} aria-label={`امتیاز ${toFa(v)} از ۵`}>
      <span className="inline-flex gap-0.5" dir="ltr">
        {Array.from({ length: 5 }).map((_, i) => {
          // پر = i < کف مقدار؛ نیم‌ستاره با رنگ کهربایی ملایم برای کسری
          const fill = v >= i + 1 ? 'full' : v > i ? 'half' : 'empty';
          return (
            <Star
              key={i}
              size={size}
              aria-hidden
              className={cn(
                'shrink-0',
                fill === 'full' && 'fill-amber-400 text-amber-400',
                fill === 'half' && 'fill-amber-200 text-amber-400',
                fill === 'empty' && 'fill-muted text-muted-foreground/30',
              )}
            />
          );
        })}
      </span>
      {showValue && <b className="text-[12px] font-bold">{toFa(v)}</b>}
      {count !== undefined && (
        <span className="text-[11px] text-muted-foreground">
          {toFa(count)} نظر
        </span>
      )}
    </span>
  );
}

export function RatingInput({
  value,
  onChange,
  size = 26,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-1', className)} role="radiogroup" aria-label="امتیاز شما">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${toFa(n)} ستاره`}
            onClick={() => onChange(n)}
            className="transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
          >
            <Star
              size={size}
              className={cn(
                'transition-colors',
                n <= value ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/40',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
