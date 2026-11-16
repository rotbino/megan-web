'use client';

/**
 * صفحهٔ فیلتر محصولات عمده — نمای جدید دسته‌بندی ایمچ (تاکسونومی v2).
 *
 * ساختار الگوبرداری از پروتوتایپ «تامینان» (ارسالی مالک، ویرایش سوم) و
 * بازطراحی‌شده با توکن‌های برند ایمچ:
 *  • دسکتاپ: سایدبار (درخت دستهٔ عمیق + پنل فیلتر) کنار گرید کارت‌ها؛
 *  • موبایل: نوار جستجوی چسبان + ردیف سه‌دکمه‌ای (دسته/شهر/فیلتر) + چیپ‌های
 *    فعال + چیپ‌های سورت — هر کدام در شیت پایین‌رونده باز می‌شود؛
 *  • قیمت‌ها مثل کل سایت پشت ورودند («مشاهده قیمت» → مودال احراز هویت)؛
 *  • کارت‌ها به صفحهٔ آگهی موجود سایت وصل‌اند (/product-view/-/-/{id}).
 *
 * نقش صفحه: مهاجرت موازی — سایت عمومی فعلاً روی /product-list (باسکول)
 * است؛ این صفحه قدم‌به‌قدم کامل می‌شود و در نهایت جای product-list و
 * زیرمجموعه‌هایش را می‌گیرد (خواستهٔ مالک ۱۶-۱۱).
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Anvil,
  BadgeCheck,
  Beef,
  BrickWall,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cog,
  Filter,
  FlaskConical,
  HeartPulse,
  ImageOff,
  Layers,
  MapPin,
  Package,
  Search,
  Shirt,
  Shovel,
  Sofa,
  Sparkles,
  Sprout,
  TrendingUp,
  Trophy,
  Truck,
  UtensilsCrossed,
  Wrench,
  X,
} from 'lucide-react';
import {
  catalogNodePathLabel,
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

// ─── ثابت‌های نمایش ───────────────────────────────────────────────────────────

const ROOT_ICONS: Record<string, typeof Sprout> = {
  sprout: Sprout,
  beef: Beef,
  utensils: UtensilsCrossed,
  shovel: Shovel,
  cog: Cog,
  wrench: Wrench,
  package: Package,
  'brick-wall': BrickWall,
  anvil: Anvil,
  flask: FlaskConical,
  truck: Truck,
  shirt: Shirt,
  sofa: Sofa,
  'heart-pulse': HeartPulse,
  trophy: Trophy,
};

const SORTS: { key: CatalogV2Sort; label: string }[] = [
  { key: 'newest', label: 'جدیدترین' },
  { key: 'price-asc', label: 'ارزان‌ترین' },
  { key: 'price-desc', label: 'گران‌ترین' },
];

/** همهٔ فیلترها + صفحه در یک state — تغییر فیلتر صفحه را به ۱ برمی‌گرداند */
interface FilterState {
  nodeKey: string;
  provinceId?: number;
  cityId?: number;
  attrs: Record<string, string[]>;
  sort: CatalogV2Sort;
  page: number;
}

