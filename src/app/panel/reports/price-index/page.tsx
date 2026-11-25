'use client';

/**
 * شاخص قیمت ایمچ (۲۵-۱۱ راند ۲) — عمومی؛ فقط درصد تغییر هفتگی بر
 * صنف‌های پرآگهی. رایگان و بی‌قیمت مطلق (همان گِیت قیمت اعضا).
 * با جریان گرفتن price-sync هفتگی، نمودار تاریخی همین‌جا می‌نشیند.
 */

import { AlertTriangle } from 'lucide-react';
import { usePriceIndex } from '@/lib/mock/hooks';
import { toFa, dateFa } from '@/lib/format';
import { PanelCard, PanelEmptyState, PanelSectionTitle } from '@/components/panel/panel-parts';
import { ChangeChip, RowsSkeleton } from '@/components/reports/report-parts';
import type { PriceIndexData } from '@/lib/types';

export default function PriceIndexPage() {
  const { data, isLoading, isError, refetch } = usePriceIndex();

  if (isLoading) return <RowsSkeleton rows={4} />;

  if (isError || !data) {
    return (
      <PanelEmptyState
        icon={AlertTriangle}
        title="شاخص الان در دسترس نیست"
        hint="ارتباط با سرور برقرار نشد؛ چند لحظه بعد دوباره تلاش کنید."
        actionLabel="تلاش دوباره"
        onAction={() => refetch()}
      />
    );
  }

  const overall = data.overall;

  return (
    <div className="space-y-3">
      {/* شاخص کل */}
      <PanelCard className="p-4 sm:p-5">
        <PanelSectionTitle title="شاخص قیمت ایمچ" />
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-secondary/60 px-3 py-2 text-xs">
          <span className="font-bold">این هفته:</span>
          {overall.value != null ? (
            <>
              <span className={overall.value > 0 ? 'font-extrabold text-emerald-600' : 'font-extrabold text-rose-600'}>
                {toFa(Math.abs(overall.value))}٪ {overall.value > 0 ? 'افزایش' : 'کاهش'}
              </span>
              <span className="text-muted-foreground">(میانهٔ {toFa(overall.basis)} صنفِ دارای تغییر)</span>
            </>
          ) : (
            <span className="text-muted-foreground">
              هنوز دادهٔ تازه‌ای نیست — با جریان گرفتن رصد هفتگی، شاخص اینجا می‌نشیند.
            </span>
          )}
        </div>
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
          {dateFa(data.generatedAt)} — تغییر هفتگی قیمت‌ها بر {toFa(data.categories.length)} صنف پرآگهی.
        </p>
      </PanelCard>

      {/* جدول صنف‌ها */}
      <PanelCard className="p-0">
        <div className="hidden border-b border-border px-4 py-2 text-[11px] font-bold text-muted-foreground md:grid md:grid-cols-[minmax(0,1.6fr)_110px_90px_110px] md:items-center">
          <span>صنف</span>
          <span className="text-center">آگهی فعال</span>
          <span className="text-center">فروشنده‌ها</span>
          <span className="text-center">شاخص هفته</span>
        </div>
        <div className="divide-y divide-border/70">
          {data.categories.map((c) => (
            <div
              key={c.name}
              className="grid gap-x-3 gap-y-1 px-4 py-3 md:grid-cols-[minmax(0,1.6fr)_110px_90px_110px] md:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold" title={c.name}>
                  {c.name}
                </p>
                <p className="truncate text-[11px] text-muted-foreground" title={c.path}>
                  {c.path}
                </p>
              </div>
              <div className="md:text-center">
                <span className="font-num text-sm font-bold">{toFa(c.listings)}</span>
              </div>
              <div className="md:text-center">
                <span className="font-num text-sm font-bold">{toFa(c.sellers)}</span>
              </div>
              <div className="md:text-center">
                <ChangeChip pct={c.index} />
              </div>
            </div>
          ))}
        </div>
      </PanelCard>

      <p className="px-1 pb-2 text-[11px] leading-5 text-muted-foreground/80">
        شاخص = میانهٔ تغییر قیمت‌های واقعیِ هفتهٔ اخیر همان صنف؛ فقط درصد، بدون قیمت مطلق. نمودار تاریخی با
        جریان گرفتن رصد روزانه اضافه می‌شود.
      </p>
    </div>
  );
}
