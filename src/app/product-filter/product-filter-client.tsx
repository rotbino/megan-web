'use client';

/**
 * صفحهٔ فیلتر پیشرفتهٔ عمده — بازطراحی کامل بر اساس پروتوتایپ «تامینان»
 * (ارسالی مالک ۲۸-۱۱) با دادهٔ واقعی ایمچ:
 *
 *  • دسکتاپ: سایدبار (درخت دستهٔ عمیق + پنل فیلتر سطح‌دار) + گرید کارت‌ها؛
 *  • موبایل: جستجوی چسبان + ردیف سه‌دکمه‌ای (دسته/شهر/فیلتر) + چیپ‌های
 *    فعالِ حذف‌پذیر + شیت‌های پایین‌رونده (دستهٔ دریل‌شونده/شهر با شمارش/
 *    گزینه‌ها با شمارش/بازه/سورت)؛
 *  • فیلترها: گره + استان/شهر + جستجو + ویژگی‌های تخصصی هر دسته (ارث‌بری
 *    سطح‌دار) + بازهٔ قیمت + بازهٔ حجم خرید + ۵ سورت — همه با شمارش زندهٔ
 *    گزینه‌ها (فاست از سرور)؛
 *  • قیمت‌ها مثل کل سایت پشت ورودند («مشاهده قیمت» → مودال احراز هویت)؛
 *  • کارت‌ها به صفحهٔ آگهی موجود سایت وصل‌اند (/product-view/-/-/{id}).
 *
 * بهبودهای نسبت به پروتوتایپ خام: همهٔ ۶۱۳ برگ درخت واقعی، واحد هر دسته از
 * دیتابیس مشتق می‌شود (چیپ‌های حجم واحد-آگاه)، فیلترها در URL لینک‌پذیرند،
 * شمارش‌ها از سرور می‌آیند و سورت‌های «کمترین حداقل خرید/بیشترین موجودی»
 * اضافه شده‌اند. فیلترهای ساختگی پروتوتایپ (سطح فروشنده/تسویه — در DB نیست)
 * حذف شدند.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  ImageOff,
  Layers,
  MapPin,
  Package,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  fetchCatalogV2List,
  fetchCatalogV2Tree,
  type CatalogV2Attr,
  type CatalogV2Row,
  type CatalogV2Sort,
  type CatalogV2TreeNode,
} from '@/lib/catalog-v2';
import { getCities, getProvinces } from '@/lib/mock/api';
import { useAuth } from '@/lib/mock/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { priceFa, stockFa, timeAgoFa, toFa } from '@/lib/format';
import type { City, Province } from '@/lib/types';

// ─── ثابت‌ها و ابزارهای نمایش ────────────────────────────────────────────────

const ROOT_ICONS: Record<string, typeof Layers> = {
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

const SORTS: { key: CatalogV2Sort; label: string }[] = [
  { key: 'newest', label: 'جدیدترین' },
  { key: 'price-asc', label: 'ارزان‌ترین' },
  { key: 'price-desc', label: 'گران‌ترین' },
  { key: 'moq-asc', label: 'کمترین حداقل خرید' },
  { key: 'stock-desc', label: 'بیشترین موجودی' },
];

/** همهٔ فیلترها + صفحه در یک state — تغییر هر فیلتر صفحه را به ۱ برمی‌گرداند */
interface FilterState {
  nodeKey: string;
  provinceId?: number;
  cityId?: number;
  attrs: Record<string, string[]>;
  priceMin?: number;
  priceMax?: number;
  moqMin?: number;
  moqMax?: number;
  sort: CatalogV2Sort;
  page: number;
}

