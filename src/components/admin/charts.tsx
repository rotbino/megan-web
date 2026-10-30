'use client';

/**
 * نمودارهای سبک SVG (فاز A5) — بدون هیچ کتابخانه نموداری:
 *  • TrendAreaChart — روند چندسریه (ثبت‌نام/آگهی/درخواست) با ناحیه گرادیانی
 *  • RevenueBarsChart — ستون‌های انباشته درآمد روزانه (نردبان/شارژ)
 *
 * نکات طراحی:
 *  • viewBox ثابت + w-full h-auto → مقیاس متناسب بدون له‌شدن متن
 *  • vector-effect="non-scaling-stroke" → خط‌ها در هر مقیاس شارپ
 *  • تاریخ‌ها شمسی کوتاه؛ اعداد فارسی؛ رنگ‌ها از پالت تامینان
 */

import { toFa } from '@/lib/format';

/** تاریخ کوتاه شمسی: ۲۶ مهر */
function shortDateFa(iso: string): string {
  return new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' }).format(new Date(iso));
}

/** مسیر نرم (Catmull-Rom → بزیه) — نقاط [x, y] */
function smoothPath(points: Array<[number, number]>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

export interface ChartSeries {
  key: string;
  label: string;
  color: string; // hex یا var(--…)
  values: number[];
}

/** روند چندسریه — خط نرم + ناحیه سری اول (اصلی) */
export function TrendAreaChart({
  dates,
  series,
  height = 210,
}: {
  dates: string[];
  series: ChartSeries[];
  height?: number;
}) {
  const W = 720;
  const H = height;
  const PAD = { top: 18, right: 14, bottom: 30, left: 40 };
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const n = dates.length || 1;

  const maxVal = Math.max(1, ...series.flatMap((s) => s.values));
  const yMax = niceCeil(maxVal);
  const x = (i: number) => PAD.left + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => PAD.top + ih - (v / yMax) * ih;

  const primary = series[0];
  const areaPath =
    primary && primary.values.length
      ? `${smoothPath(primary.values.map((v, i) => [x(i), y(v)]))} L ${x(n - 1)} ${PAD.top + ih} L ${x(0)} ${PAD.top + ih} Z`
      : '';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="نمودار روند ۳۰ روزه">
      {/* خطوط شبکه افقی + برچسب محور y */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const gy = PAD.top + ih - t * ih;
        const label = Math.round(yMax * t);
        return (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={gy}
              y2={gy}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray={t === 0 ? undefined : '3 5'}
              vectorEffect="non-scaling-stroke"
            />
            <text x={PAD.left - 6} y={gy + 3.5} textAnchor="end" fontSize={9.5} fill="var(--muted-foreground)">
              {toFa(label)}
            </text>
          </g>
        );
      })}

      {/* برچسب‌های تاریخ — ابتدا/وسط/انتها */}
      {[0, Math.floor((n - 1) / 2), n - 1].map((i, idx, arr) => (
        <text
          key={i}
          x={x(i)}
          y={H - 8}
          textAnchor={idx === 0 ? 'start' : idx === arr.length - 1 ? 'end' : 'middle'}
          fontSize={9.5}
          fill="var(--muted-foreground)"
        >
          {shortDateFa(dates[i] ?? '')}
        </text>
      ))}

      {/* ناحیه سری اصلی */}
      {areaPath && (
        <>
          <defs>
            <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primary.color} stopOpacity={0.16} />
              <stop offset="100%" stopColor={primary.color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#trend-area)" />
        </>
      )}

      {/* خطوط همه سری‌ها */}
      {series.map((s) => (
        <path
          key={s.key}
          d={smoothPath(s.values.map((v, i) => [x(i), y(v)]))}
          fill="none"
          stroke={s.color}
          strokeWidth={2}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        >
          <title>{s.label}</title>
        </path>
      ))}

      {/* نقطه آخر سری اصلی + مقدارش */}
      {primary && primary.values.length > 0 && (
        <g>
          <circle cx={x(n - 1)} cy={y(primary.values[n - 1])} r={3.5} fill={primary.color} />
          <text
            x={x(n - 1)}
            y={y(primary.values[n - 1]) - 8}
            textAnchor="end"
            fontSize={10}
            fontWeight={700}
            fill={primary.color}
          >
            {toFa(primary.values[n - 1])}
          </text>
        </g>
      )}
    </svg>
  );
}

