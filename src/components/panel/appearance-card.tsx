'use client';

/**
 * کارت «ظاهر ایمچ» — روی صفحه پروفایل پنل (دور ۱۶ — نمای اولیه خلوت):
 * ۱) حالت نمایش روشن/تیره — کلید دوحالته، همیشه نمایان.
 * ۲) رنگ ایمچ: در نمای اولیه فقط «نام رنگ فعلی + سواچ» دیده می‌شود (خواستهٔ
 *    مالک: «بخش ظاهر شلوغ دیده میشه… حداقل نمای اولیه خلوتر باشه») — با
 *    کلیک، نوار خانواده‌ها + سواچ‌ها باز می‌شوند (الگوی چیدانه) + رنگ دلخواه.
 *    نوار خانواده‌ها flex-wrap است تا در دسکتاپ قیچی نشود (باگ دور ۱۶:
 *    «نوار رنگها اسکرول نمی‌خوره — بعد از قهوه‌ای دیده نمیشد»).
 * سواچ‌ها هدف لمسی ≥ ۴۴px می‌مانند (قانون تناسب §۱).
 * انتخاب‌ها از طریق توکن‌های CSS روی <html> اعمال می‌شوند (lib/theme).
 */

import { useRef, useState } from 'react';
import { Check, ChevronDown, Contrast, Moon, Palette, Pipette, RotateCcw, Sun } from 'lucide-react';
import { PanelCard } from '@/components/panel/panel-parts';
import { useTheme } from '@/hooks/use-theme';
import {
  ACCENT_FAMILIES,
  ACCENT_OPTIONS,
  DEFAULT_ACCENT,
  accentHex,
  type AccentFamilyKey,
} from '@/lib/theme';
import { cn } from '@/lib/utils';

/** آیکون تیک خالص سفید — با blend روی هر رنگی خوانا می‌ماند */
function SwatchCheck() {
  return (
    <span className="absolute inset-0 grid place-items-center text-white mix-blend-difference">
      <Check size={15} strokeWidth={2.8} aria-hidden />
    </span>
  );
}

