'use client';

/**
 * مشاور خرید دوره‌ای (۲۵-۱۱ راند ۲) — سبد خرید دوره‌ای خریدار (دفتر خرید) ×
 * قیمت بازار. برای هر صنفِ سبد: اقلام پرگردش با میانه/بازه + سیگنال
 * «الان بخر / صبر کن» از فاصلهٔ امروز تا میانگین ۸ هفته.
 *
 * فریمیوم: ۳ صنف زنده؛ کامل با بستهٔ فعال. مینیمال — بدون توضیح اضافه.
 */

import { AlertTriangle, BookOpen, Compass } from 'lucide-react';
import { useBuyAdvisor } from '@/lib/mock/hooks';
import { toFa, dateFa } from '@/lib/format';
import { PanelCard, PanelEmptyState, PanelSectionTitle } from '@/components/panel/panel-parts';
import { ChangeChip, CityChips, LockedTeaser, RowsSkeleton, SignalChip, Sparkline, TierChips } from '@/components/reports/report-parts';
import type { AdvisorRow } from '@/lib/types';

const PERIOD_LABEL: Record<string, string> = {
  daily: 'روزانه',
  weekly: 'هفتگی',
  monthly: 'ماهانه',
  yearly: 'سالانه',
  occasional: 'موقتی',
};

export default function BuyAdvisorPage() {
  const { data, isLoading, isError, refetch } = useBuyAdvisor();

  if (isLoading) return <RowsSkeleton rows={4} />;

  if (isError || !data) {
    return (
      <PanelEmptyState
        icon={AlertTriangle}
        title="مشاور خرید الان در دسترس نیست"
        hint="ارتباط با سرور برقرار نشد؛ چند لحظه بعد دوباره تلاش کنید."
        actionLabel="تلاش دوباره"
        onAction={() => refetch()}
      />
    );
  }

  if (!data.rows.length && !data.pendingCount) {
    return (
      <PanelEmptyState
        icon={Compass}
        title="هنوز خرید دوره‌ای ثبت نکرده‌اید"
        hint="سبد خرید دوره‌ای خود را در دفتر خرید ثبت کنید تا قیمت بازار و زمان خریدش را ببینید."
        actionLabel="ثبت خرید دوره‌ای"
        actionHref="/panel"
      />
    );
  }

  return (
    <div className="space-y-3">
      {data.rows.map((row) => (
        <AdvisorCard key={row.category.id} row={row} />
      ))}

      {/* ردیف‌های قفل */}
      <LockedTeaser count={data.lockedRows} label="صنف دیگرِ سبد شما" />

      {data.pendingCount > 0 && (
        <p className="px-1 text-[11px] text-muted-foreground">
          {toFa(data.pendingCount)} صنف در انتظار تأیید است.
        </p>
      )}

      <p className="px-1 pb-2 text-[11px] leading-5 text-muted-foreground/80">
        سیگنال‌ها از فاصلهٔ قیمت امروز تا میانگین ۸ هفتهٔ همان قلم‌اند — {dateFa(data.generatedAt)}.
      </p>
    </div>
  );
}

/** یک صنف سبد — سربرگ + اقلام */
function AdvisorCard({ row }: { row: AdvisorRow }) {
  const idx = row.index;
  const up = idx.value != null && idx.value > 0;
  return (
    <PanelCard className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <PanelSectionTitle title={row.category.name} />
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          {PERIOD_LABEL[row.period] ?? row.period} · هر بار {toFa(row.volumeMin)} {row.category.unit}
        </span>
        {idx.value != null && (
          <span className={`text-[11px] font-bold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
            شاخص هفته: {toFa(Math.abs(idx.value))}٪ {up ? 'افزایش' : 'کاهش'}
          </span>
        )}
      </div>

      <div className="divide-y divide-border/70">
        {row.items.map((it) => (
          <div key={it.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold" title={it.name}>
                {it.name}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                {it.median != null && (
                  <span className="font-num text-sm font-extrabold">{toFa(it.median)}</span>
                )}
                <span className="text-[11px] text-muted-foreground">
                  {it.min != null && it.max != null ? `${toFa(it.min)} تا ${toFa(it.max)} / هر ${it.unit}` : `هر ${it.unit}`}
                </span>
                <ChangeChip pct={it.changePct} size="xs" />
                <SignalChip signal={it.signal} devPct={it.devPct} />
              </div>
              {(it.tiers?.length || it.cities?.length) && (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <TierChips tiers={it.tiers} />
                  <CityChips cities={it.cities} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {it.spark && it.spark.length >= 2 && <Sparkline points={it.spark} />}
              <span className="text-[11px] text-muted-foreground">{toFa(it.sellers)} عرضه</span>
            </div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}