export function ProductFilterClient() {
  const sp = useSearchParams();

  // مقدار اولیه از کوئری‌استرینگ — اشتراک‌گذاری/رفرش لینک کار می‌کند
  const [f, setF] = useState<FilterState>(() => ({
    nodeKey: sp.get('node') ?? 'all',
    provinceId: sp.get('province') ? Number(sp.get('province')) : undefined,
    cityId: sp.get('city') ? Number(sp.get('city')) : undefined,
    attrs: {},
    sort: (sp.get('sort') as CatalogV2Sort) || 'newest',
    page: sp.get('page') ? Math.max(1, Number(sp.get('page'))) : 1,
  }));
  const [search, setSearch] = useState(sp.get('q') ?? '');
  const [debounced, setDebounced] = useState(sp.get('q') ?? '');
  const [catOpen, setCatOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

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
    if (f.sort !== 'newest') q.set('sort', f.sort);
    if (f.page > 1) q.set('page', String(f.page));
    if (debounced) q.set('q', debounced);
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

  const resetFilters = () => {
    patch({ provinceId: undefined, cityId: undefined, attrs: {} });
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

  const activeCount =
    (f.nodeKey !== 'all' ? 1 : 0) +
    (f.cityId || f.provinceId ? 1 : 0) +
    Object.values(f.attrs).reduce((a, v) => a + v.length, 0);

  const cityLabel = f.cityId
    ? (cities ?? []).find((c) => c.id === f.cityId)?.name
    : provinceId
      ? (provinces ?? []).find((p) => p.id === provinceId)?.name
      : undefined;

  const sidePanels = (
    <>
      {/* ── درخت دستهٔ عمیق v2 ── */}
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
        <div className="max-h-[380px] overflow-y-auto p-1.5 lg:max-h-[calc(100vh-420px)]">
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
                  onSelect={(k) => {
                    patch({ nodeKey: k });
                    setCatOpen(false);
                  }}
                />
              ))}
            </>
          )}
        </div>
      </section>

      {/* ── فیلترها: شهر + اتریبیوت‌های گره ── */}
      <FilterPanel
        provinces={provinces ?? []}
        cities={cities ?? []}
        provinceId={provinceId}
        cityId={f.cityId}
        attrs={list?.attrs ?? []}
        attrSel={f.attrs}
        onProvince={(v) => patch({ provinceId: v, cityId: undefined })}
        onCity={(v) => patch({ cityId: v })}
        onToggleAttr={toggleAttr}
        onReset={resetFilters}
        activeCount={activeCount}
      />
    </>
  );

  return (
    <div className="mx-auto w-full max-w-[1240px] px-3 sm:px-4 lg:px-5">
      {/* ── سربرگ ── */}
      <header className="pt-4 pb-3 lg:pt-6 lg:pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-base font-extrabold lg:text-lg">خرید و فروش عمده — دسته‌بندی جدید</h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-bold text-amber-800">
            <Sparkles size={11} /> در حال تکمیل
          </span>
        </div>
        <p className="mt-1 text-[11.5px] leading-6 text-muted-foreground lg:text-[12px]">
          نمای جدید دسته‌بندی ایمچ — درخت عمیق تا خودِ کالا (سیب، گلابی، تن ماهی…)، فیلتر شهر و
          ویژگی‌های کالا. پس از تکمیل، این صفحه جای فهرست محصولات فعلی را می‌گیرد.
        </p>
      </header>

      {/* ── موبایل: جستجوی چسبان + ردیف سه‌دکمه‌ای (الگوی تامینان) ── */}
      <div className="sticky top-0 z-30 -mx-3 border-b bg-background/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4 lg:hidden">
        <div className="relative">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی کالای عمده؛ مثلاً: نخود ممبلی…"
            className="h-10 rounded-xl bg-muted pr-9 text-[12.5px]"
          />
        </div>
        <div className="mt-2 flex gap-2">
          {/* دسته‌بندی */}
          <Sheet open={catOpen} onOpenChange={setCatOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  'inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border bg-card px-2.5 text-[11.5px] font-bold text-foreground/85',
                  f.nodeKey !== 'all' && 'border-primary bg-primary/10 text-primary',
                )}
              >
                <Layers size={13} className="shrink-0" />
                <span className="truncate">
                  {f.nodeKey === 'all'
                    ? 'دسته‌بندی'
                    : catalogNodePathLabel(tree?.roots, f.nodeKey).split(' ‹ ').pop()}
                </span>
                <ChevronDown size={12} className="shrink-0 opacity-60" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto p-0">
              <SheetHeader className="px-4 pt-4 pb-2 text-start">
                <SheetTitle className="text-[14px]">همهٔ دسته‌بندی‌ها</SheetTitle>
                <SheetDescription className="text-[11px]">
                  درخت جدید ایمچ — تا خودِ کالا؛ شمار آگهی هر شاخه کنارش است.
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-3 px-3 pb-6">{sidePanels}</div>
            </SheetContent>
          </Sheet>

          {/* شهر */}
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
                provinceId={provinceId}
                cities={cities ?? []}
                cityId={f.cityId}
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

          {/* فیلترها (اتریبیوت‌ها) */}
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  'inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border bg-card px-2.5 text-[11.5px] font-bold text-foreground/85',
                  activeCount > 0 && 'border-primary bg-primary/10 text-primary',
                )}
              >
                <Filter size={13} className="shrink-0" />
                <span>فیلترها</span>
                {activeCount > 0 && (
                  <span className="grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {toFa(activeCount)}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto p-0">
              <SheetHeader className="px-4 pt-4 pb-2 text-start">
                <SheetTitle className="text-[14px]">فیلترهای کالا</SheetTitle>
                <SheetDescription className="text-[11px]">
                  ویژگی‌هایی که روی آگهی‌های همین دسته قابل فیلتر است.
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-3 px-3 pb-6">
                {(list?.attrs ?? []).length === 0 ? (
                  <div className="rounded-xl border bg-card p-4 text-center text-[11.5px] leading-6 text-muted-foreground">
                    برای این دسته هنوز ویژگی فیلترپذیری تعریف نشده — کالاهای دارای ویژگی
                    (نخود، پفک، برنج، تن ماهی…) را از درخت انتخاب کنید.
                  </div>
                ) : (
                  <FilterPanel
                    provinces={provinces ?? []}
                    cities={cities ?? []}
                    provinceId={provinceId}
                    cityId={f.cityId}
                    attrs={list?.attrs ?? []}
                    attrSel={f.attrs}
                    onProvince={(v) => patch({ provinceId: v, cityId: undefined })}
                    onCity={(v) => patch({ cityId: v })}
                    onToggleAttr={toggleAttr}
                    onReset={resetFilters}
                    activeCount={activeCount}
                  />
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="grid items-start gap-4 py-3 lg:grid-cols-[300px_minmax(0,1fr)] lg:py-4">
        {/* ── سایدبار دسکتاپ ── */}
        <aside className="hidden flex-col gap-4 lg:sticky lg:top-20 lg:flex">{sidePanels}</aside>

        {/* ── محتوای اصلی ── */}
        <main className="min-w-0 space-y-3">
          {/* جستجو + سورت (دسکتاپ) */}
          <div className="hidden flex-wrap items-center gap-2 lg:flex">
            <div className="relative min-w-0 flex-1 basis-64">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجوی کالای عمده؛ مثلاً: نخود ممبلی…"
                className="h-10 rounded-xl pr-9 text-[13px]"
              />
            </div>
            <span className="text-[11px] text-muted-foreground">
              {listLoading ? '…' : `${toFa(list?.total ?? 0)} آگهی`}
            </span>
            <div className="ms-auto flex gap-1.5">
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

          {/* چیپ‌های سورت موبایل */}
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => patch({ sort: s.key })}
                className={cn(
                  'h-8 shrink-0 rounded-full border px-3.5 text-[11.5px] font-bold transition-colors',
                  f.sort === s.key
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'bg-card text-foreground/80',
                )}
              >
                {s.label}
              </button>
            ))}
            <span className="flex items-center px-2 text-[10.5px] text-muted-foreground">
              {listLoading ? '…' : `${toFa(list?.total ?? 0)} نتیجه`}
            </span>
          </div>

          {/* چیپ‌های فیلتر فعال */}
          {(f.nodeKey !== 'all' || cityLabel || Object.keys(f.attrs).length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {f.nodeKey !== 'all' && (
                <ActiveChip
                  label={catalogNodePathLabel(tree?.roots, f.nodeKey)}
                  onClear={() => patch({ nodeKey: 'all' })}
                />
              )}
              {cityLabel && (
                <ActiveChip
                  label={cityLabel}
                  onClear={() => patch({ cityId: undefined, provinceId: undefined })}
                />
              )}
              {Object.entries(f.attrs).map(([key, labels]) =>
                labels.map((l) => (
                  <ActiveChip key={`${key}:${l}`} label={l} onClear={() => toggleAttr(key, l)} />
                )),
              )}
            </div>
          )}

          {/* کارت‌ها */}
          {listLoading && !list ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
              ))}
            </div>
          ) : (list?.items ?? []).length === 0 ? (
            <div className="rounded-xl border bg-card px-6 py-12 text-center">
              <ImageOff size={36} className="mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-[13px] font-bold">آگهی‌ای با این فیلترها نیست</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                فیلترها را بازنشانی کنید یا دستهٔ دیگری را انتخاب کنید.
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
            <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
    </div>
  );
}

