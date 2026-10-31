'use client';

/**
 * کارت آیتم دفتر خرید (سمت سایت) — مینیمال، تمیز و کشیده مثل کارت درخواست خرید،
 * اما متمایز: کاشی آیکون دسته به‌جای آواتار، چیپ دوره، بدون نام و اطلاعات تماس
 * (حریم خصوصی خریدار) و یک اقدام: «ارسال پیشنهاد تامین» — خاکستری خنثی،
 * نه آبی؛ تا فهرست از رنگ برند اشباع نشود (خواسته مالک ۳۱-۱۰).
 * غایبِ بیش از ۹۰ روز کم‌رنگ است و انتهای فهرست می‌آید.
 */

import { MapPin, Send, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toFa, unitHintFa } from '@/lib/format';
import { RootCategoryIcon } from '@/lib/category-icons';
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
  const hint = unitHintFa(entry.minAmount, entry.unit);

  return (
    <li
      className={cn(
        'rounded-md border bg-card p-4 transition-shadow hover:shadow-md sm:p-5',
        entry.stale && 'opacity-60 hover:opacity-100',
      )}
    >
      <div className="flex items-start gap-3.5 sm:items-center sm:gap-4">
        {/* کاشی آیکون دسته */}
        <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <RootCategoryIcon rootName={entry.rootName} size={22} />
        </span>

        {/* محتوا */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-sm font-extrabold sm:text-[15px]">{entry.categoryName}</h3>
            {entry.categoryPath && (
              <span className="truncate text-[11px] text-muted-foreground">{entry.categoryPath}</span>
            )}
            <span className="ms-auto inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
              {PERIOD_LABELS[entry.period] ?? 'ماهیانه'}
            </span>
          </div>

          <p className="mt-1.5 text-[13px] text-muted-foreground">
            حداقل خرید: <b className="text-foreground">{toFa(entry.minAmount)} {entry.unit}</b>
            {hint && <span className="text-muted-foreground"> ({hint})</span>}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <UserRound size={13} />
              {entry.role}
            </span>
            {(entry.province || entry.city) && (
              <span className="flex items-center gap-1">
                <MapPin size={13} />
                {[entry.province, entry.city].filter(Boolean).join(' - ')}
              </span>
            )}
            {entry.activeRecently ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
                فعال در ۷ روز گذشته
              </span>
            ) : entry.stale ? (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold">
                بیش از ۳ ماه غیرفعال
              </span>
            ) : null}
          </div>
        </div>

        {/* اقدام — دسکتاپ */}
        <div className="hidden shrink-0 items-center gap-2.5 sm:flex">
          {selectable && (
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggle?.()}
                className="size-4 accent-primary"
                aria-label="انتخاب برای ارسال گروهی"
              />
              انتخاب
            </label>
          )}
          {/* خاکستری خنثی — نه آبی؛ اشباع رنگ برند در فهرست (خواسته مالک ۳۱-۱۰) */}
          <Button
            size="sm"
            className="rounded-md bg-[#5b6472] text-white hover:bg-[#4c5462]"
            onClick={onOffer}
          >
            <Send size={14} />
            ارسال پیشنهاد تامین
          </Button>
        </div>
      </div>

      {/* اقدام — موبایل */}
      <div className="mt-3 flex items-center gap-2.5 sm:hidden">
        {selectable && (
          <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggle?.()}
              className="size-4 accent-primary"
              aria-label="انتخاب برای ارسال گروهی"
            />
            انتخاب
          </label>
        )}
        <Button
          size="sm"
          className="flex-1 rounded-md bg-[#5b6472] text-white hover:bg-[#4c5462]"
          onClick={onOffer}
        >
          <Send size={14} />
          ارسال پیشنهاد تامین
        </Button>
      </div>
    </li>
  );
}
