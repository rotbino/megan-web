'use client';

/**
 * گزارش بازار صنف (۲۵-۱۱ راند ۲) — ردیاب قیمت صنفِ فروشنده + پلهٔ حجمی + برش شهری.
 *
 * چی می‌فروشیم: «هر شنبه صبح قیمت‌های صنفت را بدان». آمار فقط از آگهی‌های
 * واقعی همان صنف ساخته می‌شود. رایگان: ۳ قلم شخصی + شاخص؛ بستهٔ فعال: جدول کامل.
 *
 * قواعد صداقت (هم‌قرارداد بک‌اند):
 *  • مبنا فقط قیمت‌های به‌روزشده (۳ روز؛ وگرنه ۷ روز) — قیمت‌های کهنه ملاک نیستند.
 *  • هر قلم حداقل ۳ فروشندهٔ به‌روزشده — وگرنه آمار نمی‌شود.
 *  • «تغییر هفته» و روند فقط از هفتهٔ اخیر؛ قیمت هیچ فروشنده‌ای با نامش منتشر نمی‌شود.
 */

import { AlertTriangle, Lock, Package } from 'lucide-react';
import { useMarketReport } from '@/lib/mock/hooks';
import { toFa, dateFa } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PanelCard, PanelEmptyState, PanelSectionTitle } from '@/components/panel/panel-parts';
import { ChangeChip, CityChips, Sparkline, TierChips } from '@/components/reports/report-parts';
import type { MarketReport, MarketReportItem } from '@/lib/types';

export default function MarketReportPage() {
  const { data, isLoading, isError, refetch } = useMarketReport();

  if (isLoading) return <ReportSkeleton />;

  if (isError || !data) {
    return (
      <PanelEmptyState
        icon={AlertTriangle}
        title="گزارش بازار الان در دسترس نیست"
        hint="ارتباط با سرور برقرار نشد؛ چند لحظه بعد دوباره تلاش کنید."
        actionLabel="تلاش دوباره"
        onAction={() => refetch()}
      />
    );
  }

  if (!data.category) {
    return (
      <PanelEmptyState
        icon={Package}
        title="برای دیدن گزارش بازار اول کالا ثبت کنید"
        hint="گزارش بازار از قیمت‌های آگهی‌های صنف شما ساخته می‌شود؛ همین که اولین کالای خود را ثبت کنید، ردیاب قیمت صنفتان هر هفته اینجا آماده است."
        actionLabel="ثبت محصول"
        actionHref="/panel/products/new"
      />
    );
  }

  return <ReportView report={data} />;
}

// ─── نما ───────────────────────────────────────────────────────────────────

function ReportView({ report }: { report: MarketReport }) {
  const cat = report.category!;
  const items = report.packageActive ? (report.items ?? []) : (report.myItems ?? []);
  const teaser = report.teaser;
  const myNames = new Set(report.myItemNames ?? []);

  return (
    <div className="space-y-3">
      {/* سربرگ — صنف + مبنا */}
      <PanelCard className="p-4 sm:p-5">
        <PanelSectionTitle title={`گزارش بازار ${cat.name}`} />
        <p className="text-xs leading-6 text-muted-foreground">
          {cat.path}
          <span className="mx-1 text-muted-foreground/40">•</span>
          ساخته‌شده از قیمت‌های به‌روزشدهٔ {toFa(report.listingCount ?? 0)} آگهی {toFa(report.sellerCount ?? 0)} فروشنده
          <span className="mx-1 text-muted-foreground/40">•</span>
          {dateFa(report.generatedAt)}
        </p>

        <IndexStrip report={report} />
      </PanelCard>

      {/* قلم‌ها */}
      {items.length === 0 ? (
        <PanelCard className="p-4 sm:p-5">
          <p className="text-sm font-bold">قلم‌های شما هنوز دادهٔ تازه کافی ندارند</p>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            قیمت‌ها روزانه نوسان می‌کنند؛ هر قلم وقتی به گزارش می‌آید که دست‌کم ۳ فروشنده قیمتِ همان کالا را در ۷ روز اخیر به‌روز کرده باشند.
          </p>
        </PanelCard>
      ) : (
        <PanelCard className="p-0">
          {/* سرستون‌ها — فقط دسکتاپ */}
          <div className="hidden border-b border-border px-4 py-2 text-[11px] font-bold text-muted-foreground md:grid md:grid-cols-[minmax(0,1.5fr)_110px_140px_90px_minmax(0,1fr)_84px] md:items-center">
            <span>قلم کالا</span>
            <span className="text-start">میانهٔ بازار</span>
            <span className="text-start">بازهٔ بازار</span>
            <span className="text-center">تغییر هفته</span>
            <span className="text-start">قیمت شما</span>
            <span className="text-end">عرضه‌کننده</span>
          </div>

          <div className="divide-y divide-border/70">
            {items.map((it) => (
              <ItemRow key={it.name} item={it} highlight={myNames.has(it.name)} />
            ))}
          </div>
        </PanelCard>
      )}

      {/* تلنگر رایگان: بقیهٔ صنف پشت درِ بسته */}
      {!report.packageActive && (
        <LockedTeaser report={report} />
      )}

      {/* پانوشت — قواعد گزارش؛ صادق و کوتاه */}
      <p className="px-1 pb-2 text-[11px] leading-5 text-muted-foreground/80">
        مبنا فقط قیمت‌های به‌روزشدهٔ ۳ یا ۷ روز اخیر است — قیمت‌های کهنه مقایسه نمی‌شوند. قیمت‌ها به تومان برای هر {cat.unit} و فقط تجمیعی‌اند؛ کمتر از ۳ فروشندهٔ به‌روزشده = آمار نمی‌شود.</p>
    </div>
  );
}

