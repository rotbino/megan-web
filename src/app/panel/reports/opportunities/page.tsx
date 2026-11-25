'use client';

/**
 * فرصت‌های فروش (۲۵-۱۱ راند ۲) — رادار تقاضا÷عرضه بر صنف.
 * سیگنال‌های تقاضا: درخواست‌های خرید تأییدشدهٔ ۳۰ روز + بازدید آگهی‌های همان صنف.
 * صادقانه: «تقاضای ثبت‌شده» نه «فروش تضمینی».
 * فریمیوم: ۳ ردیف زنده؛ کامل با بستهٔ فعال.
 */

import { AlertTriangle, PackageSearch } from 'lucide-react';
import { useOpportunityMap } from '@/lib/mock/hooks';
import { toFa, dateFa } from '@/lib/format';
import { PanelCard, PanelEmptyState, PanelSectionTitle } from '@/components/panel/panel-parts';
import { ChangeChip, LockedTeaser, RowsSkeleton } from '@/components/reports/report-parts';
import type { OpportunityRow } from '@/lib/types';

export default function OpportunitiesPage() {
  const { data, isLoading, isError, refetch } = useOpportunityMap();

  if (isLoading) return <RowsSkeleton rows={4} />;

  if (isError || !data) {
    return (
      <PanelEmptyState
        icon={AlertTriangle}
        title="فرصت‌ها الان در دسترس نیست"
        hint="ارتباط با سرور برقرار نشد؛ چند لحظه بعد دوباره تلاش کنید."
        actionLabel="تلاش دوباره"
        onAction={() => refetch()}
      />
    );
  }

  if (!data.rows.length) {
    return (
      <PanelEmptyState
        icon={PackageSearch}
        title="هنوز صنفِ فعالی برای رادار فرصت هست ولی رتبه‌بندی خالی است"
        hint="با ثبت‌شدن درخواست‌های خرید بیشتر، فرصت‌ها همین‌جا مرتب می‌شوند."
      />
    );
  }

  return (
    <div className="space-y-3">
      <PanelCard className="p-0">
        {/* سرستون‌ها — فقط دسکتاپ */}
        <div className="hidden border-b border-border px-4 py-2 text-[11px] font-bold text-muted-foreground md:grid md:grid-cols-[minmax(0,1.6fr)_110px_90px_90px_110px_minmax(0,1.2fr)] md:items-center">
          <span>صنف</span>
          <span className="text-center">درخواست ۳۰روز</span>
          <span className="text-center">فروشنده‌ها</span>
          <span className="text-center">سیگنال تقاضا</span>
          <span className="text-center">شاخص هفته</span>
          <span className="text-start">اقلام پرگردش</span>
        </div>

        <div className="divide-y divide-border/70">
          {data.rows.map((row) => (
            <OppRow key={row.category.id} row={row} />
          ))}
        </div>
      </PanelCard>

      <LockedTeaser count={data.lockedRows} label="صنف دیگرِ رادار فرصت" />

      <p className="px-1 pb-2 text-[11px] leading-5 text-muted-foreground/80">
        تقاضا = درخواست‌های خرید ثبت‌شدهٔ ۳۰ روز اخیر + بازدید آگهی‌های همان صنف؛ «فروش تضمینی» نیست —
        {` ${dateFa(data.generatedAt)}`}.
      </p>
    </div>
  );
}

/** یک صنف — موبایل: بلوک؛ دسکتاپ: سطر */
function OppRow({ row }: { row: OpportunityRow }) {
  const hot = row.score >= 50;
  return (
    <div className="px-4 py-3">
      <div className="grid gap-x-3 gap-y-1.5 md:grid-cols-[minmax(0,1.6fr)_110px_90px_90px_110px_minmax(0,1.2fr)] md:items-center">
        {/* صنف */}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold" title={row.category.name}>
            {row.category.name}
          </p>
          <p className="truncate text-[11px] text-muted-foreground" title={row.category.path}>
            {row.category.path}
          </p>
        </div>

        {/* درخواست ۳۰ روز */}
        <div className="md:text-center">
          <span className={`font-num text-sm font-bold ${row.requests30d > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
            {toFa(row.requests30d)}
          </span>
        </div>

        {/* فروشنده‌ها */}
        <div className="md:text-center">
          <span className="font-num text-sm font-bold">{toFa(row.sellers)}</span>
        </div>

        {/* سیگنال تقاضا — چیپ رنگی */}
        <div className="md:text-center">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 font-num text-[11px] font-bold ${
              hot ? 'bg-emerald-600/10 text-emerald-700' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {toFa(row.score)}
          </span>
        </div>

        {/* شاخص هفته */}
        <div className="md:text-center">
          <ChangeChip pct={row.index.value} size="xs" />
        </div>

        {/* اقلام پرگردش */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 md:text-start">
          {row.topItems.map((it) => (
            <span key={it.name} className="inline-flex items-baseline gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] leading-4">
              <span className="truncate">{it.name}</span>
              {it.median != null && <span className="font-num font-bold">{toFa(it.median)}</span>}
              <span className="text-muted-foreground/70 font-num">({toFa(it.sellers)})</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
