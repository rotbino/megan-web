'use client';

/**
 * اجزای مشترک گزارشات ایمچ (۲۵-۱۱ راند ۲) — مینیمال و یک‌نگاهی:
 *  • Sparkline — اسپارک روزانهٔ هفتهٔ اخیر داخل ردیف‌ها (بی‌آیکون)
 *  • LineChart — نمودار خطی روزانه با مینیمم/ماکس
 *  • ChangeChip — ▲▼ درصد تغییر
 *  • TierChips — پله‌های حجمی «خرده ۴۱k · عمده ۳۴k»
 *  • CityChips — برش شهری «تهران ۳۸k · مشهد ۴۱k»
 *  • PriceTrack — نوار min→max با نشانگر میانه و قیمتِ شما
 *  • SignalChip — سیگنال خرید/صبر مشاور خرید
 *  • LockedTeaser — کارت قفل فریمیوم با شمار ردیف‌های بسته
 */

import { Lock, TrendingDown, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { toFa } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReportCity, ReportTier } from '@/lib/types';

// ─── اسپارک‌لاین ───────────────────────────────────────────────────────────

export function Sparkline({ points, className = '' }: { points: Array<{ value: number }>; className?: string }) {
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
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={`shrink-0 text-primary ${className}`} aria-hidden>
      <polyline points={coords} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── نمودار خطی روزانه — نقاط روزانه + برچسب ابتداء/انتها ────────────────

export function LineChart({
  points,
  unit,
}: {
  points: Array<{ dayStart: string; value: number }>;
  unit?: string;
}) {
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const w = 100;
  const h = 100;
  const coords = points.map((p, i) => {
    const x = points.length === 1 ? w / 2 : (i / (points.length - 1)) * w;
    const y = h - 6 - ((p.value - min) / span) * (h - 16);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = coords.join(' ');
  const area = `0,${h} ${line} ${w},${h}`;
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-[120px] w-full text-primary" aria-hidden>
        <polygon points={area} fill="currentColor" opacity="0.08" />
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => {
          const [x, y] = coords[i].split(',');
          return <circle key={i} cx={x} cy={y} r="2.5" fill="currentColor" vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span className="font-num">{toFa(min)}{unit ? ` ${unit}` : ''}</span>
        <span className="font-num">{toFa(max)}{unit ? ` ${unit}` : ''}</span>
      </div>
    </div>
  );
}

// ─── چیپ تغییر هفتگی ─────────────────────────────────────────────────────

export function ChangeChip({ pct, size = 'sm' }: { pct: number | null; size?: 'xs' | 'sm' }) {
  if (pct == null) return <span className={`text-muted-foreground/60 ${size === 'xs' ? 'text-[10px]' : 'text-xs'}`}>—</span>;
  const up = pct > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 font-bold ${up ? 'text-emerald-600' : 'text-rose-600'} ${
        size === 'xs' ? 'text-[10px]' : 'text-xs'
      }`}
    >
      {size === 'sm' && (up ? <TrendingUp size={13} /> : <TrendingDown size={13} />)}
      {toFa(Math.abs(pct))}٪
    </span>
  );
}

// ─── چیپ‌های پلهٔ حجمی / شهر ──────────────────────────────────────────────

export function TierChips({ tiers, unit }: { tiers: ReportTier[] | null | undefined; unit?: string }) {
  if (!tiers?.length) return null;
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      {tiers.map((t) => (
        <span key={t.label} className="inline-flex items-baseline gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] leading-4">
          <span className="text-muted-foreground">{t.label}</span>
          <span className="font-num font-bold">{toFa(t.median)}</span>
          {unit ? <span className="text-muted-foreground/70">{unit}</span> : null}
        </span>
      ))}
    </span>
  );
}

export function CityChips({ cities, unit }: { cities: ReportCity[] | null | undefined; unit?: string }) {
  if (!cities?.length) return null;
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      {cities.map((c) => (
        <span key={c.cityId} className="inline-flex items-baseline gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] leading-4">
          <span className="text-muted-foreground">{c.cityName}</span>
          <span className="font-num font-bold">{toFa(c.median)}</span>
          {unit ? <span className="text-muted-foreground/70">{unit}</span> : null}
        </span>
      ))}
    </span>
  );
}

// ─── نوار جایگاه قیمت — محور عددی: کف چپ → سقف راست (مثل همهٔ نمودارها) ───

export function PriceTrack({
  min,
  max,
  median,
  mine,
  expired,
}: {
  min: number;
  max: number;
  median: number | null;
  mine: number;
  expired?: boolean;
}) {
  const span = max - min || 1;
  const pos = (v: number) => Math.min(100, Math.max(0, ((v - min) / span) * 100));
  const medPos = median != null ? pos(median) : null;
  const myPos = pos(mine);
  return (
    <div className="space-y-1.5">
      <div className="relative h-2 rounded-full bg-secondary">
        <div className="absolute inset-y-0 left-0 rounded-full bg-primary/20" style={{ width: `${medPos ?? 50}%` }} />
        {medPos != null && (
          <span
            className="absolute top-1/2 h-3 w-1 -translate-y-1/2 -translate-x-1/2 rounded-sm bg-primary"
            style={{ left: `${medPos}%` }}
            title="میانهٔ بازار"
          />
        )}
        <span
          className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-background ${
            expired ? 'bg-amber-500' : 'bg-primary'
          }`}
          style={{ left: `${myPos}%` }}
          title="قیمت این آگهی"
        />
      </div>
      {/* برچسب‌ها با محور هم‌جهت: کف چپ، سقف راست (row-reverse در RTL) */}
      <div className="flex flex-row-reverse items-center justify-between text-[10px] text-muted-foreground">
        <span className="font-num">کف {toFa(min)}</span>
        {medPos != null && <span className="font-num">میانه {toFa(median!)}</span>}
        <span className="font-num">سقف {toFa(max)}</span>
      </div>
    </div>
  );
}

// ─── سیگنال مشاور خرید ────────────────────────────────────────────────────

export function SignalChip({ signal, devPct }: { signal: 'buy' | 'wait' | null; devPct: number | null }) {
  if (!signal) return <span className="text-[10px] text-muted-foreground/60">—</span>;
  const buy = signal === 'buy';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        buy ? 'bg-emerald-600/10 text-emerald-700' : 'bg-amber-600/10 text-amber-700'
      }`}
    >
      {buy ? 'زیر میانگین — زمان خرید' : 'بالای میانگین — صبر کن'}
      {devPct != null && <span className="font-num">({toFa(Math.abs(devPct))}٪)</span>}
    </span>
  );
}

// ─── کارت قفل فریمیوم — شمار ردیف‌های بسته + CTA ───────────────────────────

export function LockedTeaser({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed bg-card/60 p-4 sm:p-5">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-muted-foreground">
        <Lock size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">
          {toFa(count)} {label}
        </p>
        <Button asChild size="sm" className="mt-3 rounded-md">
          <Link href="/panel/pricing">بازگشایی کامل گزارشات</Link>
        </Button>
      </div>
    </div>
  );
}

// ─── اسکلتون ردیف‌ها ──────────────────────────────────────────────────────

export function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
