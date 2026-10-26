'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useLatestBuyRequests } from '@/lib/mock/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { toFa, timeAgoFa } from '@/lib/format';

/**
 * «جدیدترین درخواست های خرید» — ردیف افقی مثل باسکول.
 * جمله کارت عین باسکول: «خریدار {مقدار} {واحد} {محصول} از نوع {نوع} هستم»
 */
export function LatestBuyRequests() {
  const { data, isLoading } = useLatestBuyRequests();
  const items = (data ?? []).slice(0, 12);

  return (
    <section aria-labelledby="latest-buyads" className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      <div className="mb-3 flex h-10 items-center justify-between nav-desktop:mb-4">
        <h2 id="latest-buyads" className="text-base font-medium leading-7 nav-desktop:text-xl">جدیدترین درخواست های خرید</h2>
        <Link
          href="/buyAd-requests"
          className="inline-flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium text-primary transition-colors hover:bg-secondary"
        >
          مشاهده همه
          <ChevronLeft size={24} />
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
              href="/buyAd-requests"
              className="w-72 shrink-0 rounded-md border bg-card p-3 transition-shadow hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-full bg-secondary text-[11px] font-bold text-muted-foreground">
                    {r.firstName.charAt(0)}
                  </span>
                  <span className="text-xs font-bold">{r.firstName} {r.lastName}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">{timeAgoFa(r.createdAt)}</span>
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
