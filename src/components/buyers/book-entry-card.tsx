'use client';

/**
 * کارت آیتم دفتر خرید (سمت سایت) — عین چیدمان سادهٔ کارت درخواست خرید باسکول
 * (خواستهٔ مالک ۱-۱۱ / ساده‌سازی شب دوم):
 *  • سربرگ: آواتار دایره‌ای + نام خریدار (نام اول می‌آید، بعد کالا)
 *  • جمله: «خریدار عمده ۲ تن پسته به‌صورت ماهیانه هستم»
 *  • پانویس: آیکون تقویم + آخرین فعالیت، آیکون مکان + استان/شهر
 *  • اقدام: فقط آیکون ارسال دایره‌ای در سربرگ (خواستهٔ مالک: حذف عنوان
 *    «ارسال پیشنهاد تامین» از هر کارت — آیکون به‌تنهایی گویاست و کارت خلوت
 *    می‌ماند) + چک‌باکس انتخاب برای ارسال گروهی (فقط دارندگان بسته).
 *  • نقطهٔ سبز روی آواتار = فعال در ۷ روز گذشته؛ غایبِ بیش از ۹۰ روز کم‌رنگ.
 */

import { CalendarDays, MapPin, Send } from 'lucide-react';
import { dateFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PERIOD_LABELS, type BuyerDirectoryItem } from '@/lib/types';

export function BookEntryCard({
  entry,
  selectable,
  selected,
  onToggle,
  onOffer,
}: {
  entry: BuyerDirectoryItem;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  onOffer: () => void;
}) {
  const location = [entry.province, entry.city].filter(Boolean).join(' - ');
  const initial = entry.buyerName.trim().charAt(0) || 'خ';

  return (
    <li
      className={cn(
        'rounded-md border bg-card p-4 transition-shadow hover:shadow-md sm:p-5',
        entry.stale && 'opacity-60 hover:opacity-100',
      )}
    >
      {/* سربرگ — آواتار + نام خریدار + اقدام‌ها (عین باسکول + آیکون ارسال) */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
            {initial}
            {entry.activeRecently && (
              <span
                className="absolute -bottom-0.5 -end-0.5 size-3 rounded-full border-2 border-card bg-emerald-500"
                title="فعال در ۷ روز گذشته"
                aria-label="فعال در ۷ روز گذشته"
              />
            )}
          </span>
          <h3 className="truncate text-sm font-extrabold sm:text-[15px]">{entry.buyerName}</h3>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* آیکون ارسال پیشنهاد تامین — بدون عنوان (خواستهٔ مالک: ضدشلوغی) */}
          <button
            type="button"
            onClick={onOffer}
            title="ارسال پیشنهاد تامین"
            aria-label={`ارسال پیشنهاد تامین به ${entry.buyerName}`}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-input bg-card text-foreground/70 transition-colors hover:border-foreground/30 hover:bg-secondary hover:text-foreground sm:size-9"
          >
            <Send size={15} />
          </button>

          {selectable && (
            <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggle?.()}
                className="size-4 accent-primary"
                aria-label="انتخاب برای ارسال گروهی"
              />
              <span className="hidden sm:inline">انتخاب</span>
            </label>
          )}
        </div>
      </div>

      {/* جمله — عین باسکول: خریدار … هستم */}
      <p className="mt-3 text-[13px] leading-7 text-muted-foreground sm:text-sm">
        {entry.role === 'عمده‌خریدار' ? 'خریدار عمده ' : 'خریدار '}
        <b className="text-foreground">{toFa(entry.minAmount)} {entry.unit}</b>{' '}
        <b className="text-foreground">{entry.categoryName}</b>{' '}
        به‌صورت {PERIOD_LABELS[entry.period] ?? 'ماهیانه'} هستم
      </p>

      {/* زمان و مکان — عین باسکول */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1" title="آخرین فعالیت">
          <CalendarDays size={14} className="text-foreground/45" />
          {dateFa(entry.lastActiveAt)}
        </span>
        {location && (
          <span className="flex items-center gap-1">
            <MapPin size={14} className="text-foreground/45" />
            {location}
          </span>
        )}
      </div>
    </li>
  );
}
