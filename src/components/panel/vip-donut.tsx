'use client';

/**
 * نمودار دایره‌ای روزهای باقی‌ماندهٔ اعتبار ویژه (خواسته مالک ۳۱-۱۰؛ برگشت
 * دور ۱۵ «چرا دایره روزهای باقی مانده رو برداشتی؟»):
 * کل دایره = کل روزهای دورهٔ بسته؛ کمان قرمز = روزهای باقی‌مانده.
 * مشترک بین داشبورد پنل و صفحهٔ بسته‌های اشتراک (۸-۱۱).
 */
import { toFa } from '@/lib/format';

export function VipDonut({ daysLeft, totalDays, size = 76 }: { daysLeft: number; totalDays: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = totalDays > 0 ? Math.min(1, Math.max(0, daysLeft / totalDays)) : 0;
  const offset = c * (1 - ratio);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`اعتبار ویژه: ${toFa(daysLeft)} روز از ${toFa(totalDays)} روز باقی مانده`}
      className="shrink-0"
    >
      {/* مسیر کم‌رنگ = کل دوره */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-red-100" />
      {/* کمان قرمز = روزهای باقی‌مانده */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="text-red-600 transition-[stroke-dashoffset] duration-700"
      />
      {/* شمارندهٔ مرکز */}
      <text
        x="50%"
        y="47%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-foreground font-num"
        style={{ fontSize: size * 0.27, fontWeight: 800 }}
      >
        {toFa(daysLeft)}
      </text>
      <text
        x="50%"
        y="67%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-muted-foreground"
        style={{ fontSize: size * 0.13, fontWeight: 700 }}
      >
        روز مانده
      </text>
    </svg>
  );
}
