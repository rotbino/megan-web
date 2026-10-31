'use client';

/**
 * قطعات مشترک فرم‌های دفتر خرید — انتخاب دوره (پنج‌گزینه ثابت به‌ترتیب:
 * روزانه، هفتگی، ماهیانه، سالیانه، موردی) و ورودی حداقل خرید با واحد ثابت دسته
 * و راهنمای تبدیل واحد (مثل ۱۰۰۰ کیلوگرم ≈ ۱ تن).
 */

import { PERIOD_LABELS, PURCHASE_PERIODS, type PurchasePeriod } from '@/lib/types';
import { unitHintFa } from '@/lib/format';
import { cn } from '@/lib/utils';

/** انتخاب دوره خرید — سگمنتی پنج‌گزینه‌ای؛ در موبایل فشرده‌تر تا جا شود */
export function PeriodPicker({
  value,
  onChange,
  className,
}: {
  value: PurchasePeriod;
  onChange: (p: PurchasePeriod) => void;
  className?: string;
}) {
  return (
    <div
      className={cn('flex gap-0.5 rounded-md bg-secondary p-0.5', className)}
      role="radiogroup"
      aria-label="دوره خرید"
    >
      {PURCHASE_PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={value === p}
          onClick={() => onChange(p)}
          className={cn(
            'min-w-0 flex-1 rounded-[5px] px-0.5 py-1.5 text-[11px] font-bold leading-5 transition-colors sm:px-1.5 sm:text-xs',
            value === p
              ? 'bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

/** ورودی حداقل خرید — فقط عدد؛ واحد دسته ثابت و غیرقابل تغییر است */
export function AmountInput({
  value,
  onChange,
  unit,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  unit: string;
  placeholder?: string;
  id?: string;
}) {
  const hint = unitHintFa(Number(value), unit);
  return (
    <div>
      <div className="relative">
        <input
          id={id}
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
          placeholder={placeholder}
          aria-label={`حداقل خرید (${unit})`}
          className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-xs transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary pe-14"
        />
        <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs font-medium text-muted-foreground">
          {unit}
        </span>
      </div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
