'use client';

/**
 * فیلتر بازهٔ زمانی مشترک صفحات «دیتا ایمپورت» (خواستهٔ مالک ۱۵-۱۱).
 *
 *   • دو انتخابگر تاریخ شمسی (JalaliDateTimePicker) برای «از» و «تا» — مقدار
 *     ISO میلادی، همان قرارداد بک‌اند؛ خالی = آن طرف بازه باز است.
 *   • دکمه‌های سریع: امروز، دیروز، این هفته (۷ روز)، هفتهٔ پیش، این ماه (۳۰ روز).
 *   • چیپ ماه‌های شمسی اخیر با نام فارسی (۶ ماه برای کاربران/تصاویر، ۱۲ ماه
 *     برای آگهی‌ها) — هر چیپ همان ماه شمسی را کامل می‌گیرد؛ ترتیب قدیم→جدید.
 *   • فیلد هدف بازه (تاریخ ثبت / تاریخ آپدیت) با پراپ fields — اگر بیش از یک
 *     گزینه باشد Select نشان می‌دهد، وگرنه برچسب ثابت.
 */

import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { CalendarRange, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { JalaliDateTimePicker } from '@/components/ui/jalali-datetime-picker';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: string | null;
  to: string | null;
}

/** گزینهٔ فیلد هدف بازه — مثل { value: 'created', label: 'تاریخ ثبت' } */
export interface DateRangeField {
  value: string;
  label: string;
}

// ─── پریست‌های سریع ─────────────────────────────────────────────────────────

function dayStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayEnd(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export type RangePreset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth';

export const RANGE_PRESETS: { key: RangePreset; label: string; range: () => DateRange }[] = [
  {
    key: 'today',
    label: 'امروز',
    range: () => ({ from: dayStart(new Date()).toISOString(), to: dayEnd(new Date()).toISOString() }),
  },
  {
    key: 'yesterday',
    label: 'دیروز',
    range: () => {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return { from: dayStart(y).toISOString(), to: dayEnd(y).toISOString() };
    },
  },
  {
    key: 'thisWeek',
    label: 'این هفته (۷ روز)',
    range: () => {
      const s = new Date();
      s.setDate(s.getDate() - 6);
      return { from: dayStart(s).toISOString(), to: dayEnd(new Date()).toISOString() };
    },
  },
  {
    key: 'lastWeek',
    label: 'هفتهٔ پیش',
    range: () => {
      const s = new Date();
      s.setDate(s.getDate() - 13);
      const e = new Date();
      e.setDate(e.getDate() - 7);
      return { from: dayStart(s).toISOString(), to: dayEnd(e).toISOString() };
    },
  },
  {
    key: 'thisMonth',
    label: 'این ماه (۳۰ روز)',
    range: () => {
      const s = new Date();
      s.setDate(s.getDate() - 29);
      return { from: dayStart(s).toISOString(), to: dayEnd(new Date()).toISOString() };
    },
  },
];

// ─── ماه‌های شمسی اخیر ──────────────────────────────────────────────────────

export interface JalaliMonth {
  /** نام ماه — «آبان»؛ اگر سالِ غیر از سال جاری بود، با سال: «آبان ۱۴۰۴» */
  label: string;
  range: DateRange;
}

/**
 * N ماه شمسی اخیر (شامل ماه جاری) — قدیم→جدید.
 * مثال در آبان ۱۴۰۵ با count=6: خرداد، تیر، مرداد، شهریور، مهر، آبان.
 * بازهٔ هر ماه = اول همان ماه شمسی ۰۰:۰۰ تا آخرین لحظهٔ آن.
 */
export function jalaliRecentMonths(count: number): JalaliMonth[] {
  const now = new DateObject({ calendar: persian, locale: persian_fa });
  const out: JalaliMonth[] = [];
  for (let ago = count - 1; ago >= 0; ago--) {
    let y = now.year;
    let m = now.month.number - ago;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    const start = new DateObject({ calendar: persian, locale: persian_fa, year: y, month: m, day: 1 });
    // آخرین لحظهٔ ماه = یک میلی‌ثانیه قبل از اول ماه بعد
    const end = new DateObject({ calendar: persian, locale: persian_fa, year: y, month: m, day: 1 }).add(
      1,
      'months',
    );
    const label = `${start.format('MMMM')}${y !== now.year ? ` ${start.format('YYYY')}` : ''}`;
    out.push({
      label,
      range: {
        from: start.toDate().toISOString(),
        to: new Date(end.toDate().getTime() - 1).toISOString(),
      },
    });
  }
  return out;
}

// ─── کامپوننت ───────────────────────────────────────────────────────────────

const chip =
  'inline-flex h-7 items-center rounded-full border bg-card px-2.5 text-[11px] font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground';

export function DateRangeFilter({
  label = 'بازهٔ زمانی',
  fields,
  field,
  onFieldChange,
  from,
  to,
  onChange,
  months = 0,
}: {
  /** برچسب وقتی فیلد هدف تک‌گزینه‌ای است */
  label?: string;
  /** فیلدهای هدف بازه (ثبت/آپدیت) — undefined یا تک‌عضو = بدون Select */
  fields?: DateRangeField[];
  field?: string;
  onFieldChange?: (v: string) => void;
  from: string | null;
  to: string | null;
  onChange: (range: DateRange) => void;
  /** تعداد چیپ ماه شمسی — 0 = بدون چیپ ماه */
  months?: number;
}) {
  const hasFieldSelect = fields != null && fields.length > 1 && onFieldChange != null && field != null;
  const active = from != null || to != null;

  return (
    <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
      {/* خط ۱: فیلد هدف + دو انتخابگر تاریخ */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex h-8 shrink-0 items-center gap-1.5 text-[11.5px] font-extrabold text-primary">
          <CalendarRange size={14} className="shrink-0" />
          {hasFieldSelect ? (
            <Select value={field} onValueChange={onFieldChange}>
              <SelectTrigger className="h-8 w-[135px] rounded-[10px] text-[11.5px] font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fields.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            label
          )}
        </span>

        <span className="text-[11px] text-muted-foreground">از</span>
        <div className="w-[185px]">
          <JalaliDateTimePicker
            value={from}
            onChange={(v) => onChange({ from: v, to })}
            placeholder="ابتدای بازه"
          />
        </div>
        <span className="text-[11px] text-muted-foreground">تا</span>
        <div className="w-[185px]">
          <JalaliDateTimePicker
            value={to}
            onChange={(v) => onChange({ from, to: v })}
            placeholder="انتهای بازه"
          />
        </div>

        {active ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1 rounded-[10px] px-2.5 text-[11px] text-muted-foreground"
            onClick={() => onChange({ from: null, to: null })}
          >
            <X size={12} /> حذف بازه
          </Button>
        ) : null}
      </div>

      {/* خط ۲: دکمه‌های سریع + ماه‌های شمسی */}
      <div className="flex flex-wrap items-center gap-1.5">
        {RANGE_PRESETS.map((p) => (
          <button key={p.key} type="button" className={chip} onClick={() => onChange(p.range())}>
            {p.label}
          </button>
        ))}
        {months > 0
          ? jalaliRecentMonths(months).map((m) => (
              <button
                key={m.label}
                type="button"
                className={cn(chip, 'border-primary/25 bg-primary/10 text-primary hover:text-primary')}
                title={`${m.label} شمسی — کامل همان ماه`}
                onClick={() => onChange(m.range)}
              >
                {m.label}
              </button>
            ))
          : null}
      </div>
    </div>
  );
}
