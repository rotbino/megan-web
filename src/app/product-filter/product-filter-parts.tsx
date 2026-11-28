'use client';

/**
 * اجزای صفحهٔ فیلتر پیشرفتهٔ عمده (/product-filter) — بازطراحی «دیواری»
 * (بازخورد مالک ۲۸-۱۱ دور ۲):
 *
 *  • همهٔ فیلترها در «یک نوار افقی» بالای لیست — چه عمومی (شهر/قیمت/حجم/
 *    مرتب‌سازی) چه تخصصی (ویژگی هر دسته) — بدون نام‌گذاری «فیلترهای عمومی»؛
 *    دسکتاپ: پاپ‌آور، موبایل: شیت پایین‌رونده (الگوی دیوار)؛
 *  • سایدبار فقط دسته‌بندی — دریل‌شونده مثل product-list: انتخاب یک گروه =
 *    ورود به محیط تخصصی همان گروه و حذف بقیهٔ گروه‌ها از صحنه؛ با اسکرول
 *    مستقل تا لیست بلنگ گروه‌ها فیلترها را پایین نیندازد؛
 *  • لیست = اسکرول بی‌نهایت + پیش‌واکش ۲ صفحه جلوتر + دکمهٔ «مشاهده آگهی‌های
 *    بیشتر» با href واقعی برای گوگل (عین product-list).
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ImageOff,
  Layers,
  MapPin,
  Package,
  Store,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { priceFa, stockFa, timeAgoFa, toFa } from '@/lib/format';
import { useAuth } from '@/lib/mock/auth';
import { getCities } from '@/lib/mock/api';
import { chainOf, PAYMENT_OPTIONS, SELLER_TYPE_OPTIONS } from '@/lib/catalog-v2';
import type { City, Province } from '@/lib/types';
import type { CatalogV2Attr, CatalogV2AttrOption, CatalogV2Row, CatalogV2Sort, CatalogV2TreeNode } from '@/lib/catalog-v2';

// ─── ثابت‌ها و ابزارهای نمایش ────────────────────────────────────────────────

export const PER_PAGE = 24;

/** مرتبط‌ترین (پیش‌فرض) = امتیاز تطابق سمت سرور؛ امتیاز خودش هرگز نمایش نمی‌یابد */
export const SORTS: { key: CatalogV2Sort; label: string }[] = [
  { key: 'related', label: 'مرتبط‌ترین' },
  { key: 'newest', label: 'جدیدترین' },
  { key: 'price-asc', label: 'ارزان‌ترین' },
  { key: 'price-desc', label: 'گران‌ترین' },
  { key: 'moq-asc', label: 'کمترین حداقل خرید' },
  { key: 'stock-desc', label: 'بیشترین موجودی' },
];

export const ROOT_ICONS: Record<string, typeof Layers> = {
  sprout: Layers,
  beef: Package,
  utensils: Package,
  shovel: Package,
  cog: Package,
  wrench: Package,
  package: Package,
  'brick-wall': Package,
  anvil: Package,
  flask: Package,
  truck: Package,
  shirt: Package,
  sofa: Package,
  'heart-pulse': Package,
  trophy: Package,
};

/** حالت فیلترها (بدون صفحه — لیست اسکرول بی‌نهایت است) */
export interface FilterState {
  nodeKey: string;
  provinceId?: number;
  cityId?: number;
  attrs: Record<string, string[]>;
  priceMin?: number;
  priceMax?: number;
  moqMin?: number;
  moqMax?: number;
  /** (۲۸-۱۱ دور ۵) شرایط معاملهٔ عمده */
  sellerTypes: string[];
  payments: string[];
  analysisOnly: boolean;
  shippingOnly: boolean;
  sort: CatalogV2Sort;
}

