'use client';

/**
 * گزارش بازار — ردیاب قیمت صنفِ فروشنده (۲۵-۱۱).
 *
 * چی می‌فروشیم: «هر شنبه صبح قیمت‌های صنفت را بدان» نه «در سایتی خالی
 * دیده شو». آمار فقط از آگهی‌های واقعیِ همان صنف ساخته می‌شود — یعنی
 * این صفحه به شلوغی سایت ربطی ندارد و از روز اول کار می‌کند.
 *
 * ساختار پاسخ بک‌اند (getMarketReport):
 *  • رایگان: ۳ قلمِ خودِ فروشنده + شاخص صنف + تلنگر («چند قلم دیگر تغییر
 *    کردند») — قلم‌های شخصی برای همیشه رایگان‌اند (حس نگیریم چیزی را
 *    که داشت را از او پس گرفتیم).
 *  • بستهٔ فعال: جدول کامل تا ۳۰ قلم پرعرضه‌کنندهٔ صنف + اسپارک‌لاین
 *    هفتگی + «قیمت شما در برابر بازار».
 *
 * قواعد صداقت گزارش (با بک‌اند هم‌قرارداد):
 *  • هر قلم حداقل ۳ فروشندهٔ متمایز — وگرنه اصلاً آمار نمی‌شود (نه عدد
 *    نصفه؛ جای خالی را همان‌طور نشان می‌دهیم).
 *  • «تغییر هفته» فقط از تاریخچهٔ واقعی تغییر قیمت می‌آید — تا price-sync
 *    چند هفته جریان پیدا کند، «دادهٔ تازه‌ای نیست» می‌بینیم؛ دروغ نمی‌گوییم.
 *  • حریم قیمتی: همه‌چیز تجمیعی است — قیمت هیچ فروشنده‌ای با نامش به
 *    فروشندهٔ دیگری نشان داده نمی‌شود.
 */

import { AlertTriangle, Eye, Lock, Package, TrendingDown, TrendingUp } from 'lucide-react';
import { useMarketReport } from '@/lib/mock/hooks';
import { toFa, dateFa } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PanelCard, PanelEmptyState, PanelSectionTitle } from '@/components/panel/panel-parts';
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
          ساخته‌شده از {toFa(report.listingCount ?? 0)} آگهی {toFa(report.sellerCount ?? 0)} فروشنده
          <span className="mx-1 text-muted-foreground/40">•</span>
          {dateFa(report.generatedAt)}
        </p>

        {/* شاخص صنف — رایگان برای همه؛ تا دادهٔ هفتگی جریان نیفتده «هنوز» صادق می‌مانیم */}
        <IndexStrip report={report} />
      </PanelCard>

      {/* نسخهٔ رایگان: کاشی قلم‌های خودت */}
      {!report.packageActive && (
        <p className="px-1 text-xs text-muted-foreground">
          نسخهٔ رایگان: قلم‌های خود شما همیشه اینجاست؛ جدول کامل صنف با بستهٔ فعال باز می‌شود.
        </p>
      )}

      {/* قلم‌ها */}
      {items.length === 0 ? (
        <PanelCard className="p-4 sm:p-5">
          <p className="text-sm font-bold">قلم‌های شما هنوز دادهٔ مقایسه ندارند</p>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            هر قلم وقتی به گزارش می‌آید که دست‌کم ۳ فروشندهٔ صنفتان قیمتِ همان کالا را ثبت کرده باشند. با
            ثبت نام استاندارد کالاها و به‌روز نگه‌داشتن قیمت‌ها، قلم‌های شما زودتر به ردیاب می‌رسند.
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
      {!report.packageActive && teaser && (
        <PanelCard className="border-dashed p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-muted-foreground">
              <Lock size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">
                {toFa(report.lockedItems ?? 0)} قلم دیگرِ صنف {cat.name} قیمت‌های رصدشده دارند
              </p>
              <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
                میانه، بازهٔ خرید و تغییر هفتگیِ تمام قلم‌های صنفتان + اسپارک‌لاین هشت‌هفته‌ای — با بستهٔ فعال
                باز می‌شود.
              </p>
              <Button asChild size="sm" className="mt-3 rounded-md">
                <a href="/panel/pricing">باز کردن جدول کامل بازار</a>
              </Button>
            </div>
          </div>
        </PanelCard>
      )}

      {/* پانوشت — قواعد گزارش؛ صادق و کوتاه */}
      <p className="px-1 pb-2 text-[11px] leading-5 text-muted-foreground/80">
        قیمت‌ها به تومان برای هر {cat.unit} و فقط تجمیعی‌اند — قیمت هیچ فروشنده‌ای با نامش منتشر نمی‌شود.
        قلم‌هایی که کمتر از ۳ فروشنده قیمت داده‌اند هنوز آمار نشده‌اند
        {teaser?.insufficient ? ` (${toFa(teaser.insufficient)} قلم در راه)` : ''}.
      </p>
    </div>
  );
}

/** شاخص صنف + توضیح مبنا — باکس یک‌خطی زنجیره‌ای */
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
          هنوز دادهٔ تازه‌ای نیست — با جریان گرفتن رصد هفتگی قیمت‌ها، شاخص اینجا می‌نشیند.
        </span>
      )}
    </div>
  );
}

/** یک قلم — موبایل: بلوک؛ دسکتاپ: سطر گرید */
function ItemRow({ item, highlight }: { item: MarketReportItem; highlight?: boolean }) {
  const chg = item.changePct;
  const up = chg != null && chg > 0;
  return (
    <div
      className={`grid gap-x-3 gap-y-1.5 px-4 py-3 md:grid-cols-[minmax(0,1.5fr)_110px_140px_90px_minmax(0,1fr)_84px] md:items-center ${
        highlight ? 'bg-primary/[0.04]' : ''
      }`}
    >
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
          <span className="font-num text-sm font-extrabold">{toFa(item.median)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {/* بازه */}
      <div className="text-[11px] text-muted-foreground md:text-start">
        {item.min != null && item.max != null
          ? `${toFa(item.min)} تا ${toFa(item.max)}`
          : '—'}
      </div>

      {/* تغییر هفته */}
      <div className="md:text-center">
        {chg == null ? (
          <span className="text-xs text-muted-foreground/70">—</span>
        ) : (
          <span
            className={`inline-flex items-center gap-1 text-xs font-bold ${up ? 'text-emerald-600' : 'text-rose-600'}`}
          >
            {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {toFa(Math.abs(chg))}٪
          </span>
        )}
      </div>

      {/* قیمت شما در برابر بازار */}
      <div className="md:text-start">
        <MineChip item={item} />
      </div>

      {/* عرضه‌کنندگان + اسپارک (بستهٔ فعال) */}
      <div className="flex items-center justify-end gap-2 md:justify-end">
        {item.spark && item.spark.length >= 2 && <Sparkline points={item.spark} />}
        <span className="text-[11px] text-muted-foreground">{toFa(item.sellers)} عرضه</span>
      </div>
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

/** اسپارک‌لاین ۸ هفته‌ای — خط ساده بی‌آیکون؛ ارزش‌ها تومان */
function Sparkline({ points }: { points: Array<{ value: number }> }) {
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const w = 56;
  const h = 18;
  const coords = points
    .map((p, i) => {
      const x = points.length === 1 ? w / 2 : (i / (points.length - 1)) * w;
      const y = h - 1 - ((p.value - min) / span) * (h - 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 text-primary" aria-hidden>
      <polyline points={coords} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** اسکلتون بارگذاری — شکل نهایی صفحه را دارد تا پرش نداشته باشیم */
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
