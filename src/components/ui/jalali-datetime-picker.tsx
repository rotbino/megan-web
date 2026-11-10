'use client';

/**
 * انتخابگر تاریخ/ساعت شمسی — پوشش ایمچ روی react-multi-date-picker
 * (خواسته مالک ۹-۱۱: هر جا تاریخ لازم شد به‌جای اینپوت‌های میلادی از همین
 * استفاده شود؛ تقویم شمسی + اعداد فارسی + انتخاب ساعت).
 *
 * مقدار ورودی/خروجی ISO میلادی است (همان قرارداد بک‌اند)؛ نمایش شمسی است.
 * خالی کردن مقدار (دکمه ×) → onChange(null) — مثلاً «پایان بی‌پایان».
 */

import DatePicker, { DateObject } from 'react-multi-date-picker';
import TimePicker from 'react-multi-date-picker/plugins/time_picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** فرمت ثابت انتخابگر — تاریخ شمسی + ساعت:دقیقه */
const FORMAT = 'YYYY/MM/DD HH:mm';

export function JalaliDateTimePicker({
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: {
  /** ISO میلادی — null/undefined = خالی */
  value: string | null | undefined;
  onChange: (iso: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const dateObj =
    value != null && !Number.isNaN(new Date(value).getTime())
      ? new DateObject({
          date: new Date(value),
          calendar: persian,
          locale: persian_fa,
          format: FORMAT,
        })
      : null;

  return (
    <div className={cn('relative flex items-center', className)}>
      <DatePicker
        calendar={persian}
        locale={persian_fa}
        format={FORMAT}
        value={dateObj}
        disabled={disabled}
        onChange={(d) => {
          // حالت تکی: DateObject | null (آرایه فقط در multiple/range است)
          const obj = Array.isArray(d) ? d[0] : d;
          const jsDate = obj instanceof DateObject ? obj.toDate() : null;
          onChange(jsDate && !Number.isNaN(jsDate.getTime()) ? jsDate.toISOString() : null);
        }}
        plugins={[<TimePicker key="time" position="bottom" hideSeconds />]}
        calendarPosition="bottom-right"
        editable
        placeholder={placeholder}
        containerClassName="w-full"
        inputClass={cn(
          'rmdp-input-imch h-9 w-full rounded-md border border-input bg-card px-3 text-[13px] text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      />
      {value && !disabled && (
        <button
          type="button"
          aria-label="پاک کردن تاریخ"
          onClick={() => onChange(null)}
          className="absolute end-2 grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground/70 transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

export default JalaliDateTimePicker;
