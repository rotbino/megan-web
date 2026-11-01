'use client';

/**
 * کارت «ظاهر ایمچ» — روی صفحه پروفایل پنل، جلوی چشم (خواسته مالک ۱-۱۱):
 * ۱) تغییر تم روشن/تیره — کل سایت، همان لحظه، ماندگار (localStorage)
 * ۲) رنگ برند: ۱۶ رنگ آمادهٔ کاملاً متفاوت (از رنگی تا خنثی) + انتخاب
 *    رنگ دلخواه با color picker بومی مرورگر
 * انتخاب‌ها از طریق توکن‌های CSS روی <html> اعمال می‌شوند (lib/theme).
 */

import { useRef } from 'react';
import { Moon, Palette, Pipette, RotateCcw, Sun } from 'lucide-react';
import { PanelCard } from '@/components/panel/panel-parts';
import { useTheme } from '@/hooks/use-theme';
import {
  ACCENT_OPTIONS,
  DEFAULT_ACCENT,
  accentHex,
} from '@/lib/theme';
import { cn } from '@/lib/utils';

export function AppearanceCard() {
  const { mode, accent, custom, setMode, setAccent } = useTheme();
  const colorRef = useRef<HTMLInputElement>(null);
  // مقدار اولیهٔ picker — اگر رنگ دلخواه فعال است خودش، وگرنه هم‌رنگ فعلی
  const pickerValue = custom ? accentHex(accent) : '#4c7dd0';

  return (
    <PanelCard>
      <h2 className="flex items-center gap-2 text-sm font-extrabold">
        <Palette size={17} className="text-primary" /> ظاهر ایمچ
      </h2>
      <p className="mt-1 text-xs leading-6 text-muted-foreground">
        حالت نمایش و رنگ ایمچ را به سلیقهٔ خودتان انتخاب کنید — روی همهٔ صفحات اعمال و برای مراجعه‌های بعدی ذخیره می‌شود.
      </p>

      {/* ۱) تم روشن/تیره — کلید دوحالته */}
      <div
        className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-secondary/70 p-1"
        role="radiogroup"
        aria-label="حالت نمایش"
      >
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'light'}
          onClick={() => setMode('light')}
          className={cn(
            'flex h-10 items-center justify-center gap-2 rounded-md text-xs font-bold transition-colors',
            mode === 'light'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Sun size={16} /> روشن
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'dark'}
          onClick={() => setMode('dark')}
          className={cn(
            'flex h-10 items-center justify-center gap-2 rounded-md text-xs font-bold transition-colors',
            mode === 'dark'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Moon size={16} /> تیره
        </button>
      </div>

      {/* ۲) رنگ برند — ۱۶ رنگ آماده + دلخواه */}
      <p className="mt-5 text-xs font-bold">رنگ ایمچ</p>
      <div className="mt-2 grid grid-cols-8 gap-2" role="radiogroup" aria-label="رنگ ایمچ">
        {ACCENT_OPTIONS.map((opt) => {
          const selected = accent === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={selected}
              title={opt.name === DEFAULT_ACCENT ? `${opt.name} (پیش‌فرض)` : opt.name}
              aria-label={opt.name === DEFAULT_ACCENT ? `${opt.name} (پیش‌فرض)` : opt.name}
              onClick={() => setAccent(opt.key)}
              className={cn(
                'relative aspect-square cursor-pointer rounded-full outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring',
                selected && 'ring-2 ring-primary ring-offset-2 ring-offset-card',
              )}
              style={{ backgroundColor: opt.hex }}
            >
              {selected && (
                <span className="absolute inset-0 grid place-items-center text-white mix-blend-difference">
                  {/* چک مارک خالص سفید — با blend روی هر رنگی خوانا می‌ماند */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
        {/* رنگ دلخواه — کاشی گرادیانی با انتخاب‌گر رنگ بومی */}
        <button
          type="button"
          role="radio"
          aria-checked={custom}
          aria-label="رنگ دلخواه"
          title="رنگ دلخواه"
          onClick={() => colorRef.current?.click()}
          className={cn(
            'relative aspect-square cursor-pointer overflow-hidden rounded-full outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring',
            custom && 'ring-2 ring-primary ring-offset-2 ring-offset-card',
          )}
          style={{
            background: custom
              ? accentHex(accent)
              : 'conic-gradient(from 220deg, #e05c5c, #d97a16, #c29a17, #17976b, #12879b, #4c7dd0, #7a5bd1, #c2417c, #e05c5c)',
          }}
        >
          {!custom && (
            <span className="absolute inset-0 grid place-items-center bg-black/35 text-white">
              <Pipette size={14} />
            </span>
          )}
          {custom && (
            <span className="absolute inset-0 grid place-items-center text-white mix-blend-difference">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
          {/* input رنگ بومی روی کل کاشی — کلیک = پالت سیستم */}
          <input
            ref={colorRef}
            type="color"
            value={pickerValue}
            onChange={(e) => setAccent(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            tabIndex={-1}
            aria-hidden
          />
        </button>
      </div>

      {/* وضعیت رنگ دلخواه فعال */}
      {custom && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-secondary/60 px-3 py-2 text-xs">
          <span className="flex items-center gap-2 text-muted-foreground">
            رنگ دلخواه شما:
            <span dir="ltr" className="font-mono font-bold text-foreground">{accentHex(accent)}</span>
          </span>
          <button
            type="button"
            onClick={() => setAccent(DEFAULT_ACCENT)}
            className="flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 font-bold text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw size={13} /> بازگشت به آبی پیش‌فرض
          </button>
        </div>
      )}
    </PanelCard>
  );
}
