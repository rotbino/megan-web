'use client';

/**
 * استپر ثبت محصول — الگوی breadcrumb باسکول:
 * شش مرحله؛ انجام‌شده = تیک و قابل کلیک برای بازگشت، فعال = رنگ برند.
 * موبایل: نوار افقی قابل پیمایش.
 */

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toFa } from '@/lib/format';

export const PRODUCT_STEPS = [
  'انتخاب دسته بندی',
  'اطلاعات محصول',
  'موجودی و قیمت',
  'بارگذاری تصویر',
  'توضیحات محصول',
  'جزئیات نهایی',
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
      <ol className="flex items-center gap-1 overflow-x-auto rounded-lg border bg-card p-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
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
                  'flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-2 text-xs transition-colors sm:text-[13px]',
                  active && 'bg-primary font-bold text-primary-foreground',
                  done && 'font-bold text-primary hover:bg-primary/10',
                  !active && !done && 'text-muted-foreground',
                  !reachable && 'cursor-not-allowed opacity-60',
                )}
                aria-current={active ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold',
                    active
                      ? 'bg-primary-foreground text-primary'
                      : done
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {done ? <Check size={12} strokeWidth={3} /> : toFa(i + 1)}
                </span>
                {label}
              </button>
              {i < steps.length - 1 && (
                <span className={cn('mx-1 h-px w-3 shrink-0 sm:w-5', i < current ? 'bg-primary/60' : 'bg-border')} aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