/** تبدیل ارقام فارسی/عربی ورودی عددی به عدد */
export function parseNum(v: string): number | undefined {
  const fa = v.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^\d]/g, '');
  if (!fa) return undefined;
  const n = parseInt(fa, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** واحد کوتاه برای برچسب‌ها — «کیلوگرم ← کیلو» */
export function unitShort(unit: string | undefined): string {
  if (!unit) return '';
  if (unit.includes('کیلوگرم')) return 'کیلو';
  if (unit === 'متر مربع') return 'متر';
  return unit;
}

/** چیپ‌های سریع «حجم خرید» — آستانه‌های معنادارِ هر واحد */
export function moqPresets(unit: string | undefined): { label: string; min?: number; max?: number }[] {
  if (!unit) return [];
  if (unit.includes('کیلوگرم')) {
    return [
      { label: 'تا ۱۰۰ کیلو', max: 100 },
      { label: 'تا ۱ تن', max: 1000 },
      { label: 'از ۱ تن', min: 1000 },
      { label: 'از ۱۰ تن', min: 10000 },
    ];
  }
  if (unit === 'کارتن') {
    return [
      { label: 'تا ۵ کارتن', max: 5 },
      { label: 'تا ۲۵ کارتن', max: 25 },
      { label: 'از ۵۰ کارتن', min: 50 },
      { label: 'از ۱۰۰ کارتن', min: 100 },
    ];
  }
  if (unit === 'بسته') {
    return [
      { label: 'تا ۱۰ بسته', max: 10 },
      { label: 'تا ۱۰۰ بسته', max: 100 },
      { label: 'از ۵۰۰ بسته', min: 500 },
    ];
  }
  return [
    { label: 'تا ۱۰', max: 10 },
    { label: 'تا ۱۰۰', max: 100 },
    { label: 'تا ۱۰۰۰', max: 1000 },
    { label: 'از ۱۰۰۰', min: 1000 },
  ];
}

// ─── چیپ دونمایی — دکمهٔ یکسان، دسکتاپ: پاپ‌آور، موبایل: شیت (الگوی دیوار) ───

/**
 * یک فیلتر در نوار افقی: یک دکمه با ظاهر یکسان در هر دو نما؛ روی دسکتاپ
 * پاپ‌آور باز می‌شود و روی موبایل شیتِ پایین‌رونده. محتوای هر دو از
 * render-prop می‌آید و هر کدام «close» خودش را می‌گیرد تا بعد از انتخاب
 * بسته شود (مثل سورت که با کلیک باید بسته شود).
 */
export function DualChip({
  label,
  value,
  active,
  icon: Icon,
  panel,
  sheet,
  popClass,
  mobileOnly,
  fixedSheet,
}: {
  label: string;
  value?: string;
  active?: boolean;
  icon?: typeof MapPin;
  /** محتوای پاپ‌اور دسکتاپ — (close) => ReactNode */
  panel?: (close: () => void) => ReactNode;
  /** بدنهٔ کامل شیت موبایل (با SheetHeader خودش) — (close) => ReactNode */
  sheet: (close: () => void) => ReactNode;
  popClass?: string;
  /** فقط موبایل (دسته‌بندی — دسکتاپ سایدبار دارد) */
  mobileOnly?: boolean;
  /** شیت موبایل ارتفاع ثابت ~۷۰٪ صفحه بگیرد (دریل‌های چندسطحی) — انتخاب/بازگشت
   *  هیچ پرشی در ارتفاع نمی‌سازد و محتوا اسکرول عمودی مستقل می‌گیرد (خواستهٔ مالک ۲۸-۱۱ دور ۳) */
  fixedSheet?: boolean;
}) {
  const [popOpen, setPopOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const open = popOpen || sheetOpen;

  const btn = (
    <button
      type="button"
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border bg-card px-3 text-[12px] font-bold text-foreground/85 transition-colors',
        active ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-secondary/60',
      )}
      aria-expanded={open}
    >
      {Icon && <Icon size={13} className="shrink-0" />}
      <span className={cn('truncate', value && 'max-w-44')}>
        {value ? `${label}: ${value}` : label}
      </span>
      <ChevronDown size={12} className={cn('shrink-0 opacity-60 transition-transform', open && 'rotate-180')} />
    </button>
  );

  return (
    <>
      {!mobileOnly && (
        <div className="hidden shrink-0 lg:block">
          <Popover open={popOpen} onOpenChange={setPopOpen}>
            <PopoverTrigger asChild>{btn}</PopoverTrigger>
            <PopoverContent align="start" sideOffset={6} className={cn('w-72 p-0', popClass)}>
              {panel?.(() => setPopOpen(false))}
            </PopoverContent>
          </Popover>
        </div>
      )}
      <div className="shrink-0 lg:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>{btn}</SheetTrigger>
          {/* ارتفاع ثابت ۷۰٪ برای دریل‌ها — بدون پرش؛ محتوای داخل خودش overflow دارد */}
          <SheetContent
            side="bottom"
            className={cn(
              'gap-0 p-0',
              fixedSheet ? 'h-[70dvh] overflow-hidden' : 'max-h-[85vh] overflow-y-auto',
            )}
          >
            {sheet(() => setSheetOpen(false))}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

// ─── اجزای کوچک نمایشی ─────────────────────────────────────────────────────

// ─── جعبهٔ فیلتر سایدبار دسکتاپ (دور ۵ — الگوی دیجی‌کالا/دیوار) ─────────────
// کادرهای بازِ جمع‌شونده در سایدبار — باز پیش‌فرض؛ سربرگ = عنوان + شمار
// انتخاب‌های همان جعبه + شِورون؛ انتخاب فعال = رنگ برند کنار عنوان.
export function SideFilterBox({
  title,
  icon: Icon,
  activeCount = 0,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon?: typeof Layers;
  /** تعداد انتخاب‌های فعال همین جعبه — بج کوچک کنار عنوان */
  activeCount?: number;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 border-b px-3 py-2.5 text-start transition-colors hover:bg-secondary/40"
      >
        {Icon && <Icon size={15} className="shrink-0 text-primary" />}
        <h2 className={cn('text-[13px] font-bold', activeCount > 0 && 'text-primary')}>{title}</h2>
        {activeCount > 0 && (
          <span className="grid size-4.5 shrink-0 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            {toFa(activeCount)}
          </span>
        )}
        <ChevronDown
          size={14}
          className={cn('ms-auto shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && <div className="p-2">{children}</div>}
    </section>
  );
}

/** سوییچ سایدبار/شیت — «فقط بارهای دارای گواهی/آنالیز» و «فقط ارسال‌دار (باربری)»
 *  (دور ۵ — خواستهٔ مالک: سوییچ‌هایی که برای خریدار عمده مهم‌اند) */
export function SwitchRow({
  label,
  on,
  onToggle,
  count,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
      <Switch checked={on} onCheckedChange={onToggle} className="shrink-0" aria-label={label} />
      <span className={cn('min-w-0 flex-1 text-[12px]', on && 'font-bold')}>{label}</span>
      <CountLabel n={count} />
    </div>
  );
}

/** چیپ سوییچی نوار موبایل — روشن/خاموش با یک کلیک، بدون شیت (الگوی «فقط…» دیوار) */
export function ToggleChip({
  label,
  on,
  onToggle,
  count,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[12px] font-bold transition-colors',
        on ? 'border-primary bg-primary/10 text-primary' : 'bg-card text-foreground/85 hover:bg-secondary/60',
      )}
    >
      <span
        className={cn(
          'grid size-3.5 shrink-0 place-items-center rounded-full border',
          on ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
        )}
        aria-hidden
      >
        {on && <BadgeCheck size={9} />}
      </span>
      {label}
      {count != null && (
        <span
          className={cn(
            'text-[10px] font-bold',
            count === 0 && !on && 'text-muted-foreground/50',
            on && count > 0 && 'text-primary/70',
            !on && count > 0 && 'text-muted-foreground',
          )}
        >
          {toFa(count)}
        </span>
      )}
    </button>
  );
}

/** چیپ فیلتر فعال — حذف‌پذیر تکی؛ پس‌زمینهٔ رنگی تا در نوار از دکمه‌های فیلتر
 *  جدا و چشمگیر باشد (خواستهٔ مالک ۲۸-۱۱ دور ۳) */
export function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex max-w-full shrink-0 items-center gap-1 rounded-full border border-primary/50 bg-primary/10 py-1 ps-2.5 pe-1 text-[11px] font-bold text-primary">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onClear}
        className="grid size-4 shrink-0 place-items-center rounded-full text-primary hover:bg-primary/20"
        aria-label={`حذف فیلتر ${label}`}
      >
        <X size={11} />
      </button>
    </span>
  );
}

