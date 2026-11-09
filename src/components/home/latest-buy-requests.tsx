'use client';

import Link from 'next/link';
import { CalendarClock, ChevronLeft, ClipboardList, MapPin } from 'lucide-react';
import { useBuyerDirectory, useLatestBuyRequests } from '@/lib/mock/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { toFa } from '@/lib/format';
import { PERIOD_LABELS } from '@/lib/types';
import { RelativeTime } from '@/components/shared/relative-time';

/**
 * دو ردیف افقی صفحهٔ اول (خواستهٔ مالک ۸-۱۱ دور ۲۸):
 *  ۱) «جدیدترین درخواست‌های خرید فوری» — کارت‌های درخواست فوری (باسکول‌سبک)
 *  ۲) «جدیدترین درخواست‌های خرید دوره‌ای» — کارت‌های دفتر خرید (دوره‌ای)
 * کلیک روی آیتم‌های هر دو → صفحهٔ «خریداران» پنل (/panel/buyers) که خودش
 * دو تب فوری/دوره‌ای دارد — تبِ متناسب با سکشن باز می‌شود (?tab=…).
 * جمله کارت فوری عین باسکول: «خریدار {مقدار} {واحد} {محصول} از نوع {نوع} هستم»
 */

const BUYERS_HREF = '/panel/buyers';

export function LatestBuyRequests() {
  const { data, isLoading } = useLatestBuyRequests();
  const items = (data ?? []).slice(0, 12);
  if (!isLoading && items.length === 0) return null;

  return (
    <section
      aria-labelledby="latest-buyads"
      className="mx-auto max-w-7xl px-4 py-6 lg:px-6 nav-desktop:mt-6 nav-desktop:rounded-lg nav-desktop:border nav-desktop:border-border/70 nav-desktop:bg-card nav-desktop:shadow-sm"
    >
      <div className="mb-3 flex h-10 items-center justify-between gap-2 nav-desktop:mb-4">
        <h2
            id="latest-buyads"
            className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium leading-6 nav-desktop:gap-2 nav-desktop:text-xl nav-desktop:leading-7"
        >
          <ClipboardList size={16} className="shrink-0 text-primary nav-desktop:size-5" />
          <span className="truncate">جدیدترین درخواست‌های خرید فوری</span>
        </h2>
        <Link
            href={`${BUYERS_HREF}?tab=requests`}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-1.5 text-[12px] font-medium text-primary transition-colors hover:bg-secondary nav-desktop:h-10 nav-desktop:gap-2 nav-desktop:px-2 nav-desktop:text-sm"
        >
          مشاهده همه
          <ChevronLeft size={18} className="nav-desktop:size-6" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-72 shrink-0 rounded-md" />)}
        </div>
      ) : (
        <div className="scroll-row">
          {items.map((r) => (
            <Link
              key={r.id}
              href={`${BUYERS_HREF}?tab=requests`}
              className="w-72 shrink-0 rounded-md border bg-card p-3 transition-shadow hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-full bg-secondary text-[11px] font-bold text-muted-foreground">
                    {r.firstName.charAt(0)}
                  </span>
                  <span className="text-xs font-bold">{r.firstName} {r.lastName}</span>
                </div>
                <span className="text-[11px] text-muted-foreground"><RelativeTime date={r.createdAt} /></span>
              </div>
              <p className="text-xs leading-6 text-muted-foreground">
                خریدار <span className="font-bold text-foreground">{toFa(r.requirementAmount)} {r.unit}</span>{' '}
                <span className="font-bold text-primary">{r.subcategoryName}</span>
                {r.name ? <> از نوع <span className="font-bold text-primary">{r.name}</span> هستم</> : ' هستم'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

/** جدیدترین درخواست‌های خرید دوره‌ای — کارت‌های دفتر خرید (دور ۲۸) */
export function LatestPeriodicBuyRequests() {
  const { data, isLoading } = useBuyerDirectory({ page: 1, perPage: 12 });
  const items = (data?.items ?? []).slice(0, 12);
  if (!isLoading && items.length === 0) return null;

  return (
    <section
      aria-labelledby="latest-periodic-buyads"
      className="mx-auto max-w-7xl px-4 py-6 lg:px-6 nav-desktop:rounded-lg nav-desktop:border nav-desktop:border-border/70 nav-desktop:bg-card nav-desktop:shadow-sm"
    >
      <div className="mb-3 flex h-10 items-center justify-between gap-2 nav-desktop:mb-4">
        <h2
            id="latest-periodic-buyads"
            className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium leading-6 nav-desktop:gap-2 nav-desktop:text-xl nav-desktop:leading-7"
        >
          <CalendarClock size={16} className="shrink-0 text-primary nav-desktop:size-5" />
          <span className="truncate">جدیدترین درخواست‌های خرید دوره‌ای</span>
        </h2>
        <Link
            href={`${BUYERS_HREF}?tab=periodic`}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-1.5 text-[12px] font-medium text-primary transition-colors hover:bg-secondary nav-desktop:h-10 nav-desktop:gap-2 nav-desktop:px-2 nav-desktop:text-sm"
        >
          مشاهده همه
          <ChevronLeft size={18} className="nav-desktop:size-6" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-72 shrink-0 rounded-md" />)}
        </div>
      ) : (
        <div className="scroll-row">
          {items.map((b) => (
            <Link
              key={b.id}
              href={`${BUYERS_HREF}?tab=periodic`}
              className="w-72 shrink-0 rounded-md border bg-card p-3 transition-shadow hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-full bg-secondary text-[11px] font-bold text-muted-foreground">
                    {b.buyerName.charAt(0)}
                  </span>
                  <span className="text-xs font-bold">{b.buyerName}</span>
                  <span className="rounded-full bg-secondary px-1.5 py-px text-[10px] font-bold text-muted-foreground">
                    خرید {PERIOD_LABELS[b.period]}
                  </span>
                </div>
                {b.city && (
                  <span className="flex shrink-0 items-center gap-0.5 text-[11px] text-muted-foreground">
                    <MapPin size={12} /> {b.city}
                  </span>
                )}
              </div>
              <p className="text-xs leading-6 text-muted-foreground">
                خریدار دوره‌ای{' '}
                <span className="font-bold text-foreground">{toFa(b.minAmount)} {b.unit}</span>{' '}
                <span className="font-bold text-primary">{b.categoryName}</span>{' '}
                {b.productType ? (
                  <>از نوع <span className="font-bold text-primary">{b.productType}</span> هستم</>
                ) : (
                  'هستم'
                )}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
