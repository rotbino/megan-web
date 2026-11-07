'use client';

/**
 * کارت آیتم دفتر خرید (سمت سایت) — عین چیدمان سادهٔ کارت درخواست خرید باسکول:
 *  • سربرگ: آواتار دایره‌ای + نام خریدار
 *  • جمله: «خریدار عمده ۲ تن پسته به‌صورت ماهیانه هستم»
 *  • پانویس: آیکون تقویم + آخرین فعالیت، آیکون مکان + استان/شهر
 *  • اقدام: دکمهٔ «پیشنهاد تامین» (خواسته مالک ۴-۱۱ — کوتاه، بدون «ارسال»):
 *    موبایل زیر متن با خط جداکننده؛ دسکتاپ رو‌به‌روی متن‌ها در انتهای کارت
 *    (هم‌تراز وسط) — تمیزتر از دکمهٔ زیر متن.
 *    هر نیاز ثبت‌شده از ابتدا به یک دستهٔ آخر وصل است؛ دستهٔ کالا از خود
 *    همین کارت می‌آید. ارسال گروهی از دکمهٔ بالای لیست (ویزار) انجام می‌شود.
 *  • نقطهٔ سبز روی آواتار = فعال در ۷ روز گذشته؛ غایبِ بیش از ۹۰ روز کم‌رنگ.
 */

import { CalendarDays, MapPin, Send } from 'lucide-react';
import { dateFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PERIOD_LABELS, type BuyerDirectoryItem } from '@/lib/types';

export function BookEntryCard({
  entry,
  onOffer,
  matchBadge,
}: {
  entry: BuyerDirectoryItem;
  onOffer: () => void;
  /** بج دقت تطابق (پنل فروشنده — خواسته مالک ۴-۱۱): «دقت تطابق ٪۸۵» */
  matchBadge?: { score: number; label?: string };
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          {/* سربرگ — آواتار + نام خریدار */}
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
            {/* بج تطابق — فقط پنل فروشنده؛ مطابق‌ترین‌ها بالاتر لیست‌اند */}
            {matchBadge && matchBadge.score > 0 && (
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold',
                  matchBadge.score >= 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600',
                )}
              >
                دقت تطابق ٪{toFa(matchBadge.score)}
              </span>
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
        </div>

        {/* اقدام — دسکتاپ: رو‌به‌روی متن‌ها در انتهای کارت؛ موبایل: زیر متن */}
        <div className="shrink-0 border-t border-border/60 pt-3 sm:mt-0 sm:border-t-0 sm:pt-0">
          <button
            type="button"
            onClick={onOffer}
            title={`ارسال پیشنهاد تامین ${entry.categoryName}`}
            className="flex items-center gap-1.5 rounded-md border border-input bg-card px-3.5 py-2 text-xs font-bold text-foreground/75 transition-colors hover:border-foreground/30 hover:bg-secondary hover:text-foreground"
          >
            <Send size={14} />
            پیشنهاد تامین
          </button>
        </div>
      </div>
    </li>
  );
}