/** شمارش زندهٔ یک گزینه — صفر = خاموش */
export function CountLabel({ n }: { n: number | undefined }) {
  if (n == null) return null;
  return (
    <span className={cn('text-[10px] font-bold', n === 0 ? 'text-muted-foreground/50' : 'text-muted-foreground')}>
      {toFa(n)}
    </span>
  );
}

/** چک‌باکس inline دسکتاپ برای گزینهٔ اتریبیوت (پاپ‌اور/پنل) */
export function AttrCheckboxRow({
  label,
  count,
  on,
  onClick,
}: {
  label: string;
  count: number | undefined;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-9 w-full items-center gap-2 rounded-lg px-3 py-1 text-start text-[12px] transition-colors',
        on ? 'bg-primary/10 font-bold text-primary' : 'hover:bg-secondary/60',
        count === 0 && !on && 'opacity-45',
      )}
    >
      <span
        className={cn(
          'grid size-4 shrink-0 place-items-center rounded-[5px] border',
          on ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
        )}
      >
        {on && <BadgeCheck size={10} />}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <CountLabel n={count} />
    </button>
  );
}

/** فرم بازهٔ دو-ورودی — مشترک پاپ‌اور دسکتاپ و شیت موبایل */
export function RangeInputs({
  min,
  max,
  onMin,
  onMax,
  unit,
}: {
  min?: number;
  max?: number;
  onMin: (v?: number) => void;
  onMax: (v?: number) => void;
  unit?: string;
}) {
  return (
    <div className="flex items-stretch gap-2 px-1 py-1.5">
      <div className="flex h-10 min-w-0 flex-1 items-center rounded-lg bg-muted px-3">
        <input
          inputMode="numeric"
          value={min != null ? toFa(min) : ''}
          onChange={(e) => onMin(parseNum(e.target.value))}
          placeholder="از"
          className="w-full bg-transparent text-center text-[12px] outline-none placeholder:text-muted-foreground/70"
        />
      </div>
      <span className="grid place-items-center text-muted-foreground/60">—</span>
      <div className="flex h-10 min-w-0 flex-1 items-center rounded-lg bg-muted px-3">
        <input
          inputMode="numeric"
          value={max != null ? toFa(max) : ''}
          onChange={(e) => onMax(parseNum(e.target.value))}
          placeholder="تا"
          className="w-full bg-transparent text-center text-[12px] outline-none placeholder:text-muted-foreground/70"
        />
      </div>
      {unit && <span className="grid w-14 shrink-0 place-items-center text-[10px] text-muted-foreground">{unitShort(unit)}</span>}
    </div>
  );
}

