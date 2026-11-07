'use client';

/**
 * سنجهٔ «میزان تکمیل پروفایل» — نمای خلوت (خواسته مالک ۲-۱۱ دور ۱۶:
 * «خیلی شلوغ طراحی شده… یه دایره درصدی باشه که وقتی روش زده میشه درصدها
 * نمایش داده بشه»):
 *  • نمای اولیه: فقط یک دایرهٔ درصدی فشرده + برچسب کیفیت + پیکان باز شدن.
 *  • با کلیک: ریز بخش‌ها باز می‌شوند — تیک/دایرهٔ خالی + نام بخش + درصد +
 *    راهنمای «چه چیزی مانده» (شفاف‌سازی ریشهٔ باگ ۴۷٪ — آستانه‌ها حالا
 *    دیده می‌شوند).
 * داده از computeProfileCompletion می‌آید (lib/profile-completion — مشترک
 * بین ویو و ویرایش تا هر دو صفحه همیشه یک عدد بدهند).
 */

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CompletionSection } from '@/lib/profile-completion';

/** دایرهٔ درصدی — کمانِ رنگی روی ریل خنثی + عدد فارسی در مرکز */
function Ring({ pct, size = 56 }: { pct: number; size?: number }) {
  const stroke = 5.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
  const tone = pct >= 85 ? 'text-emerald-500' : pct >= 55 ? 'text-amber-500' : 'text-red-400';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${toFa(pct)} درصد`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-secondary" />
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
        className={cn(tone, 'transition-[stroke-dashoffset] duration-700')}
      />
      <text
        x="50%"
        y="52%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-foreground font-num"
        style={{ fontSize: size * 0.3, fontWeight: 800 }}
      >
        {toFa(pct)}٪
      </text>
    </svg>
  );
}

export function CompletionMeter({
  pct,
  quality,
  sections,
  className,
}: {
  pct: number;
  quality: 'عالی' | 'متوسط' | 'ضعیف';
  sections: CompletionSection[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const tone = quality === 'عالی' ? 'text-emerald-600' : quality === 'متوسط' ? 'text-amber-600' : 'text-red-500';

  return (
    <div className={cn('rounded-md bg-secondary/70', className)}>
      {/* نمای اولیه — دایره + برچسب + پیکان؛ کل ردیف کلیک‌پذیر */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 p-3 text-start"
      >
        <Ring pct={pct} />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold">میزان تکمیل پروفایل</span>
          <span className={cn('mt-0.5 block text-[13px] font-extrabold', tone)}>{quality}</span>
        </span>
        <ChevronDown
          size={17}
          className={cn('shrink-0 text-muted-foreground/60 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {/* ریز بخش‌ها — فقط با کلیک باز می‌شوند (نمای اولیه خلوت می‌ماند) */}
      {open && (
        <ul className="space-y-1.5 border-t border-border/70 p-3">
          {sections.map((s) => (
            <li key={s.label} className="flex items-center gap-2.5 text-xs">
              {/* تیک سبز داخل دایره / دایرهٔ خالی */}
              <span
                aria-hidden
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full border',
                  s.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border bg-card',
                )}
              >
                {s.done && <Check size={12} strokeWidth={3} />}
              </span>
              <span className={cn('flex-1', s.done ? 'text-foreground' : 'text-muted-foreground')}>
                {s.label}
                {!s.done && s.hint && <span className="ms-1.5 text-[10px] text-muted-foreground/70">({s.hint})</span>}
              </span>
              <span className={cn('shrink-0 font-num font-bold', s.done ? 'text-emerald-600' : 'text-muted-foreground/70')}>
                {toFa(s.pct)}٪
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
