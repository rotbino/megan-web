'use client';

/**
 * کارت آیتم دفتر خرید (سمت سایت) — عین چیدمان سادهٔ کارت درخواست خرید باسکول:
 *  • سربرگ: آواتار دایره‌ای + نام خریدار (نام اول می‌آید) + چک‌باکس انتخاب گروهی
 *  • جمله: «خریدار عمده ۲ تن پسته به‌صورت ماهیانه هستم»
 *  • پانویس: آیکون تقویم + آخرین فعالیت، آیکون مکان + استان/شهر
 *  • اقدام: دکمهٔ «ارسال پیشنهاد تامین» با عنوان (بازگشت خواستهٔ مالک — آیکونِ
 *    تنها به‌اندازهٔ کافی گویا نبود) — دکمه و چک‌باکس فقط با انتخاب «دستهٔ آخر»
 *    کالا فعال‌اند (خواستهٔ مالک): دستهٔ کالا تا حد زیادی مشخص می‌شود و پیشنهاد
 *    برای خریدار فیلترپذیر است؛ غیر از آن حالت دکمه کم‌رنگ و کلیکش راهنمای
 *    «دستهٔ آخر را انتخاب کنید» می‌دهد.
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
  offerReady = true,
}: {
  entry: BuyerDirectoryItem;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  onOffer: () => void;
  /** فقط با دستهٔ آخرِ انتخاب‌شده فعال است — وگرنه دکمه/چک‌باکس قفل و راهنما (خواستهٔ مالک) */
  offerReady?: boolean;
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
      {/* سربرگ — آواتار + نام خریدار + چک‌باکس انتخاب گروهی */}
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

        {selectable && (
          <label
            className={cn(
              'flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground',
              !offerReady && 'pointer-events-none opacity-40',
            )}
            title={offerReady ? 'انتخاب برای ارسال گروهی' : 'ابتدا دستهٔ آخر کالا را انتخاب کنید'}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggle?.()}
              disabled={!offerReady}
              className="size-4 accent-primary"
              aria-label="انتخاب برای ارسال گروهی"
            />
            <span className="hidden sm:inline">انتخاب</span>
          </label>
        )}
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

      {/* اقدام — دکمهٔ عنوان‌دار (خواستهٔ مالک: عنوان گویاتر از آیکون تنهاست).
          قفل تا انتخاب دستهٔ آخر؛ کلیک در حالت قفل → راهنمای والد (توست) */}
      <div className="mt-3 border-t border-border/60 pt-3">
        <button
          type="button"
          onClick={onOffer}
          aria-disabled={!offerReady || undefined}
          title={offerReady ? 'ارسال پیشنهاد تامین' : 'برای فعال‌شدن، دستهٔ آخر کالا را از «دسته‌ها» انتخاب کنید'}
          className={cn(
            'flex items-center gap-1.5 rounded-md border border-input bg-card px-3.5 py-2 text-xs font-bold text-foreground/75 transition-colors',
            offerReady
              ? 'hover:border-foreground/30 hover:bg-secondary hover:text-foreground'
              : 'cursor-not-allowed opacity-45',
          )}
        >
          <Send size={14} />
          ارسال پیشنهاد تامین
        </button>
      </div>
    </li>
  );
}