/** چیپ‌های سریع حجم خرید */
export function MoqChips({
  unit,
  f,
  onPick,
}: {
  unit?: string;
  f: FilterState;
  onPick: (preset: { min?: number; max?: number }) => void;
}) {
  const presets = moqPresets(unit);
  if (!presets.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-1 pt-1.5">
      {presets.map((p) => {
        const on =
          f.moqMin === p.min && f.moqMax === p.max && (f.moqMin != null || f.moqMax != null);
        return (
          <button
            key={p.label}
            type="button"
            onClick={() => onPick(p)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[10.5px] font-bold transition-colors',
              on ? 'border-primary bg-primary/10 text-primary' : 'bg-background text-foreground/75 hover:bg-secondary/60',
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── سایدبار دسته‌بندی دریل‌شونده (الگوی product-list) ─────────────────────

// chainOf به lib/catalog-v2.ts منتقل شد (مشترک با فرم ویژگی‌های پنل)


/**
 * سایدبار دسته‌ها — بدون درختِ کامل بازشونده: مثل product-list، سطحِ مرتبط
 * با دستهٔ فعال نشان داده می‌شود (ورود به گروه = محیط تخصصی همان گروه) و
 * بقیهٔ گروه‌های ریشه از صحنه حذف می‌شوند. لیستِ داخل max-h با اسکرول
 * مستقل رانده می‌شود تا فیلترها هرگز پایینِ لیستِ بی‌انتها نروند.
 */
export function SideCategories({
  tree,
  loading,
  selected,
  onSelect,
}: {
  tree?: CatalogV2TreeNode[];
  loading?: boolean;
  selected: string;
  onSelect: (key: string) => void;
}) {
  const chain = useMemo(() => chainOf(tree, selected), [tree, selected]);

  if (loading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  // نمای ریشه — فقط گروه‌های اول (بدون درخت کامل) — بدون بولد (خواستهٔ مالک ۲۸-۱۱ دور ۵)
  if (!chain.length) {
    return (
      <nav className="p-1.5">
        <TreeRow label="همهٔ دسته‌ها" count={0} active={selected === 'all'} onClick={() => onSelect('all')} allLabel />
        {(tree ?? []).map((root) => {
          const Icon = root.icon ? ROOT_ICONS[root.icon] : undefined;
          return (
            <div key={root.key} className="flex items-center">
              <TreeRow
                label={root.name}
                count={root.count}
                active={selected === root.key}
                onClick={() => onSelect(root.key)}
                icon={Icon ? <Icon size={14} className="shrink-0 text-primary" /> : undefined}
              />
              {!!root.children?.length && (
                <button
                  type="button"
                  onClick={() => onSelect(root.key)}
                  className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-secondary/60"
                  aria-label={`ورود به ${root.name}`}
                >
                  <ChevronLeft size={13} />
                </button>
              )}
            </div>
          );
        })}
      </nav>
    );
  }

  // محیط تخصصی گروه — تمرکز روی فرزندانِ سطح فعلی (برگ → هم‌ترازها)
  const current = chain[chain.length - 1];
  const parent = chain.length > 1 ? chain[chain.length - 2] : undefined;
  const focus = current.children?.length ? current : (parent ?? current);
  const focusIndex = chain.indexOf(focus);
  const backKey = focusIndex > 0 ? chain[focusIndex - 1].key : 'all';

  return (
    <nav aria-label="زیردسته‌ها" className="p-1.5">
      {/* بازگشت به سطح بالاتر — فلش راست‌گرد (قانون RTL: بازگشت به سمت راست؛
          خواستهٔ مالک ۲۸-۱۱ دور ۵ — قبلاً چپ‌گرد بود و جهتش برعکس دیده می‌شد) */}
      <button
        type="button"
        onClick={() => onSelect(backKey)}
        className="mb-1.5 flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-[12.5px] font-bold text-primary transition-colors hover:bg-primary/5"
      >
        <ArrowRight size={15} className="shrink-0" strokeWidth={2.5} aria-hidden />
        {focusIndex > 0 ? chain[focusIndex - 1].name : 'همهٔ دسته‌ها'}
      </button>

      {/* انتخاب خودِ این سطح — همهٔ آگهی‌های {focus} */}
      {focus.key !== selected && (
        <TreeRow
          label={`همهٔ آگهی‌های ${focus.name}`}
          count={focus.count}
          active={false}
          onClick={() => onSelect(focus.key)}
        />
      )}

      {/* فرزندان سطح فعال — بدون اسکرول داخلی؛ کل سایدبار خودش اسکرول دارد (دور ۵) */}
      <div className="space-y-0.5 pe-1">
        {(focus.children ?? []).map((child) => (
          <div key={child.key} className="flex items-center">
            <TreeRow
              label={child.name}
              count={child.count}
              active={selected === child.key}
              onClick={() => onSelect(child.key)}
              depth={1}
            />
            {!!child.children?.length && (
              <button
                type="button"
                onClick={() => onSelect(child.key)}
                className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground/70 hover:bg-secondary/60"
                aria-label={`ورود به ${child.name}`}
              >
                <ChevronLeft size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}

/** ردیف درخت سایدبار — نام + شمار آگهی؛ وزن معمولی (بدون بولد — دور ۵) */
export function TreeRow({
  label,
  count,
  active,
  onClick,
  icon,
  depth = 0,
  allLabel,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  icon?: ReactNode;
  depth?: number;
  allLabel?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ paddingInlineStart: 6 + depth * 14 }}
      className={cn(
        'flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1.5 pe-2 text-start text-[12px] transition-colors',
        active ? 'bg-primary/10 font-bold text-primary' : 'hover:bg-secondary/60',
        count === 0 && !active && !allLabel && 'opacity-50',
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {!allLabel && (
        <span
          className={cn(
            'shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold',
            active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
          )}
        >
          {toFa(count)}
        </span>
      )}
    </button>
  );
}

// ─── بدنه‌های شیت موبایل ───────────────────────────────────────────────────

/** شیت دسته‌بندی — دریل چندسطحی با breadcrumb و شمار؛ ارتفاع ثابت (شیت ۷۰٪)
 *  + اسکرول عمودی مستقل — ورود به هر سطح ارتفاع را عوض نمی‌کند (خواستهٔ مالک ۲۸-۱۱ دور ۳) */
export function CategorySheetBody({
  tree,
  selected,
  onPick,
}: {
  tree?: CatalogV2TreeNode[];
  selected: string;
  onPick: (key: string) => void;
}) {
  const [path, setPath] = useState<string[]>([]);
  const nodesAt = (keys: string[]): CatalogV2TreeNode[] => {
    let list = tree ?? [];
    let cur: CatalogV2TreeNode | null = null;
    for (const k of keys) {
      const n = list.find((x) => x.key === k) ?? null;
      if (!n) return [];
      cur = n;
      list = n.children ?? [];
    }
    return list;
  };
  const current = path.length ? nodesAt(path.slice(0, -1)).find((x) => x.key === path[path.length - 1]) : null;
  const level = nodesAt(path);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="shrink-0 px-4 pt-4 pb-1 text-start">
        <SheetTitle className="text-[14px]">{current ? current.name : 'همهٔ دسته‌بندی‌ها'}</SheetTitle>
        <SheetDescription className="text-[11px]">
          تا خودِ کالا — شمار آگهی هر شاخه کنارش است.
        </SheetDescription>
      </SheetHeader>

      {/* breadcrumb دریل */}
      <div className="flex shrink-0 flex-wrap gap-1.5 px-4 pb-2">
        <button
          type="button"
          onClick={() => setPath([])}
          className={cn('rounded-lg bg-secondary px-2.5 py-1 text-[11px]', !path.length && 'bg-foreground font-bold text-white')}
        >
          همه
        </button>
        {path.map((k, i) => {
          const node = nodesAt(path.slice(0, i)).find((x) => x.key === k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => setPath(path.slice(0, i + 1))}
              className={cn('rounded-lg bg-secondary px-2.5 py-1 text-[11px]', i === path.length - 1 && 'bg-foreground font-bold text-white')}
            >
              {node?.name ?? k}
            </button>
          );
        })}
      </div>

      {current && (
        <button
          type="button"
          onClick={() => onPick(current.key)}
          className="mx-4 mb-2 flex shrink-0 items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 py-2.5 text-[12px] font-bold text-primary"
        >
          <ChevronLeft size={15} />
          <span>مشاهدهٔ آگهی‌های {current.name}</span>
          <span className="ms-auto rounded-full bg-white px-2 py-0.5 text-[10px]">{toFa(current.count)} آگهی</span>
        </button>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {level.map((n) => (
          <button
            key={n.key}
            type="button"
            onClick={() => {
              if (n.children?.length) setPath([...path, n.key]);
              else onPick(n.key);
            }}
            className={cn(
              'flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-secondary/40',
              selected === n.key && 'bg-primary/10',
            )}
          >
            <Layers size={16} className="shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{n.name}</span>
            {n.count > 0 && (
              <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                {toFa(n.count)}
              </span>
            )}
            {n.children?.length ? (
              <ChevronLeft size={16} className="shrink-0 text-muted-foreground/50" />
            ) : (
              selected === n.key && <BadgeCheck size={15} className="shrink-0 text-primary" />
            )}
          </button>
        ))}
        {!tree && (
          <div className="p-4 text-center text-[12px] text-muted-foreground">درخت دسته‌بندی در حال بارگذاری…</div>
        )}
      </div>
    </div>
  );
}

/** انتخابگر مکان دو-مرحله‌ای — الگوی دریل دسته‌بندی (خواستهٔ مالک ۲۸-۱۱ دور ۳):
 *  مرحلهٔ ۱ استان‌ها؛ با انتخاب استان، شهرهای همان استان می‌آیند + گزینهٔ
 *  «کل استان». یک انتخابگرِ مشترک دسکتاپ/موبایل — فقط تیترش فرق دارد. اگر
 *  فیلتر استان از قبل فعال باشد دریل همان‌جا باز می‌شود (ادامهٔ مسیر).
 *  شهرهای هر استان را خودش می‌آورد (کش مشترک با بقیهٔ صفحه). */
export function LocationPickerBody({
  variant = 'sheet',
  provinces,
  provinceId,
  cityId,
  provinceCount,
  cityCount,
  onAll,
  onProvince,
  onCity,
}: {
  variant?: 'sheet' | 'popover' | 'inline';
  provinces: Province[];
  provinceId?: number;
  cityId?: number;
  provinceCount: (id: number) => number | undefined;
  cityCount: (id: number) => number | undefined;
  onAll: () => void;
  onProvince: (id: number) => void;
  /** انتخاب شهر — همراه با استانش می‌آید تا برچسب/چیپ و کش شهرها درست کار کند */
  onCity: (provinceId: number, cityId: number) => void;
}) {
  /** دریل محلی — با فیلتر فعلی هم‌قدم شروع می‌شود (هر بازشدن تازه mount است) */
  const [pid, setPid] = useState<number | null>(provinceId ?? null);
  const province = provinces.find((p) => p.id === pid) ?? null;

  /** شهرهای استانِ در حال نمایش — کلید کش مشترک با صفحهٔ اصلی */
  const { data: cities } = useQuery({
    queryKey: ['catalog-v2-cities', pid],
    queryFn: () => getCities(pid!),
    enabled: pid != null,
    staleTime: 10 * 60_000,
  });

  const title =
    variant === 'sheet' ? (
      <SheetHeader className="shrink-0 px-4 pt-4 pb-1 text-start">
        <SheetTitle className="text-[14px]">
          {province ? `شهرهای ${province.name}` : 'انتخاب استان'}
        </SheetTitle>
        <SheetDescription className="text-[11px]">
          {province
            ? 'شهر را انتخاب کن یا کل استان را — شمار آگهی کنار هر گزینه است.'
            : 'اول استان؛ با انتخابش شهرهای همان استان می‌آیند.'}
        </SheetDescription>
      </SheetHeader>
    ) : (
      <p className={cn('shrink-0 text-[12px] font-bold text-muted-foreground', variant === 'popover' && 'border-b px-3 py-2.5 text-[12.5px] text-foreground')}>
        {province ? `شهرهای ${province.name}` : 'انتخاب استان'}
      </p>
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {title}

      {/* breadcrumb دریل — فقط وقتی داخل استان هستیم (در سطح استان، خودِ
          دکمهٔ «همهٔ ایران» همان نقش را دارد) */}
      {province && (
        <div className="flex shrink-0 items-center gap-1.5 px-3 pb-1 pt-2">
          <button
            type="button"
            onClick={() => setPid(null)}
            className="rounded-lg bg-secondary px-2.5 py-1 text-[11px]"
          >
            همهٔ ایران
          </button>
          <span className="rounded-lg bg-foreground px-2.5 py-1 text-[11px] font-bold text-white">
            {province.name}
          </span>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {!province ? (
          <>
            <button
              type="button"
              onClick={onAll}
              className={cn(
                'mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-[12.5px] font-bold transition-colors',
                !provinceId && !cityId ? 'bg-primary/10 text-primary' : 'hover:bg-secondary/60',
              )}
            >
              همهٔ ایران
              {!provinceId && !cityId && <BadgeCheck size={14} />}
            </button>
            <div className="grid grid-cols-2 gap-1">
              {provinces.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPid(p.id)}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-[12px] transition-colors hover:bg-secondary/60"
                >
                  {p.name}
                  <span className="text-[10px] text-muted-foreground">
                    {provinceCount(p.id) != null ? toFa(provinceCount(p.id)!) : ''}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onProvince(province.id)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-[12.5px] font-bold transition-colors',
                provinceId === province.id && !cityId ? 'bg-primary/10 text-primary' : 'hover:bg-secondary/60',
              )}
            >
              کل استان {province.name}
              {provinceId === province.id && !cityId && <BadgeCheck size={14} />}
            </button>
            <p className="px-3 pb-1 pt-2 text-[10.5px] font-bold text-muted-foreground">شهرها</p>
            <div className="grid grid-cols-2 gap-1">
              {(cities ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onCity(province.id, c.id)}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2.5 text-[12px] transition-colors',
                    cityId === c.id ? 'bg-primary/10 font-bold text-primary' : 'hover:bg-secondary/60',
                  )}
                >
                  {c.name}
                  <span className="text-[10px] text-muted-foreground">
                    {cityCount(c.id) != null ? toFa(cityCount(c.id)!) : ''}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** شیت گزینه‌های یک ویژگی — چندانتخابی + «همه» + شمارش زنده؛
 *  options (اختیاری) = لیست مرئیِ پیش‌پاک‌سازی‌شده (وابستگی کشور/نوع — دور ۴) */
export function OptionsSheetBody({
  attr,
  options,
  selected,
  counts,
  onApply,
}: {
  attr: CatalogV2Attr;
  /** لیست گزینه‌های مرئی — پیش‌فرض همهٔ گزینه‌ها */
  options?: CatalogV2AttrOption[];
  selected: string[];
  counts?: Record<string, number>;
  onApply: (vals: string[]) => void;
}) {
  const list = options ?? attr.options;
  const [temp, setTemp] = useState<string[]>(selected);
  useEffect(() => setTemp(selected), [attr.key, selected.join('|')]);

  const toggle = (label: string) => {
    setTemp((cur) => (cur.includes(label) ? cur.filter((l) => l !== label) : [...cur, label]));
  };

  return (
    <div className="pb-6">
      <SheetHeader className="px-4 pt-4 pb-1 text-start">
        <SheetTitle className="text-[14px]">{attr.label}</SheetTitle>
        {attr.hint && <SheetDescription className="text-[11px]">{attr.hint}</SheetDescription>}
      </SheetHeader>
      <div className="max-h-[56vh] overflow-y-auto">
        <button
          type="button"
          onClick={() => setTemp([])}
          className={cn(
            'flex w-full items-center justify-between px-4 py-3 text-[12.5px] transition-colors hover:bg-secondary/40',
            temp.length === 0 && 'bg-primary/10 font-bold text-primary',
          )}
        >
          همه
          {temp.length === 0 && <BadgeCheck size={15} />}
        </button>
        {list.map((opt) => {
          const n = counts?.[opt.label];
          const on = temp.includes(opt.label);
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => toggle(opt.label)}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-start text-[13px] transition-colors hover:bg-secondary/40',
                on && 'bg-primary/10 font-bold text-primary',
                n === 0 && !on && 'opacity-45',
              )}
            >
              <span
                className={cn(
                  'grid size-4 shrink-0 place-items-center rounded-[5px] border',
                  on ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                )}
              >
                {on && <BadgeCheck size={10} />}
              </span>
              <span className="min-w-0 flex-1">{opt.label}</span>
              <CountLabel n={n} />
            </button>
          );
        })}
      </div>
      <div className="border-t p-3">
        <button
          type="button"
          onClick={() => onApply(temp)}
          className="h-11 w-full rounded-xl bg-primary text-[13.5px] font-extrabold text-primary-foreground"
        >
          نمایش آگهی‌ها{temp.length ? ` (${toFa(temp.length)} گزینه)` : ''}
        </button>
      </div>
    </div>
  );
}

/** شیت بازه (قیمت/حجم) — ورودی عددی + چیپ سریع + دکمهٔ تایید */
export function RangeSheetBody({
  kind,
  unit,
  bounds,
  current,
  onApply,
}: {
  kind: 'price' | 'moq';
  unit?: string;
  bounds: { price: { min: number | null; max: number | null }; moq: { min: number | null; max: number | null } };
  current: { min?: number; max?: number };
  onApply: (min?: number, max?: number) => void;
}) {
  const isPrice = kind === 'price';
  const [min, setMin] = useState<number | undefined>(current.min);
  const [max, setMax] = useState<number | undefined>(current.max);

  const presets = isPrice ? [] : moqPresets(unit);
  const bound = isPrice ? bounds.price : bounds.moq;

  return (
    <div className="pb-6">
      <SheetHeader className="px-4 pt-4 pb-1 text-start">
        <SheetTitle className="text-[14px]">
          {isPrice ? `قیمت هر ${unitShort(unit) || 'واحد'} — تومان` : `حجم خرید${unit ? ` — ${unit}` : ''}`}
        </SheetTitle>
        <SheetDescription className="text-[11px]">
          {isPrice
            ? 'هر دو را خالی بگذار تا قیمت محدود نباشد.'
            : 'حداقل سفارشی که فروشنده می‌پذیرد در این بازه باشد؛ خالی = همهٔ حجم‌ها.'}
        </SheetDescription>
      </SheetHeader>
      <div className="px-4 pt-2">
        <div className="flex items-stretch gap-2">
          <div className="flex h-11 min-w-0 flex-1 items-center rounded-xl bg-muted px-3">
            <input
              inputMode="numeric"
              value={min != null ? toFa(min) : ''}
              onChange={(e) => setMin(parseNum(e.target.value))}
              placeholder="از"
              className="w-full bg-transparent text-center text-[12.5px] outline-none"
            />
          </div>
          <span className="grid place-items-center text-muted-foreground/60">—</span>
          <div className="flex h-11 min-w-0 flex-1 items-center rounded-xl bg-muted px-3">
            <input
              inputMode="numeric"
              value={max != null ? toFa(max) : ''}
              onChange={(e) => setMax(parseNum(e.target.value))}
              placeholder="تا"
              className="w-full bg-transparent text-center text-[12.5px] outline-none"
            />
          </div>
        </div>
        {bound.min != null &&
          bound.max != null &&
          bound.min > 0 &&
          bound.max / bound.min < 1000 && (
            <p className="pt-2 text-center text-[10px] text-muted-foreground">
              بازهٔ واقعی این دسته: {isPrice ? priceFa(bound.min) : toFa(bound.min)} تا{' '}
              {isPrice ? priceFa(bound.max) : toFa(bound.max)}
              {isPrice ? ' تومان' : ` ${unitShort(unit)}`}
            </p>
          )}
        {presets.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-3">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setMin(p.min);
                  setMax(p.max);
                }}
                className="rounded-full border bg-card px-2.5 py-1 text-[10.5px] font-bold text-foreground/75"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="border-t p-3">
        <button
          type="button"
          onClick={() => onApply(min, max)}
          className="h-11 w-full rounded-xl bg-primary text-[13.5px] font-extrabold text-primary-foreground"
        >
          تایید
        </button>
      </div>
    </div>
  );
}

// ─── کارت دعوت فروشنده (دور ۴) ─────────────────────────────────────────────

/** کارت دعوت فروشنده — «محصول برای فروش عمده دارید؟» + دکمهٔ ساخت ویترین
 *  محصولات + تصویر register-banner (خواستهٔ مالک ۲۸-۱۱ دور ۴؛ جایگزین پیام
 *  متنی «فروشنده هستید؟ ویژگی‌های آگهی را…»). واردشده → ثبت کالای تازه در
 *  پنل؛ مهمان → ثبت‌نام. هم سایدبار دسکتاپ، هم انتهای لیست موبایل. */
export function SellerCtaCard({ className }: { className?: string }) {
  const { user } = useAuth();
  return (
    <Link
      href={user ? '/panel/products/new' : '/register'}
      className={cn(
        'group mt-2.5 block overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/40',
        className,
      )}
      aria-label="ساخت ویترین محصولات در ایمچ"
    >
      <div className="relative h-28 bg-secondary/60">
        <Image
          src="/images/register-banner.png"
          alt="ساخت ویترین عمده در ایمچ"
          fill
          sizes="(max-width: 1024px) 100vw, 264px"
          className="object-contain p-2.5"
        />
      </div>
      <div className="space-y-1.5 p-3 text-center">
        <p className="text-[12.5px] font-extrabold leading-6">محصول برای فروش عمده دارید؟</p>
        <p className="text-[10px] leading-5 text-muted-foreground">
          ویترین بسازید و ویژگی‌های کالا را کامل کنید تا در نتایج فیلتر پیشرفته دیده شوید.
        </p>
        <span className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[11.5px] font-bold text-primary-foreground transition-colors group-hover:bg-primary-deep">
          <Store size={13} />
          ساخت ویترین محصولات
        </span>
      </div>
    </Link>
  );
}

// ─── کارت آگهی — موبایل: افقی دیواری؛ دسکتاپ: عمودی گریدی ─────────────────

export function CatalogCard({ row }: { row: CatalogV2Row }) {
  const { user, requireAuth } = useAuth();
  const attrPairs = Object.entries(row.resolved_attrs ?? {});
  const leaf = row.v2_path[row.v2_path.length - 1] ?? '';

  return (
    <Link
      href={`/product-view/-/-/${row.id}`}
      className="group flex min-w-0 gap-3 rounded-xl border bg-card p-2.5 transition-shadow hover:shadow-md lg:flex-col lg:gap-0 lg:p-0"
    >
      {/* عکس */}
      <div className="relative size-[104px] shrink-0 overflow-hidden rounded-lg bg-muted lg:size-auto lg:aspect-[4/3] lg:rounded-b-none lg:rounded-t-xl">
        {row.photo ? (
          <img
            src={row.photo}
            alt={row.product_name}
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground/30">
            <ImageOff size={26} />
          </div>
        )}
        {row.is_ladder && (
          <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
            <TrendingUp size={9} /> نردبان
          </span>
        )}
      </div>

      {/* بدنه */}
      <div className="flex min-w-0 flex-1 flex-col gap-1 lg:w-full lg:gap-1.5 lg:p-3">
        <h3 className="line-clamp-2 min-h-[2.6em] text-[12.5px] font-semibold leading-relaxed lg:text-[13px]">
          {row.product_name}
        </h3>

        {leaf && (
          <p className="truncate text-[10px] text-muted-foreground">
            <b className="font-bold text-foreground/70">{leaf}</b>
            <span className="mx-1 text-muted-foreground/40">·</span>
            {row.v2_path.slice(0, -1).join(' ‹ ')}
          </p>
        )}

        {attrPairs.length > 0 && (
          <p className="truncate text-[10.5px] text-muted-foreground">
            {attrPairs
              .slice(0, 3)
              .map(([k, v]) => (
                <b key={k} className="font-bold text-foreground/70">{v}</b>
              ))
              .reduce<ReactNode[]>((acc, el, i) => (i === 0 ? [el] : [...acc, ' · ', el]), [])}
          </p>
        )}

        {/* (۲۸-۱۱ دور ۵) بج شرایط معامله — نوع فروشنده/گواهی/باربری؛ خالی = هیچ */}
        {(row.seller_type || row.has_analysis || row.shipping) && (
          <p className="flex flex-wrap items-center gap-1">
            {row.seller_type && (
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[9.5px] font-bold text-foreground/70">
                {row.seller_type}
              </span>
            )}
            {row.has_analysis && (
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[9.5px] font-bold text-foreground/70">
                گواهی/آنالیز
              </span>
            )}
            {row.shipping && (
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[9.5px] font-bold text-foreground/70">
                ارسال باربری
              </span>
            )}
          </p>
        )}

        {/* قیمت — پشت ورود، مثل کل سایت */}
        <div className="mt-auto pt-1 lg:pt-1.5">
          {user ? (
            row.min_sale_price > 0 ? (
              <p className="text-[13px] font-extrabold lg:text-[13.5px]">
                {priceFa(row.min_sale_price)}{' '}
                <small className="text-[9.5px] font-normal text-muted-foreground">
                  تومان / {row.unit}
                </small>
              </p>
            ) : (
              <p className="text-[11.5px] font-bold text-muted-foreground">تماس بگیرید</p>
            )
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                requireAuth('price');
              }}
              className="inline-flex h-7 items-center rounded-lg bg-primary px-3 text-[11px] font-bold text-primary-foreground"
            >
              مشاهده قیمت
            </button>
          )}
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {stockFa(row.stock, row.unit)}
            {row.min_sale_amount > 0 && ` · حداقل ${toFa(row.min_sale_amount)} ${row.unit}`}
          </p>
        </div>

        {/* متا */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t pt-1.5 text-[10px] text-muted-foreground lg:mt-1">
          <span className="inline-flex items-center gap-1">
            <MapPin size={10} /> {row.city_name}
          </span>
          <span aria-hidden>·</span>
          <span>{timeAgoFa(row.updated_at)}</span>
          <span className="ms-auto inline-flex min-w-0 items-center gap-1">
            <b className="truncate font-bold text-foreground/70">
              {row.seller.full_name || row.seller.user_name}
            </b>
            {row.seller.is_verified && <BadgeCheck size={11} className="shrink-0 text-sky-600" />}
          </span>
        </div>
      </div>
    </Link>
  );
}