// ─── اجزای کوچک ───────────────────────────────────────────────────────────────

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

/** بدنهٔ شیت شهر — دریل استان ← شهر + همهٔ ایران (الگوی شیت تامینان) */
function CitySheetBody({
  provinces,
  provinceId,
  cities,
  cityId,
  onAll,
  onProvince,
  onCity,
}: {
  provinces: Province[];
  provinceId?: number;
  cities: City[];
  cityId?: number;
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
            ? 'شهر را انتخاب کنید یا کل استان را بگیرید.'
            : 'فروشنده‌هایی که بارشان در این استان آمادهٔ تحویل است.'}
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
                {cityId === c.id && <BadgeCheck size={13} />}
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
              className="rounded-lg px-3 py-2.5 text-[12px] transition-colors hover:bg-secondary/60"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** پنل فیلتر — شهر (Select) + اتریبیوت‌های گره (چیپ‌های چندانتخابی) */
function FilterPanel({
  provinces,
  cities,
  provinceId,
  cityId,
  attrs,
  attrSel,
  onProvince,
  onCity,
  onToggleAttr,
  onReset,
  activeCount,
}: {
  provinces: Province[];
  cities: City[];
  provinceId?: number;
  cityId?: number;
  attrs: CatalogV2Attr[];
  attrSel: Record<string, string[]>;
  onProvince: (id?: number) => void;
  onCity: (id?: number) => void;
  onToggleAttr: (key: string, label: string) => void;
  onReset: () => void;
  activeCount: number;
}) {
  return (
    <section className="rounded-xl border bg-card" aria-label="فیلترها">
      <header className="flex items-center gap-2 border-b px-3 py-2.5">
        <Filter size={15} className="text-primary" />
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
      <div className="space-y-4 p-3">
        {/* شهر فروشنده */}
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-[12px] font-bold">
            <MapPin size={13} className="text-muted-foreground" /> شهر فروشنده
          </p>
          <Select
            value={provinceId ? String(provinceId) : 'all'}
            onValueChange={(v) => onProvince(v === 'all' ? undefined : Number(v))}
          >
            <SelectTrigger className="h-9 text-[12px]">
              <SelectValue placeholder="همهٔ استان‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">همهٔ استان‌ها</SelectItem>
              {provinces.map((p) => (
                <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={cityId ? String(cityId) : 'all'}
            onValueChange={(v) => onCity(v === 'all' ? undefined : Number(v))}
            disabled={!provinceId}
          >
            <SelectTrigger className="h-9 text-[12px]">
              <SelectValue placeholder={provinceId ? 'همهٔ شهرها' : 'ابتدا استان را انتخاب کنید'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">همهٔ شهرها</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* اتریبیوت‌های گرهٔ انتخابی */}
        {attrs.map((attr) => (
          <div key={attr.key} className="space-y-1.5">
            <p className="text-[12px] font-bold">{attr.label}</p>
            {attr.hint && <p className="text-[10px] leading-5 text-muted-foreground">{attr.hint}</p>}
            <div className="flex flex-wrap gap-1.5">
              {attr.options.map((opt) => {
                const on = (attrSel[attr.key] ?? []).includes(opt.label);
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => onToggleAttr(attr.key, opt.label)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                      on
                        ? 'border-primary bg-primary/10 font-bold text-primary'
                        : 'bg-background text-foreground/80 hover:bg-secondary/60',
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {attrs.length > 0 && (
          <p className="rounded-lg bg-secondary/60 px-2.5 py-2 text-[10px] leading-5 text-muted-foreground">
            فروشندگانی که ویژگی‌های آگهی‌شان را کامل کنند، در این فیلترها دیده می‌شوند —
            ناقص‌ها جای کامل‌کننده‌ها را می‌گیرند.
          </p>
        )}
      </div>
    </section>
  );
}

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
  icon?: React.ReactNode;
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
      {icon}
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
  /** باز/بستهٔ دستی override روی حالت مشتق‌شده — بدون setState-in-effect */
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
              .reduce<React.ReactNode[]>((acc, el, i) => (i === 0 ? [el] : [...acc, ' · ', el]), [])}
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