/** شاخص صنف + توضیح مبنا — باکس یک‌خطی */
function IndexStrip({ report }: { report: MarketReport }) {
  const v = report.index?.value ?? null;
  const basis = report.index?.basis ?? 0;
  const up = v != null && v > 0;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-secondary/60 px-3 py-2 text-xs">
      <span className="font-bold">شاخص صنف این هفته:</span>
      {v != null ? (
        <>
          <span className={up ? 'font-extrabold text-emerald-600' : 'font-extrabold text-rose-600'}>
            {toFa(Math.abs(v))}٪ {up ? 'افزایش' : 'کاهش'}
          </span>
          <span className="text-muted-foreground">(میانهٔ تغییر {toFa(basis)} قلم)</span>
        </>
      ) : (
        <span className="text-muted-foreground">
          هنوز دادهٔ تازه‌ای نیست — با به‌روز شدن قیمت‌ها، شاخص اینجا می‌نشیند.
        </span>
      )}
    </div>
  );
}

/** یک قلم — موبایل: بلوک؛ دسکتاپ: سطر گرید؛ پله/شهر: خط دوم ریز */
function ItemRow({ item, highlight }: { item: MarketReportItem; highlight?: boolean }) {
  return (
    <div className={`px-4 py-3 ${highlight ? 'bg-primary/[0.04]' : ''}`}>
      <div className="grid gap-x-3 gap-y-1.5 md:grid-cols-[minmax(0,1.5fr)_110px_140px_90px_minmax(0,1fr)_84px] md:items-center">
        {/* نام + واحد */}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold" title={item.name}>
            {item.name}
            {highlight && <span className="ms-1.5 text-[10px] font-normal text-primary">(قلم شما)</span>}
          </p>
          <p className="text-[11px] text-muted-foreground">
            هر {item.unit}
            {item.mixedUnit && <span className="ms-1 text-amber-600">(واحدهای مختلفی ثبت شده)</span>}
          </p>
        </div>

        {/* میانه */}
        <div className="md:text-start">
          {item.median != null ? (
            <>
              <span className="font-num text-sm font-extrabold">{toFa(item.median)}</span>
              {item.basisDays != null && (
                <span className="ms-1 text-[9px] text-muted-foreground/80">مبنای {toFa(item.basisDays)} روز</span>
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>

        {/* بازه */}
        <div className="text-[11px] text-muted-foreground md:text-start">
          {item.min != null && item.max != null ? `${toFa(item.min)} تا ${toFa(item.max)}` : '—'}
        </div>

        {/* تغییر هفته */}
        <div className="md:text-center">
          <ChangeChip pct={item.changePct} />
        </div>

        {/* قیمت شما در برابر بازار */}
        <div className="md:text-start">
          <MineChip item={item} />
        </div>

        {/* عرضه‌کنندگان + اسپارک */}
        <div className="flex items-center justify-end gap-2 md:justify-end">
          {item.spark && item.spark.length >= 2 && <Sparkline points={item.spark} />}
          <span className="text-[11px] text-muted-foreground">{toFa(item.sellers)} عرضه</span>
        </div>
      </div>

      {/* خط دوم: پلهٔ حجمی + برش شهری — فقط با دادهٔ پشتیبان */}
      {(item.tiers?.length || item.cities?.length) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 md:ps-1">
          <TierChips tiers={item.tiers} />
          <CityChips cities={item.cities} />
        </div>
      )}
    </div>
  );
}

/** قیمت خودِ فروشنده + فاصله از میانهٔ بازار */
function MineChip({ item }: { item: MarketReportItem }) {
  const mine = item.mine;
  if (!mine) return <span className="text-xs text-muted-foreground/50">—</span>;
  const d = mine.diffPct;
  const higher = d != null && d > 0;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="font-num text-sm font-bold">{toFa(mine.price)}</span>
      {d != null && (
        <span className={`text-[11px] font-bold ${higher ? 'text-rose-600' : 'text-emerald-600'}`}>
          {higher ? 'گران‌تر از بازار' : 'ارزان‌تر از بازار'} {toFa(Math.abs(d))}٪
        </span>
      )}
      {mine.expired && (
        <span className="inline-flex items-center gap-1 text-[10px] text-amber-600">
          <AlertTriangle size={11} /> قیمت شما منقضی شده
        </span>
      )}
    </span>
  );
}

/** تلنگر فریمیوم — بقیهٔ صنف پشت درِ بسته */
function LockedTeaser({ report }: { report: MarketReport }) {
  const cat = report.category!;
  const teaser = report.teaser;
  const locked = report.lockedItems ?? 0;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed bg-card/60 p-4 sm:p-5">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-muted-foreground">
        <Lock size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">
          {toFa(locked)} قلم دیگرِ صنف {cat.name} رصد می‌شوند
        </p>
        <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
          جدول کامل + پلهٔ حجمی + برش شهری + اسپارک‌لاین روزانه
          {teaser?.insufficient ? ` (${toFa(teaser.insufficient)} قلم دیگر در راه)` : ''}.
        </p>
        <Button asChild size="sm" className="mt-3 rounded-md">
          <a href="/panel/pricing">باز کردن جدول کامل بازار</a>
        </Button>
      </div>
    </div>
  );
}

/** اسکلتون بارگذاری — شکل نهایی صفحه */
function ReportSkeleton() {
  return (
    <div className="space-y-3">
      <PanelCard className="space-y-3 p-4 sm:p-5">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-9 w-full" />
      </PanelCard>
      <PanelCard className="p-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 border-b border-border/70 px-4 py-4 last:border-0">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-10" />
            </div>
          </div>
        ))}
      </PanelCard>
    </div>
  );
}
