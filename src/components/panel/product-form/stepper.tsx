'use client';

/**
 * استپر ثبت محصول — الگوی breadcrumb باسکول (فشرده‌شده):
 * شش مرحله با نام‌های کوتاه (خواسته مالک)؛ انجام‌شده = تیک و قابل کلیک
 * برای بازگشت، فعال = رنگ برند. موبایل: نوار افقی قابل پیمایش.
 * فونت ریزتر و فاصله کمتر — حتی در دسکتاپ اسکرول نمی‌خورد.
 */

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toFa } from '@/lib/format';

export const PRODUCT_STEPS = [
  'دسته‌بندی',
  'محصول',
  'قیمت',
  'تصویر',
  'توضیحات',
  'ویژگی‌ها',
] as const;

/** استپر — الگوی breadcrumb باسکول؛ مراحل قابل پاس از بیرون (مثل ویزارد درخواست خرید) */
export function ProductStepper({
  current,
  maxReached,
  onJump,
  steps = PRODUCT_STEPS,
  ariaLabel = 'مراحل ثبت محصول',
}: {
  current: number; // ۰ مبنا
  maxReached: number;
  onJump: (step: number) => void;
  steps?: readonly string[];
  ariaLabel?: string;
}) {
  return (
    <nav aria-label={ariaLabel}>
      <ol className="flex items-center gap-0.5 overflow-x-auto rounded-lg border bg-card p-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          const reachable = i <= maxReached;
          return (
            <li key={label} className="flex shrink-0 items-center">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onJump(i)}
                className={cn(
                  'flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-[11px] transition-colors sm:text-xs',
                  active && 'bg-primary font-bold text-primary-foreground',
                  done && 'text-[11.5px] font-bold text-primary hover:bg-primary/10',
                  !active && !done && 'text-muted-foreground',
                  !reachable && 'cursor-not-allowed opacity-60',
                )}
                aria-current={active ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'grid size-4.5 shrink-0 place-items-center rounded-full text-[9.5px] font-bold',
                    active
                      ? 'bg-primary-foreground text-primary'
                      : done
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {done ? <Check size={11} strokeWidth={3} /> : toFa(i + 1)}
                </span>
                {label}
              </button>
              {i < steps.length - 1 && (
                <span className={cn('mx-0.5 h-px w-2 shrink-0 sm:w-3.5', i < current ? 'bg-primary/60' : 'bg-border')} aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
