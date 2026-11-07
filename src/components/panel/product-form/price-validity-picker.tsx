'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { toFa } from '@/lib/format';

/**
 * انتخاب «اعتبار قیمت» (خواسته مالک ۷-۱۱ دور هفدهم) — چیپ‌های ۱ تا ۵ روز +
 * گزینهٔ «سایر» با اینپوت عددی آزاد برای بیش از ۵ روز؛ پیش‌فرض ۳ روز.
 * مشترک: فرم ویرایش آگهی و مدال سریع آپدیت قیمت.
 * معنا: بعد از این پنجره، اگر قیمت تازه نشود آگهی بج «قیمت منقضی شده» می‌گیرد.
 */
export function PriceValidityPicker({
  value,
  onChange,
  ariaLabel = 'اعتبار قیمت',
}: {
  value: number;
  onChange: (days: number) => void;
  ariaLabel?: string;
}) {
  // حالت «سایر» — با کلیک روی چیپ سایر یا مقدار اولیهٔ بزرگ‌تر از ۵ روشن می‌شود
  const [customMode, setCustomMode] = useState(value > 5);
  const [customDraft, setCustomDraft] = useState(value > 5 ? String(value) : '');

  const pickPreset = (d: number) => {
    setCustomMode(false);
    setCustomDraft('');
    onChange(d);
  };

  const pickOther = () => {
    setCustomMode(true);
    // مقدار اولیهٔ معقول برای شروع تایپ؛ کاربر بلافاصله می‌تواند عوضش کند
    const d = Math.max(1, Number(customDraft.replace(/\D/g, '')) || 6);
    if (!customDraft) setCustomDraft(String(d));
    onChange(d);
  };

  const onCustomType = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 3);
    setCustomDraft(digits);
    const d = Number(digits);
    if (d >= 1) onChange(Math.min(d, 365));
  };

  return (
    <div role="radiogroup" aria-label={ariaLabel} className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((d) => {
          const active = !customMode && value === d;
          return (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pickPreset(d)}
              className={cn(
                'font-num rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              {toFa(d)} روز
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={customMode}
          onClick={pickOther}
          className={cn(
            'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
            customMode
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
          )}
        >
          سایر
        </button>
      </div>
      {customMode && (
        <div className="flex items-center gap-2">
          <input
            value={customDraft}
            onChange={(e) => onCustomType(e.target.value)}
            onBlur={() => {
              // خالی/نامعتبر هنگام خروج → برگشت به پیش‌فرض گزینهٔ سایر
              const d = Number(customDraft.replace(/\D/g, ''));
              if (!customDraft || d < 1) {
                setCustomDraft('6');
                onChange(6);
              } else if (d > 365) {
                setCustomDraft('365');
                onChange(365);
              }
            }}
            inputMode="numeric"
            aria-label="اعتبار قیمت به روز (سایر)"
            placeholder="مثلاً ۷"
            className="font-num h-10 w-24 rounded-md border border-input bg-card px-3 text-center text-sm font-bold outline-none transition-colors focus-visible:border-primary"
          />
          <span className="text-xs text-muted-foreground">روز</span>
          <span className="text-[11px] leading-5 text-muted-foreground">
            اعتبار دلخواه شما — بیشتر از ۵ روز
          </span>
        </div>
      )}
    </div>
  );
}