export function AppearanceCard() {
  const { mode, accent, custom, setMode, setAccent } = useTheme();
  const colorRef = useRef<HTMLInputElement>(null);
  // مقدار اولیهٔ picker — اگر رنگ دلخواه فعال است خودش، وگرنه هم‌رنگ فعلی
  const pickerValue = custom ? accentHex(accent) : '#4c7dd0';

  // خانوادهٔ نمایش‌داده‌شده — با تغییر بیرونی accent (تب دیگر) خودش دنبال می‌کند
  const accentFamily = custom
    ? null
    : (ACCENT_OPTIONS.find((o) => o.key === accent)?.family ?? 'آبی');
  const [familyOverride, setFamilyOverride] = useState<AccentFamilyKey | null>(null);
  const shownFamily = familyOverride ?? accentFamily ?? 'آبی';
  const familyColors = ACCENT_OPTIONS.filter((o) => o.family === shownFamily);
  const customTab = custom && familyOverride === null;

  // نام کوتاه برای سواچ — پیشوند خانواده حذف می‌شود («آبی نفتی» → «نفتی»)
  const shortName = (name: string) =>
    name.startsWith(`${shownFamily} `) ? name.slice(shownFamily.length + 1) : name;

  /** نام رنگ فعلی برای سطر جمع‌شدهٔ «رنگ ایمچ» */
  const currentColorName = custom
    ? `دلخواه (${accentHex(accent)})`
    : (ACCENT_OPTIONS.find((o) => o.key === accent)?.name ?? DEFAULT_ACCENT);
  const currentColorHex = accentHex(accent);

  // نمای اولیه جمع است — فقط با کلیک کاربر باز می‌شود (خلوت‌تر)
  const [colorOpen, setColorOpen] = useState(false);

  return (
    <PanelCard>
      <h2 className="flex items-center gap-2 text-sm font-extrabold">
        <Palette size={17} className="text-primary" /> ظاهر ایمچ
      </h2>
      <p className="mt-1 text-xs leading-6 text-muted-foreground">
        حالت نمایش (روشن، تیره یا روشن تک‌رنگ) و رنگ ایمچ را به سلیقهٔ خودتان انتخاب کنید — روی همهٔ صفحات اعمال و ذخیره می‌شود.
      </p>

      {/* ۱) حالت نمایش — سه گزینه (خواستهٔ مالک ۲-۱۱): روشن / تیره /
          روشن تک‌رنگ (دوقلوی روشنِ تم تیره — سفید و خاکستری خالص با
          خط‌های مویی؛ رنگ ایمچ کاربر مثل قبل رویش می‌نشیند) */}
      <div
        className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-secondary/70 p-1"
        role="radiogroup"
        aria-label="حالت نمایش"
      >
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'light'}
          onClick={() => setMode('light')}
          className={cn(
            'flex h-10 items-center justify-center gap-1.5 rounded-md text-[11px] font-bold transition-colors',
            mode === 'light'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Sun size={15} /> روشن
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'dark'}
          onClick={() => setMode('dark')}
          className={cn(
            'flex h-10 items-center justify-center gap-1.5 rounded-md text-[11px] font-bold transition-colors',
            mode === 'dark'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Moon size={15} /> تیره
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'mono'}
          onClick={() => setMode('mono')}
          title="تم روشن تک‌رنگ — سفید و خاکستری خالص با خط‌های مویی و سایه‌های ظریف؛ رنگ ایمچ شما روی همین بوم خنثی می‌نشیند"
          className={cn(
            'flex h-10 items-center justify-center gap-1.5 rounded-md text-[11px] font-bold transition-colors',
            mode === 'mono'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Contrast size={15} /> روشن تک‌رنگ
        </button>
      </div>

      {/* ۲) رنگ ایمچ — سطر جمع‌شدهٔ وضعیت فعلی؛ ریز سواچ‌ها با کلیک باز می‌شوند */}
      <button
        type="button"
        onClick={() => setColorOpen((v) => !v)}
        aria-expanded={colorOpen}
        className="mt-3 flex w-full cursor-pointer items-center gap-2.5 rounded-md bg-secondary/70 p-2.5 text-start transition-colors hover:bg-secondary"
      >
        <span
          className="size-5 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
          style={{ backgroundColor: currentColorHex }}
          aria-hidden
        />
        <span className="min-w-0 flex-1 text-xs">
          <span className="text-muted-foreground">رنگ ایمچ: </span>
          <span dir="auto" className="font-bold">{currentColorName}</span>
        </span>
        <ChevronDown
          size={16}
          className={cn('shrink-0 text-muted-foreground/60 transition-transform', colorOpen && 'rotate-180')}
          aria-hidden
        />
      </button>

      {colorOpen && (
        <>
          {/* نوار خانواده‌ها — flex-wrap تا در دسکتاپ قیچی نشود (باگ دور ۱۶) */}
          <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="خانوادهٔ رنگ">
            {ACCENT_FAMILIES.map((f) => {
              const active = !customTab && shownFamily === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFamilyOverride(f.key)}
                  className={cn(
                    'flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition-colors',
                    active
                      ? 'border-primary-line bg-primary-soft text-primary-deep'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span
                    className="size-3.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                    style={{ backgroundColor: f.hex }}
                    aria-hidden
                  />
                  {f.key}
                </button>
              );
            })}
            {/* رنگ دلخواه — چیپ قطره‌چکان با پالت بومی مرورگر */}
            <button
              type="button"
              role="tab"
              aria-selected={customTab}
              onClick={() => colorRef.current?.click()}
              className={cn(
                'relative flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition-colors',
                customTab
                  ? 'border-primary-line bg-primary-soft text-primary-deep'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              <span
                className="grid size-3.5 shrink-0 place-items-center rounded-full text-white"
                style={{
                  background: customTab
                    ? accentHex(accent)
                    : 'conic-gradient(from 220deg, #e05c5c, #d97a16, #c29a17, #17976b, #12879b, #4c7dd0, #7a5bd1, #c2417c, #e05c5c)',
                }}
                aria-hidden
              >
                <Pipette size={9} className={customTab ? 'mix-blend-difference' : 'opacity-90'} />
              </span>
              دلخواه
              {/* input رنگ بومی نامرئی — با کلیک چیپ به‌صورت برنامه‌ای باز می‌شود */}
              <input
                ref={colorRef}
                type="color"
                value={pickerValue}
                onChange={(e) => {
                  setAccent(e.target.value);
                  setFamilyOverride(null); // رنگ دلخواه = نمایش وضعیت دلخواه
                }}
                className="pointer-events-none absolute left-1/2 h-0 w-0 -translate-x-1/2 opacity-0"
                tabIndex={-1}
                aria-hidden
              />
            </button>
          </div>

          {/* کادر رنگ‌های معروفِ خانوادهٔ فعال — با نام (الگوی چیدانه) */}
          {customTab ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-secondary/60 px-3 py-2.5 text-xs">
              <span className="flex items-center gap-2 text-muted-foreground">
                رنگ دلخواه شما:
                <span dir="ltr" className="font-mono font-bold text-foreground">{accentHex(accent)}</span>
              </span>
              <button
                type="button"
                onClick={() => setAccent(DEFAULT_ACCENT)}
                className="flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 font-bold text-muted-foreground transition-colors hover:text-foreground"
              >
                <RotateCcw size={13} /> بازگشت به نقره‌ای پیش‌فرض
              </button>
            </div>
          ) : (
            <div
              className="mt-3 grid grid-cols-4 gap-x-1 gap-y-2 sm:grid-cols-5 lg:grid-cols-6"
              role="radiogroup"
              aria-label={`رنگ‌های خانوادهٔ ${shownFamily}`}
            >
              {familyColors.map((opt) => {
                const selected = accent === opt.key;
                const isDefault = opt.key === DEFAULT_ACCENT;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    title={isDefault ? `${opt.name} (پیش‌فرض)` : opt.name}
                    aria-label={isDefault ? `${opt.name} (پیش‌فرض)` : opt.name}
                    onClick={() => {
                      setAccent(opt.key);
                      setFamilyOverride(null); // انتخاب = خانوادهٔ خود رنگ دنبال شود
                    }}
                    className={cn(
                      'group flex cursor-pointer flex-col items-center gap-1.5 rounded-md p-1.5 outline-none transition-colors hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring',
                      selected && 'bg-primary-soft',
                    )}
                  >
                    <span
                      className={cn(
                        'relative grid size-9 place-items-center rounded-full ring-1 ring-inset ring-black/10 transition-transform group-hover:scale-110',
                        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-card',
                      )}
                      style={{ backgroundColor: opt.hex }}
                    >
                      {selected && <SwatchCheck />}
                    </span>
                    <span
                      className={cn(
                        'max-w-full truncate text-[10px] leading-4 font-medium text-muted-foreground transition-colors group-hover:text-foreground',
                        selected && 'font-bold text-primary-deep',
                      )}
                    >
                      {shortName(opt.name)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </PanelCard>
  );
}