/** درآمد روزانه — ستون‌های انباشته دو جزء (نردبان + شارژ) */
export function RevenueBarsChart({
  dates,
  parts,
  height = 210,
}: {
  dates: string[];
  parts: Array<{ key: string; label: string; color: string; values: number[] }>;
  height?: number;
}) {
  const W = 720;
  const H = height;
  const PAD = { top: 18, right: 14, bottom: 30, left: 52 };
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const n = dates.length || 1;
  const bw = Math.max(3, (iw / n) * 0.62);

  const totals = dates.map((_, i) => parts.reduce((s, p) => s + (p.values[i] ?? 0), 0));
  const maxVal = Math.max(1, ...totals);
  const yMax = niceCeil(maxVal);
  const x = (i: number) => PAD.left + (iw / n) * (i + 0.5);
  const y = (v: number) => PAD.top + ih - (v / yMax) * ih;

  const fmtShort = (v: number) => (v >= 1_000_000 ? `${toFa(+(v / 1_000_000).toFixed(1))}M` : v >= 1000 ? `${toFa(Math.round(v / 1000))}k` : toFa(v));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="نمودار درآمد ۳۰ روزه">
      {[0, 0.5, 1].map((t) => {
        const gy = PAD.top + ih - t * ih;
        return (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={gy}
              y2={gy}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray={t === 0 ? undefined : '3 5'}
              vectorEffect="non-scaling-stroke"
            />
            <text x={PAD.left - 6} y={gy + 3.5} textAnchor="end" fontSize={9.5} fill="var(--muted-foreground)">
              {fmtShort(Math.round(yMax * t))}
            </text>
          </g>
        );
      })}

      {[0, Math.floor((n - 1) / 2), n - 1].map((i, idx, arr) => (
        <text
          key={i}
          x={x(i)}
          y={H - 8}
          textAnchor={idx === 0 ? 'start' : idx === arr.length - 1 ? 'end' : 'middle'}
          fontSize={9.5}
          fill="var(--muted-foreground)"
        >
          {shortDateFa(dates[i] ?? '')}
        </text>
      ))}

      {/* ستون انباشته — از پایین: شارژ زیر، نردبان رو */}
      {dates.map((date, i) => {
        const total = totals[i];
        let acc = 0;
        const segs = parts.map((p) => {
          const v = p.values[i] ?? 0;
          const y1 = y(acc);
          acc += v;
          const y2 = y(acc);
          return { key: p.key, color: p.color, v, y1, y2 };
        });
        return (
          <g key={date}>
            {segs
              .filter((s) => s.v > 0)
              .map((s) => (
                <rect
                  key={s.key}
                  x={x(i) - bw / 2}
                  y={s.y2}
                  width={bw}
                  height={Math.max(0, s.y1 - s.y2)}
                  rx={1.5}
                  fill={s.color}
                  opacity={0.85}
                >
                  <title>{`${shortDateFa(date)} — ${parts.map((p) => `${p.label}: ${toFa(p.values[i] ?? 0)}`).join(' | ')}`}</title>
                </rect>
              ))}
            {total === 0 && (
              <rect x={x(i) - bw / 2} y={PAD.top + ih - 2} width={bw} height={2} rx={1} fill="var(--border)" opacity={0.6}>
                <title>{`${shortDateFa(date)} — بدون درآمد`}</title>
              </rect>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** سقف خوش‌خوان برای محور y — ۱/۲/۵ × ۱۰^k */
function niceCeil(v: number): number {
  if (v <= 5) return 5;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * exp;
}