/** تبدیل ارقام فارسی/عربی ورودی عددی به عدد */
function parseNum(v: string): number | undefined {
  const fa = v.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^\d]/g, '');
  if (!fa) return undefined;
  const n = parseInt(fa, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** واحد کوتاه برای برچسب‌ها — «کیلوگرم ← کیلو» */
function unitShort(unit: string | undefined): string {
  if (!unit) return '';
  if (unit.includes('کیلوگرم')) return 'کیلو';
  if (unit === 'متر مربع') return 'متر';
  return unit;
}

/** چیپ‌های سریع «حجم خرید» — آستانه‌های معنادارِ هر واحد */
function moqPresets(unit: string | undefined): { label: string; min?: number; max?: number }[] {
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

/** یک بخش فیلتر — سراسری یا ویژگی‌های تخصصی یک سطح از زنجیرهٔ دسته */
interface FilterSection {
  title: string;
  level: string;
  attrs: CatalogV2Attr[];
}

// ─── کامپوننت اصلی ─────────────────────────────────────────────────────────

export function ProductFilterClient() {
  const sp = useSearchParams();

  /** مقدار اولیهٔ اتریبیوت‌ها از پارامتر a=ctype:برچسب|برچسب,form:برچسب */
  const parseAttrsParam = (raw: string | null): Record<string, string[]> => {
    if (!raw) return {};
    const out: Record<string, string[]> = {};
    for (const part of raw.split(',')) {
      const [key, vals] = part.split(':');
      if (!key || !vals) continue;
      const list = vals.split('|').filter(Boolean);
      if (list.length) out[key] = list;
    }
    return out;
  };

  const [f, setF] = useState<FilterState>(() => ({
    nodeKey: sp.get('node') ?? 'all',
    provinceId: sp.get('province') ? Number(sp.get('province')) : undefined,
    cityId: sp.get('city') ? Number(sp.get('city')) : undefined,
    attrs: parseAttrsParam(sp.get('a')),
    priceMin: sp.get('pmin') ? Number(sp.get('pmin')) : undefined,
    priceMax: sp.get('pmax') ? Number(sp.get('pmax')) : undefined,
    moqMin: sp.get('mmin') ? Number(sp.get('mmin')) : undefined,
    moqMax: sp.get('mmax') ? Number(sp.get('mmax')) : undefined,
    sort: (sp.get('sort') as CatalogV2Sort) || 'newest',
    page: sp.get('page') ? Math.max(1, Number(sp.get('page'))) : 1,
  }));
  const [search, setSearch] = useState(sp.get('q') ?? '');
  const [debounced, setDebounced] = useState(sp.get('q') ?? '');

  /** شیت‌های موبایل */
  const [catOpen, setCatOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  /** گزینهٔ در حال ویرایش در شیت (اتریبیوت/بازه) */
  const [optionSheet, setOptionSheet] = useState<CatalogV2Attr | null>(null);
  const [rangeSheet, setRangeSheet] = useState<'price' | 'moq' | null>(null);

  /** تغییر فیلترها — page به ۱ برمی‌گردد مگر خودش عوض شود */
  const patch = (p: Partial<FilterState>) =>
    setF((cur) => ({ ...cur, ...p, page: p.page ?? 1 }));
  const setPage = (page: number) => setF((cur) => ({ ...cur, page }));

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  // URL همگام بماند (بدون رفرش) — لینک‌پذیری فیلترها
  useEffect(() => {
    const q = new URLSearchParams();
    if (f.nodeKey !== 'all') q.set('node', f.nodeKey);
    if (f.provinceId) q.set('province', String(f.provinceId));
    if (f.cityId) q.set('city', String(f.cityId));
    if (f.priceMin) q.set('pmin', String(f.priceMin));
    if (f.priceMax) q.set('pmax', String(f.priceMax));
    if (f.moqMin) q.set('mmin', String(f.moqMin));
    if (f.moqMax) q.set('mmax', String(f.moqMax));
    if (f.sort !== 'newest') q.set('sort', f.sort);
    if (f.page > 1) q.set('page', String(f.page));
    if (debounced) q.set('q', debounced);
    const attrEntries = Object.entries(f.attrs).filter(([, v]) => v.length > 0);
    if (attrEntries.length) q.set('a', attrEntries.map(([k, v]) => `${k}:${v.join('|')}`).join(','));
    const qs = q.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : '/product-filter');
  }, [f, debounced]);

  const { data: tree, isLoading: treeLoading } = useQuery({
    queryKey: ['catalog-v2-tree'],
    queryFn: fetchCatalogV2Tree,
    staleTime: 60_000,
  });

  const { data: provinces } = useQuery({
    queryKey: ['catalog-v2-provinces'],
    queryFn: () => getProvinces(),
    staleTime: 10 * 60_000,
  });

  const provinceId = f.provinceId;
  const { data: cities } = useQuery({
    queryKey: ['catalog-v2-cities', provinceId],
    queryFn: () => getCities(provinceId!),
    enabled: Boolean(provinceId),
    staleTime: 10 * 60_000,
  });

  const filters = useMemo(
    () => ({
      nodeKey: f.nodeKey,
      provinceId: f.provinceId,
      cityId: f.cityId,
      search: debounced || undefined,
      attrs: f.attrs,
      priceMin: f.priceMin,
      priceMax: f.priceMax,
      moqMin: f.moqMin,
      moqMax: f.moqMax,
      sort: f.sort,
      page: f.page,
      perPage: 24,
    }),
    [f, debounced],
  );

  const { data: list, isLoading: listLoading } = useQuery({
    queryKey: ['catalog-v2-list', filters],
    queryFn: () => fetchCatalogV2List(filters),
    placeholderData: keepPreviousData,
  });

  /** گرهٔ انتخابی روی درخت + زنجیرهٔ اجداد — برای بخش‌های سطح‌دار */
  const nodeChain = useMemo(() => {
    if (!tree || f.nodeKey === 'all') return [];
    const findChain = (
      nodes: CatalogV2TreeNode[],
      key: string,
      acc: CatalogV2TreeNode[],
    ): CatalogV2TreeNode[] | null => {
      for (const n of nodes) {
        const na = [...acc, n];
        if (n.key === key) return na;
        if (key.startsWith(`${n.key}.`) && n.children) {
          const deep = findChain(n.children, key, na);
          if (deep) return deep;
        }
      }
      return null;
    };
    return findChain(tree.roots, f.nodeKey, []) ?? [];
  }, [tree, f.nodeKey]);

  const selectedNode = nodeChain.length ? nodeChain[nodeChain.length - 1] : null;

  /** بخش‌های فیلتر: عمومی + هر سطحِ دارای ویژگی (نمایش ارث‌بری مثل تامینان) */
  const sections = useMemo<FilterSection[]>(() => {
    const secs: FilterSection[] = [
      { title: 'فیلترهای عمومی', level: 'همهٔ دسته‌ها', attrs: [] },
    ];
    nodeChain.forEach((n, i) => {
      if (n.attrs?.length) secs.push({ title: n.name, level: `سطح ${toFa(i + 1)}`, attrs: n.attrs });
    });
    return secs;
  }, [nodeChain]);

  const unit = list?.unit?.top;
  const uShort = unitShort(unit);
  const facets = list?.facets;
  const bounds = facets ?? { price: { min: null, max: null }, moq: { min: null, max: null } };

  const resetFilters = () => {
    patch({
      provinceId: undefined,
      cityId: undefined,
      attrs: {},
      priceMin: undefined,
      priceMax: undefined,
      moqMin: undefined,
      moqMax: undefined,
    });
    setSearch('');
  };

  const toggleAttr = (key: string, label: string) => {
    const cur = f.attrs[key] ?? [];
    const next = cur.includes(label) ? cur.filter((l) => l !== label) : [...cur, label];
    const attrs = { ...f.attrs };
    if (next.length) attrs[key] = next;
    else delete attrs[key];
    patch({ attrs });
  };

  /** شمارش زندهٔ یک گزینه — «چند آگهی با این گزینه می‌ماند» */
  const attrCount = (key: string, label: string): number | undefined =>
    facets?.attrs?.[key]?.[label];

  const provinceCount = (id: number): number | undefined =>
    facets?.provinces?.find((p) => p.id === id)?.count;
  const cityCount = (id: number): number | undefined =>
    facets?.cities?.find((c) => c.id === id)?.count;

  const cityLabel = f.cityId
    ? (cities ?? []).find((c) => c.id === f.cityId)?.name
    : provinceId
      ? (provinces ?? []).find((p) => p.id === provinceId)?.name
      : undefined;

  const activeCount =
    (f.provinceId || f.cityId ? 1 : 0) +
    (f.priceMin || f.priceMax ? 1 : 0) +
    (f.moqMin || f.moqMax ? 1 : 0) +
    Object.values(f.attrs).reduce((a, v) => a + v.length, 0);

  const totalAttrs = sections.reduce((a, s) => a + s.attrs.length, 0);

  // ─── چیپ‌های فیلتر فعال (حذف‌پذیرِ تکی) ──────────────────────────────
  const chips: { label: string; onClear: () => void }[] = [];
  if (selectedNode) {
    chips.push({ label: selectedNode.name, onClear: () => patch({ nodeKey: 'all' }) });
  }
  if (cityLabel) {
    chips.push({
      label: cityLabel,
      onClear: () => patch({ provinceId: undefined, cityId: undefined }),
    });
  }
  if (f.priceMin) chips.push({ label: `قیمت از ${priceFa(f.priceMin)}`, onClear: () => patch({ priceMin: undefined }) });
  if (f.priceMax) chips.push({ label: `قیمت تا ${priceFa(f.priceMax)}`, onClear: () => patch({ priceMax: undefined }) });
  if (f.moqMin) chips.push({ label: `حجم از ${toFa(f.moqMin)} ${uShort}`, onClear: () => patch({ moqMin: undefined }) });
  if (f.moqMax) chips.push({ label: `حجم تا ${toFa(f.moqMax)} ${uShort}`, onClear: () => patch({ moqMax: undefined }) });
  for (const [key, labels] of Object.entries(f.attrs)) {
    for (const l of labels) {
      chips.push({ label: l, onClear: () => toggleAttr(key, l) });
    }
  }

  const resultSummary = list
    ? `${toFa(list.total)} آگهی${facets && facets.cities.length ? ` • ${toFa(facets.cities.length)} شهر` : ''}${debounced ? ' • جستجو' : ''}`
    : '…';

  return (
    <div className="mx-auto w-full max-w-[1240px] px-3 sm:px-4 lg:px-5">
      {/* ═══ سربرگ صفحه ═══ */}
      <header className="pt-4 pb-3 lg:pt-6 lg:pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-base font-extrabold lg:text-lg">
            {selectedNode ? selectedNode.name : 'خرید و فروش عمده'} — بازار B2B ایمچ
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-bold text-primary">
            <Sparkles size={11} /> فیلتر پیشرفته
          </span>
        </div>
        <p className="mt-1 text-[11.5px] leading-6 text-muted-foreground lg:text-[12px]">
          فیلترهای تخصصی هر کالا (نوع، درجه، بسته‌بندی…) به‌علاوهٔ قیمت و حجم خرید —
          شمارش کنار هر گزینه زنده است و می‌بینی بازار کجاست.
        </p>
      </header>

      {/* ═══ موبایل: جستجو + ردیف سه‌دکمه‌ای (الگوی تامینان) ═══ */}
      <div className="sticky top-14 z-30 -mx-3 border-b bg-background/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4 lg:hidden">
        <div className="relative">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی کالای عمده؛ مثلاً: پسته اکبری…"
            className="h-10 rounded-xl bg-muted pr-9 text-[12.5px]"
          />
        </div>
        <div className="mt-2 flex gap-2">
          {/* دسته‌بندی — شیت دریل‌شونده */}
          <Sheet open={catOpen} onOpenChange={setCatOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  'inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border bg-card px-2.5 text-[11.5px] font-bold text-foreground/85',
                  selectedNode && 'border-primary bg-primary/10 text-primary',
                )}
              >
                <Layers size={13} className="shrink-0" />
                <span className="truncate">{selectedNode ? selectedNode.name : 'دسته‌بندی'}</span>
                <ChevronDown size={12} className="shrink-0 opacity-60" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] p-0">
              <CategorySheetBody
                tree={tree?.roots}
                selected={f.nodeKey}
                onPick={(key) => {
                  patch({ nodeKey: key });
                  setCatOpen(false);
                }}
              />
            </SheetContent>
          </Sheet>

          {/* شهر — دریل استان ← شهر با شمارش */}
          <Sheet open={cityOpen} onOpenChange={setCityOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  'inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border bg-card px-2.5 text-[11.5px] font-bold text-foreground/85',
                  cityLabel && 'border-primary bg-primary/10 text-primary',
                )}
              >
                <MapPin size={13} className="shrink-0" />
                <span className="truncate">{cityLabel ?? 'همهٔ ایران'}</span>
                <ChevronDown size={12} className="shrink-0 opacity-60" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto p-0">
              <CitySheetBody
                provinces={provinces ?? []}
                cities={cities ?? []}
                provinceId={provinceId}
                cityId={f.cityId}
                provinceCount={provinceCount}
                cityCount={cityCount}
                onAll={() => {
                  patch({ provinceId: undefined, cityId: undefined });
                  setCityOpen(false);
                }}
                onProvince={(id) => patch({ provinceId: id, cityId: undefined })}
                onCity={(id) => {
                  patch({ cityId: id });
                  setCityOpen(false);
                }}
              />
            </SheetContent>
          </Sheet>

          {/* فیلترها — ویژگی‌ها/بازه‌ها به‌صورت ردیف → شیت */}
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  'inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border bg-card px-2.5 text-[11.5px] font-bold text-foreground/85',
                  activeCount > 0 && 'border-primary bg-primary/10 text-primary',
                )}
              >
                <Filter size={13} className="shrink-0" />
                <span className="truncate">فیلترها</span>
                {activeCount > 0 && (
                  <span className="grid size-4 shrink-0 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {toFa(activeCount)}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto p-0">
              <SheetHeader className="px-4 pt-4 pb-2 text-start">
                <SheetTitle className="text-[14px]">فیلترها</SheetTitle>
                <SheetDescription className="text-[11px]">
                  {selectedNode
                    ? `ویژگی‌های تخصصی «${selectedNode.name}» + فیلترهای عمومی`
                    : 'ابتدا دسته‌بندی را انتخاب کنید تا ویژگی‌های تخصصی بیاید'}
                </SheetDescription>
              </SheetHeader>
              <MobileFilterRows
                sections={sections}
                f={f}
                unit={unit}
                bounds={bounds}
                attrCount={attrCount}
                cityLabel={cityLabel}
                onOpenCity={() => {
                  setFilterOpen(false);
                  setCityOpen(true);
                }}
                onOpenAttr={(attr) => {
                  setFilterOpen(false);
                  setOptionSheet(attr);
                }}
                onOpenRange={(kind) => {
                  setFilterOpen(false);
                  setRangeSheet(kind);
                }}
                onReset={resetFilters}
                activeCount={activeCount}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* چیپ‌های سورت موبایل — بیرون از نوار چسبان تا صفحه جا بندازد */}
      <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
        {SORTS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => patch({ sort: s.key })}
            className={cn(
              'h-7 shrink-0 rounded-full border px-3 text-[11px] font-bold transition-colors',
              f.sort === s.key
                ? 'border-primary bg-primary/10 text-primary'
                : 'bg-card text-foreground/80',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ═══ چیپ‌های فیلتر فعال — حذف تکی (هر دو نما) ═══ */}
      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 lg:mt-3">
          {chips.map((c, i) => (
            <ActiveChip key={`${i}:${c.label}`} label={c.label} onClear={c.onClear} />
          ))}
          <button
            type="button"
            onClick={resetFilters}
            className="text-[11px] font-bold text-primary hover:underline"
          >
            حذف همه
          </button>
        </div>
      )}

      <div className="grid items-start gap-4 py-3 lg:grid-cols-[300px_minmax(0,1fr)] lg:py-4">
        {/* ═══ سایدبار دسکتاپ: درخت + پنل فیلتر ═══ */}
        <aside className="hidden flex-col gap-4 lg:sticky lg:top-20 lg:flex">
          {/* درخت دستهٔ عمیق */}
          <section className="rounded-xl border bg-card" aria-label="درخت دسته‌بندی">
            <header className="flex items-center gap-2 border-b px-3 py-2.5">
              <Layers size={15} className="text-primary" />
              <h2 className="text-[13px] font-bold">دسته‌بندی‌ها</h2>
              {tree && (
                <span className="ms-auto text-[10px] text-muted-foreground">
                  {toFa(tree.mapped)} آگهی
                </span>
              )}
            </header>
            <div className="max-h-[420px] overflow-y-auto p-1.5">
              {treeLoading ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <TreeRow
                    label="همهٔ دسته‌ها"
                    count={tree?.totalProducts ?? 0}
                    active={f.nodeKey === 'all'}
                    onClick={() => patch({ nodeKey: 'all' })}
                    bold
                  />
                  {(tree?.roots ?? []).map((root) => (
                    <TreeNode
                      key={root.key}
                      node={root}
                      selected={f.nodeKey}
                      onSelect={(k) => patch({ nodeKey: k })}
                      depth={0}
                    />
                  ))}
                </>
              )}
            </div>
          </section>

          {/* پنل فیلتر اینلاین — بخش‌های سطح‌دار با شمارش زنده */}
          <DesktopFilterPanel
            sections={sections}
            f={f}
            patch={patch}
            provinces={provinces ?? []}
            cities={cities ?? []}
            provinceCount={provinceCount}
            cityCount={cityCount}
            unit={unit}
            bounds={bounds}
            attrCount={attrCount}
            onToggleAttr={toggleAttr}
            onReset={resetFilters}
            activeCount={activeCount}
            totalAttrs={totalAttrs}
          />
        </aside>

        {/* ═══ محتوای اصلی ═══ */}
        <main className="min-w-0 space-y-3">
          {/* جستجو + سورت (دسکتاپ) */}
          <div className="hidden flex-wrap items-center gap-2 lg:flex">
            <div className="relative min-w-0 flex-1 basis-64">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجوی کالای عمده؛ مثلاً: پسته اکبری…"
                className="h-10 rounded-xl pr-9 text-[13px]"
              />
            </div>
            <span className="text-[11px] text-muted-foreground">
              {listLoading ? '…' : resultSummary}
            </span>
            <div className="ms-auto flex flex-wrap gap-1.5">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => patch({ sort: s.key })}
                  className={cn(
                    'h-8 rounded-full border px-3 text-[11.5px] font-bold transition-colors',
                    f.sort === s.key
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'bg-card text-foreground/80 hover:bg-secondary/60',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* نوار عنوان نتیجه — breadcrumb + شمار */}
          <div className="rounded-xl border bg-card px-3 py-2.5">
            {nodeChain.length > 0 && (
              <p className="mb-1 truncate text-[10.5px] text-muted-foreground">
                {nodeChain.map((n, i) => (
                  <span key={n.key}>
                    {i > 0 && <span className="mx-1 opacity-50">›</span>}
                    {i === nodeChain.length - 1 ? <b className="font-bold text-foreground/80">{n.name}</b> : n.name}
                  </span>
                ))}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[13px] font-extrabold">
                {selectedNode ? `خرید عمده ${selectedNode.name}` : 'آگهی‌های عمده'}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {listLoading ? '…' : resultSummary}
              </span>
              {/* دکمهٔ فیلتر موبایل در نوار نتیجه (وقتی چیپ فعال هست سریع حذف شود) */}
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="ms-auto text-[11px] font-bold text-primary hover:underline lg:hidden"
                >
                  حذف فیلترها ({toFa(activeCount)})
                </button>
              )}
            </div>
          </div>

          {/* کارت‌ها */}
          {listLoading && !list ? (
            <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
              ))}
            </div>
          ) : (list?.items ?? []).length === 0 ? (
            <div className="rounded-xl border bg-card px-6 py-12 text-center">
              <ImageOff size={36} className="mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-[13px] font-bold">با این فیلترها آگهی‌ای پیدا نشد</p>
              <p className="mx-auto mt-1 max-w-sm text-[11px] leading-6 text-muted-foreground">
                بازهٔ قیمت یا حجم را کمی بازتر کن، یا یکی از گزینه‌ها را حذف کن —
                بازار ایمچ سریع‌تر از فکرت جواب می‌دهد.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 text-[12px]"
                onClick={() => {
                  resetFilters();
                  patch({ nodeKey: 'all' });
                }}
              >
                بازنشانی کامل
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {(list?.items ?? []).map((row) => (
                <CatalogCard key={row.id} row={row} />
              ))}
            </div>
          )}

          {/* صفحه‌بندی */}
          {(list?.pageCount ?? 1) > 1 && (
            <div className="flex items-center justify-center gap-3 pt-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-lg"
                disabled={(list?.page ?? 1) <= 1}
                onClick={() => {
                  setPage(Math.max(1, f.page - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                aria-label="صفحهٔ قبل"
              >
                <ChevronRight size={15} />
              </Button>
              <span className="text-[11px] text-muted-foreground">
                صفحهٔ {toFa(list?.page ?? 1)} از {toFa(list?.pageCount ?? 1)}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-lg"
                disabled={(list?.page ?? 1) >= (list?.pageCount ?? 1)}
                onClick={() => {
                  setPage(f.page + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                aria-label="صفحهٔ بعد"
              >
                <ChevronLeft size={15} />
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* ═══ شیت گزینه‌های یک ویژگی (موبایل) — چندانتخابی با شمارش ═══ */}
      <Sheet open={Boolean(optionSheet)} onOpenChange={(o) => !o && setOptionSheet(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] p-0">
          {optionSheet && (
            <OptionsSheetBody
              attr={optionSheet}
              selected={f.attrs[optionSheet.key] ?? []}
              counts={facets?.attrs?.[optionSheet.key]}
              onApply={(vals) => {
                const attrs = { ...f.attrs };
                if (vals.length) attrs[optionSheet.key] = vals;
                else delete attrs[optionSheet.key];
                patch({ attrs });
                setOptionSheet(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* ═══ شیت بازهٔ قیمت/حجم (موبایل) ═══ */}
      <Sheet open={Boolean(rangeSheet)} onOpenChange={(o) => !o && setRangeSheet(null)}>
        <SheetContent side="bottom" className="p-0">
          {rangeSheet && (
            <RangeSheetBody
              kind={rangeSheet}
              unit={unit}
              bounds={bounds}
              current={
                rangeSheet === 'price'
                  ? { min: f.priceMin, max: f.priceMax }
                  : { min: f.moqMin, max: f.moqMax }
              }
              onApply={(min, max) => {
                if (rangeSheet === 'price') patch({ priceMin: min, priceMax: max });
                else patch({ moqMin: min, moqMax: max });
                setRangeSheet(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── اجزای کوچک ─────────────────────────────────────────────────────────────

function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border bg-card py-1 ps-2.5 pe-1 text-[11px] font-bold">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onClear}
        className="grid size-4 shrink-0 place-items-center rounded-full text-primary hover:bg-primary/10"
        aria-label={`حذف فیلتر ${label}`}
      >
        <X size={11} />
      </button>
    </span>
  );
}

/** ردیف درخت (سایدبار دسکتاپ) */
function TreeRow({
  label,
  count,
  active,
  onClick,
  bold,
  icon,
  depth = 0,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  bold?: boolean;
  icon?: ReactNode;
  depth?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ paddingInlineStart: 6 + depth * 14 }}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg py-1.5 pe-2 text-start text-[12px] transition-colors',
        active ? 'bg-primary/10 font-bold text-primary' : 'hover:bg-secondary/60',
        bold && !active && 'font-bold',
        count === 0 && !active && 'opacity-50',
      )}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span
        className={cn(
          'shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold',
          active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
        )}
      >
        {toFa(count)}
      </span>
    </button>
  );
}

/** نود درخت با فرزندان بازشونده — شاخهٔ فعال خودکار باز است */
function TreeNode({
  node,
  selected,
  onSelect,
  depth = 0,
}: {
  node: CatalogV2TreeNode;
  selected: string;
  onSelect: (key: string) => void;
  depth?: number;
}) {
  const inBranch = selected === node.key || selected.startsWith(`${node.key}.`);
  /** باز/بستهٔ دستی override روی حالت مشتق‌شده */
  const [openOverride, setOpenOverride] = useState<boolean | null>(null);
  const open = openOverride ?? inBranch;

  const Icon = node.icon ? ROOT_ICONS[node.icon] : undefined;
  const hasChildren = (node.children?.length ?? 0) > 0;

  return (
    <div>
      <div className="flex items-center">
        <TreeRow
          label={node.name}
          count={node.count}
          active={selected === node.key}
          onClick={() => onSelect(node.key)}
          icon={
            Icon ? (
              <Icon size={14} className={cn(depth === 0 ? 'text-primary' : 'text-muted-foreground')} />
            ) : undefined
          }
          depth={depth}
        />
        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpenOverride(!open)}
            className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-secondary/60"
            aria-label={open ? `بستن ${node.name}` : `باز کردن ${node.name}`}
            aria-expanded={open}
          >
            <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
          </button>
        )}
      </div>
      {open && hasChildren && (
        <div className="ms-3 border-s border-border/70 ps-1">
          {node.children!.map((child) => (
            <TreeNode
              key={child.key}
              node={child}
              selected={selected}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** سربرگ یک بخش سطح‌دار — عنوان + نشان سطح (الگوی تامینان) */
function SectionHeader({
  title,
  level,
  children,
}: {
  title: string;
  level: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
      <span className="text-[12.5px] font-extrabold">{title}</span>
      <span className="ms-auto rounded-md bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
        {level}
      </span>
      {children}
    </div>
  );
}

/** یک گزینه با شمارش زنده — صفر = خاموش */
function CountLabel({ n }: { n: number | undefined }) {
  if (n == null) return null;
  return (
    <span className={cn('text-[10px] font-bold', n === 0 ? 'text-muted-foreground/50' : 'text-muted-foreground')}>
      {toFa(n)}
    </span>
  );
}

/** چک‌باکس inline دسکتاپ برای گزینهٔ اتریبیوت */
function AttrCheckboxRow({
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

/** فرم بازهٔ دو-ورودی — مشترک بین پنل دسکتاپ و شیت موبایل */
function RangeInputs({
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
    <div className="flex items-stretch gap-2 px-3 py-1.5">
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
function MoqChips({
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
    <div className="flex flex-wrap gap-1.5 px-3 pt-1.5">
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

/** پنل فیلتر دسکتاپ — بخش‌های سطح‌دار با شمارش زنده و اعمال فوری */
function DesktopFilterPanel({
  sections,
  f,
  patch,
  provinces,
  cities,
  provinceCount,
  cityCount,
  unit,
  bounds,
  attrCount,
  onToggleAttr,
  onReset,
  activeCount,
  totalAttrs,
}: {
  sections: FilterSection[];
  f: FilterState;
  patch: (p: Partial<FilterState>) => void;
  provinces: Province[];
  cities: City[];
  provinceCount: (id: number) => number | undefined;
  cityCount: (id: number) => number | undefined;
  unit?: string;
  bounds: { price: { min: number | null; max: number | null }; moq: { min: number | null; max: number | null } };
  attrCount: (key: string, label: string) => number | undefined;
  onToggleAttr: (key: string, label: string) => void;
  onReset: () => void;
  activeCount: number;
  totalAttrs: number;
}) {
  return (
    <section className="rounded-xl border bg-card" aria-label="فیلترها">
      <header className="flex items-center gap-2 border-b px-3 py-2.5">
        <SlidersHorizontal size={15} className="text-primary" />
        <h2 className="text-[13px] font-bold">فیلترها</h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="ms-auto text-[10.5px] font-bold text-primary hover:underline"
          >
            حذف فیلترها
          </button>
        )}
      </header>

      {/* بخش عمومی — شهر + قیمت + حجم خرید */}
      <SectionHeader title="فیلترهای عمومی" level="همهٔ دسته‌ها" />
      <div className="space-y-2 px-3 pb-2.5">
        <p className="text-[12px] font-bold">شهر فروشنده</p>
        <Select
          value={f.provinceId ? String(f.provinceId) : 'all'}
          onValueChange={(v) => patch({ provinceId: v === 'all' ? undefined : Number(v), cityId: undefined })}
        >
          <SelectTrigger className="h-9 text-[12px]">
            <SelectValue placeholder="همهٔ استان‌ها" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">همهٔ استان‌ها</SelectItem>
            {provinces.map((p) => (
              <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                {p.name}
                {provinceCount(p.id) != null && (
                  <span className="ms-1 text-[10px] text-muted-foreground">({toFa(provinceCount(p.id)!)})</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={f.cityId ? String(f.cityId) : 'all'}
          onValueChange={(v) => patch({ cityId: v === 'all' ? undefined : Number(v) })}
          disabled={!f.provinceId}
        >
          <SelectTrigger className="h-9 text-[12px]">
            <SelectValue placeholder={f.provinceId ? 'همهٔ شهرها' : 'ابتدا استان را انتخاب کنید'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">همهٔ شهرها</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                {c.name}
                {cityCount(c.id) != null && (
                  <span className="ms-1 text-[10px] text-muted-foreground">({toFa(cityCount(c.id)!)})</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="pt-1 text-[12px] font-bold">
          قیمت هر {unitShort(unit) || 'واحد'} <span className="text-[10px] font-normal text-muted-foreground">(تومان)</span>
        </p>
        <RangeInputs
          min={f.priceMin}
          max={f.priceMax}
          onMin={(v) => patch({ priceMin: v })}
          onMax={(v) => patch({ priceMax: v })}
        />
        {bounds.price.min != null &&
          bounds.price.max != null &&
          bounds.price.min > 0 &&
          bounds.price.max / bounds.price.min < 1000 && (
            <p className="px-3 text-[10px] text-muted-foreground">
              بازهٔ واقعی این دسته: {priceFa(bounds.price.min)} تا {priceFa(bounds.price.max)} تومان
            </p>
          )}

        <p className="pt-1 text-[12px] font-bold">
          حجم خرید{' '}
          <span className="text-[10px] font-normal text-muted-foreground">
            (حداقل سفارش فروشنده{unit ? ` — ${unitShort(unit)}` : ''})
          </span>
        </p>
        <RangeInputs
          min={f.moqMin}
          max={f.moqMax}
          onMin={(v) => patch({ moqMin: v })}
          onMax={(v) => patch({ moqMax: v })}
          unit={unit}
        />
        <MoqChips unit={unit} f={f} onPick={(p) => patch({ moqMin: p.min, moqMax: p.max })} />
        <p className="px-3 pt-1 text-[10px] leading-5 text-muted-foreground">
          فروشنده‌هایی نمایش داده می‌شوند که حداقل فروششان در این بازه است — از یک
          کارتن سوپرمارکتی تا کانتینر.
        </p>
      </div>

      {/* بخش‌های ویژگی‌های تخصصی — هر سطحِ دارای تعریف */}
      {sections.slice(1).map((sec) => (
        <div key={sec.title} className="border-t">
          <SectionHeader title={sec.title} level={sec.level} />
          {sec.attrs.map((attr) => (
            <div key={attr.key} className="px-0 pb-1.5">
              <p className="px-3 pt-1 text-[12px] font-bold">{attr.label}</p>
              {attr.hint && (
                <p className="px-3 pt-0.5 text-[10px] leading-5 text-muted-foreground">{attr.hint}</p>
              )}
              {attr.options.map((opt) => (
                <AttrCheckboxRow
                  key={opt.label}
                  label={opt.label}
                  count={attrCount(attr.key, opt.label)}
                  on={(f.attrs[attr.key] ?? []).includes(opt.label)}
                  onClick={() => onToggleAttr(attr.key, opt.label)}
                />
              ))}
            </div>
          ))}
        </div>
      ))}

      {totalAttrs === 0 && (
        <div className="border-t px-3 py-3">
          <div className="rounded-lg bg-secondary/60 px-2.5 py-2 text-[10.5px] leading-5 text-muted-foreground">
            برای این دسته هنوز ویژگی تخصصی تعریف نشده — فیلترهای عمومی (شهر، قیمت،
            حجم) فعال‌اند. دسته‌های دارای ویژگی: خشکبار، برنج، نخود، خرما، عسل،
            زعفران، پفک، تن ماهی…
          </div>
        </div>
      )}

      {totalAttrs > 0 && (
        <p className="border-t px-3 py-2.5 text-[10px] leading-5 text-muted-foreground">
          فروشنده هستید؟ ویژگی‌های آگهی را با ویرایش کالا کامل کنید تا در نتایج
          فیلتر پیشرفته دیده شوید — ناقص‌ها جای کامل‌کننده‌ها را می‌گیرند.
        </p>
      )}
    </section>
  );
}

/** ردیف‌های فیلتر موبایل — هر ردیف به شیت خودش می‌رود (الگوی تامینان) */
function MobileFilterRows({
  sections,
  f,
  unit,
  bounds,
  attrCount,
  cityLabel,
  onOpenCity,
  onOpenAttr,
  onOpenRange,
  onReset,
  activeCount,
}: {
  sections: FilterSection[];
  f: FilterState;
  unit?: string;
  bounds: { price: { min: number | null; max: number | null }; moq: { min: number | null; max: number | null } };
  attrCount: (key: string, label: string) => number | undefined;
  cityLabel?: string;
  onOpenCity: () => void;
  onOpenAttr: (attr: CatalogV2Attr) => void;
  onOpenRange: (kind: 'price' | 'moq') => void;
  onReset: () => void;
  activeCount: number;
}) {
  const u = unitShort(unit);
  const priceVals = [f.priceMin, f.priceMax].filter((x) => x != null).map(String);
  const moqVals = [f.moqMin, f.moqMax].filter((x) => x != null).map(String);

  const LRow = ({
    label,
    values,
    onClick,
    ph = 'همه',
  }: {
    label: string;
    values?: string[];
    onClick: () => void;
    ph?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-border/60 px-4 py-3.5 text-start last:border-0 hover:bg-secondary/40"
    >
      <span className="shrink-0 text-[12.5px] font-bold">{label}</span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-end text-[11.5px]',
          values?.length ? 'font-semibold' : 'text-muted-foreground/70',
        )}
      >
        {values?.length ? values.join(' — ') : ph}
      </span>
      <ChevronLeft size={15} className="shrink-0 text-muted-foreground/60" />
    </button>
  );

  return (
    <div className="pb-8">
      {activeCount > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-[11px] text-muted-foreground">{toFa(activeCount)} فیلتر فعال</span>
          <button type="button" onClick={onReset} className="text-[11.5px] font-bold text-primary">
            حذف فیلترها
          </button>
        </div>
      )}

      {sections.map((sec) => (
        <div key={sec.title} className="border-t">
          <SectionHeader title={sec.title} level={sec.level} />
          {sec.attrs.length === 0 ? (
            <>
              <LRow label="شهر فروشنده" values={cityLabel ? [cityLabel] : undefined} onClick={onOpenCity} ph="همهٔ ایران" />
              <LRow
                label={`قیمت (${u || 'تومان'})`}
                values={priceVals.length ? [priceVals.map((v) => priceFa(Number(v))).join(' — ')] : undefined}
                onClick={() => onOpenRange('price')}
              />
              <LRow
                label={`حجم خرید${u ? ` (${u})` : ''}`}
                values={moqVals.length ? [moqVals.join(' — ')] : undefined}
                onClick={() => onOpenRange('moq')}
              />
            </>
          ) : (
            sec.attrs.map((attr) => {
              const sel = f.attrs[attr.key] ?? [];
              const total = attr.options.reduce((a, o) => a + (attrCount(attr.key, o.label) ?? 0), 0);
              return (
                <LRow
                  key={attr.key}
                  label={attr.label}
                  values={sel.length ? [sel.length === 1 ? sel[0] : `${toFa(sel.length)} گزینه`] : undefined}
                  onClick={() => onOpenAttr(attr)}
                  ph={total > 0 ? 'همه' : 'بدون آگهی با ویژگی'}
                />
              );
            })
          )}
        </div>
      ))}

      <p className="px-4 pt-4 text-[10px] leading-6 text-muted-foreground">
        فیلترهای ویژگی به‌صورت ارثی از سطح‌های بالاترِ دسته اضافه می‌شوند — تغییر
        دسته، بخش‌های تازه می‌آورد. فروشنده هستید؟ ویژگی‌های آگهی را با ویرایش کالا
        کامل کنید تا در این فیلترها دیده شوید.
      </p>
    </div>
  );
}

/** بدنهٔ شیت دسته‌بندی — دریل چندسطحی با breadcrumb و شمار (الگوی تامینان) */
function CategorySheetBody({
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
    <div className="pb-8">
      <SheetHeader className="px-4 pt-4 pb-1 text-start">
        <SheetTitle className="text-[14px]">{current ? current.name : 'همهٔ دسته‌بندی‌ها'}</SheetTitle>
        <SheetDescription className="text-[11px]">
          درخت عمیق ایمچ — تا خودِ کالا؛ شمار آگهی هر شاخه کنارش است.
        </SheetDescription>
      </SheetHeader>

      {/* breadcrumb دریل */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-2">
        <button
          type="button"
          onClick={() => setPath([])}
          className={cn('rounded-lg bg-secondary px-2.5 py-1 text-[11px]', !path.length && 'bg-foreground text-white')}
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
          className="mx-4 mb-2 flex items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 py-2.5 text-[12px] font-bold text-primary"
        >
          <ChevronLeft size={15} />
          <span>مشاهدهٔ آگهی‌های {current.name}</span>
          <span className="ms-auto rounded-full bg-white px-2 py-0.5 text-[10px]">{toFa(current.count)} آگهی</span>
        </button>
      )}

      <div className="max-h-[52vh] overflow-y-auto">
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

/** بدنهٔ شیت شهر — دریل استان ← شهر با شمارش فاست */
function CitySheetBody({
  provinces,
  cities,
  provinceId,
  cityId,
  provinceCount,
  cityCount,
  onAll,
  onProvince,
  onCity,
}: {
  provinces: Province[];
  cities: City[];
  provinceId?: number;
  cityId?: number;
  provinceCount: (id: number) => number | undefined;
  cityCount: (id: number) => number | undefined;
  onAll: () => void;
  onProvince: (id: number) => void;
  onCity: (id: number) => void;
}) {
  const province = provinces.find((p) => p.id === provinceId);
  return (
    <div className="pb-6">
      <SheetHeader className="px-4 pt-4 pb-1 text-start">
        <SheetTitle className="text-[14px]">{province ? province.name : 'انتخاب استان'}</SheetTitle>
        <SheetDescription className="text-[11px]">
          {province
            ? 'شهر را انتخاب کنید یا کل استان را بگیرید — شمار آگهی کنار هر شهر است.'
            : 'فروشنده‌هایی که بارشان در این استان‌ها آمادهٔ تحویل است.'}
        </SheetDescription>
      </SheetHeader>
      {province ? (
        <div className="p-2">
          <button
            type="button"
            onClick={() => onProvince(province.id)}
            className={cn(
              'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-[12.5px] font-bold transition-colors',
              !cityId ? 'bg-primary/10 text-primary' : 'hover:bg-secondary/60',
            )}
          >
            کل استان {province.name}
            {!cityId && <BadgeCheck size={14} />}
          </button>
          <p className="px-3 pb-1 pt-3 text-[10.5px] font-bold text-muted-foreground">شهرها</p>
          <div className="grid grid-cols-2 gap-1">
            {cities.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onCity(c.id)}
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
          <button
            type="button"
            onClick={onAll}
            className="mt-3 w-full rounded-lg border border-dashed px-3 py-2 text-[11.5px] font-bold text-primary hover:bg-primary/5"
          >
            بازگشت به همهٔ ایران
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1 p-2">
          <button
            type="button"
            onClick={onAll}
            className="col-span-2 flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2.5 text-[12.5px] font-bold text-primary"
          >
            همهٔ ایران
            <MapPin size={14} />
          </button>
          {provinces.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onProvince(p.id)}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-[12px] transition-colors hover:bg-secondary/60"
            >
              {p.name}
              <span className="text-[10px] text-muted-foreground">
                {provinceCount(p.id) != null ? toFa(provinceCount(p.id)!) : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** بدنهٔ شیت گزینه‌های یک ویژگی — چندانتخابی + «همه» + شمارش زنده */
function OptionsSheetBody({
  attr,
  selected,
  counts,
  onApply,
}: {
  attr: CatalogV2Attr;
  selected: string[];
  counts?: Record<string, number>;
  onApply: (vals: string[]) => void;
}) {
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
        {attr.options.map((opt) => {
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
        <Button
          className="h-11 w-full rounded-xl text-[13.5px] font-extrabold"
          onClick={() => onApply(temp)}
        >
          نمایش آگهی‌ها{temp.length ? ` (${toFa(temp.length)} گزینه)` : ''}
        </Button>
      </div>
    </div>
  );
}

/** بدنهٔ شیت بازه (قیمت/حجم) — ورودی عددی + چیپ‌های سریع + دکمهٔ تایید */
function RangeSheetBody({
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
        <Button
          className="h-11 w-full rounded-xl text-[13.5px] font-extrabold"
          onClick={() => onApply(min, max)}
        >
          تایید
        </Button>
      </div>
    </div>
  );
}

/** کارت آگهی — موبایل: افقی دیواری؛ دسکتاپ: عمودی گریدی (الگوی کارت تامینان) */
function CatalogCard({ row }: { row: CatalogV2Row }) {
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

        {/* مسیر جدید — آخرین حلقهٔ معنادار */}
        {leaf && (
          <p className="truncate text-[10px] text-muted-foreground">
            <b className="font-bold text-foreground/70">{leaf}</b>
            <span className="mx-1 text-muted-foreground/40">·</span>
            {row.v2_path.slice(0, -1).join(' ‹ ')}
          </p>
        )}

        {/* ویژگی‌های استخراج‌شده */}
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
