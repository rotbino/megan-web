'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowDownWideNarrow,
  ArrowUpLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  List,
  Loader2,
  Lock,
  MapPin,
  RotateCcw,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/products/product-card';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { useCategoryTree, useInfiniteCityMarketProducts } from '@/lib/mock/hooks';
import { cityMarketHref } from '@/lib/city-markets';
import { findCategoryPath } from '@/lib/categories';
import type { Paged } from '@/lib/mock/api';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Category, Product, SortKey } from '@/lib/types';

/** مرتب‌سازی — عین لیست ملی: مرتبست‌ترین / جدیدترین (نردبان‌شده‌ها همیشه بالا) */
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'related', label: 'مرتبط ترین' },
  { key: 'newest', label: 'جدیدترین' },
];

type SheetKind = 'categories' | 'sort' | 'cities' | null;

/** یک شهر استان برای تیک چندشهری */
export interface ProvinceCityOption {
  id: number;
  name: string;
  /** شهر بزرگ رجیستری — در فهرست اول می‌آید */
  major: boolean;
}

interface CityMarketListingProps {
  /** شهر ثابت بازار — فیلتر غیرقابل‌حذف (خواستهٔ مالک ۹-۱۱) */
  city: { id: number; name: string; provinceName: string };
  /** آدرس بازار این شهر (کدشده) — /city/tehran یا /city/ملایر */
  cityHref: string;
  /** شهرهای دیگر همان استان — تیک‌های چندشهری */
  provinceCities: ProvinceCityOption[];
  categorySlug?: string;
  categoryName?: string;
  /** دیتای اولیهٔ SSR (شهر خود صفحه، related، صفحهٔ initialPage) */
  initialData?: Paged<Product>;
  /** سایدبار دسته‌ها — سرور-رندر (CategoryFilter با لینک‌های شهری) */
  sidebar?: ReactNode;
  /** تیک‌های اولیه از URL (?cities=) — پایدار در جستجوهای بعدی */
  initialExtraCityIds?: number[];
  /** شمارهٔ صفحه از URL سئو (/city/tehran/2) — خواستهٔ مالک ۱۴-۱۱ */
  initialPage?: number;
}

/** تیک‌های فعال به‌صورت کوئری URL — پایداری بین جستجو/صفحه‌بندی/دسته‌ها */
function citiesParam(ids: number[]): string {
  return ids.length ? `?cities=${ids.join(',')}` : '';
}

/** سطر تیک شهر — دسکتاپ (سایدبار) و موبایل (بات‌شیت) یکی است */
function CityCheckRow({
  checked,
  onChange,
  label,
  note,
  disabled,
  locked,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  note?: string;
  disabled?: boolean;
  /** شهر خود صفحه — تیک همیشه خورده و غیرقابل برداشتن */
  locked?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors',
        disabled ? 'cursor-default bg-secondary/60' : 'hover:bg-accent/60',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
        aria-label={note ? `${label} (${note})` : label}
      />
      <span
        aria-hidden
        className={cn(
          'flex size-[18px] shrink-0 items-center justify-center rounded border transition-colors',
          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background',
        )}
      >
        {checked && <Check size={13} strokeWidth={3} />}
      </span>
      <span className={cn('min-w-0 flex-1 truncate text-sm', disabled ? 'font-bold text-foreground' : 'font-medium')}>
        {label}
      </span>
      {note && (
        <span className="flex shrink-0 items-center gap-1 text-[10.5px] text-muted-foreground">
          {locked && <Lock size={11} aria-hidden />}
          {note}
        </span>
      )}
    </label>
  );
}

/**
 * لیست «بازار عمدهٔ شهری» — ساختار عین ProductListing، اختصاصی‌شده برای
 * یک شهر (خواستهٔ مالک ۹-۱۱):
 *
 *  · فیلتر استان/شهر حذف شده — شهرِ صفحه ثابت و غیرقابل‌حذف است
 *    (چیپ قفل‌شده بدون دکمهٔ بستن در نوار فیلتر)؛
 *  · به‌جایش «شهرهای استان» آمده: تیک چندشهری در سایدبار دسکتاپ و
 *    بات‌شیت نوار فیلتر موبایل — پیش‌فرض فقط شهر خود صفحه تیک خورده؛
 *  · تیک‌ها فوری اعمال می‌شوند (رفچ بعدی با keepPreviousData) و در
 *    ?cities= می‌مانند تا خود کاربر بردارد — جستجو، دسته و صفحه‌بندیِ
 *    بعدی همان تیک‌ها را نگه می‌دارد؛
 *  · فیلترها فقط روی دسته/مرتب‌سازی/صفحه است؛ سرویس اندپوینت جدا
 *    (/cityMarket/getProducts) چندشهری است و سرویس اصلی را کند نمی‌کند.
 */
export function CityMarketListing({
  city,
  cityHref,
  provinceCities,
  categorySlug,
  categoryName,
  initialData,
  sidebar,
  initialExtraCityIds,
  initialPage,
}: CityMarketListingProps) {
  const router = useRouter();

  // تیک‌های چندشهری — شهرهای دیگر استان (شهر خود صفحه جداست و همیشه هست)
  const [extraCityIds, setExtraCityIds] = useState<number[]>(initialExtraCityIds ?? []);
  const [sort, setSort] = useState<SortKey>('related');

  // موبایل — بات‌شیت‌های انتخاب
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [catStack, setCatStack] = useState<Category[]>([]);

  const { data: tree = [] } = useCategoryTree(); // فقط بات‌شیت موبایل — سایدبار سرور-رندر

  // کوئری چندشهری — شهر صفحه همیشه اول (بدون page — صفحه = pageParam)
  const cityIds = useMemo(() => [city.id, ...extraCityIds], [city.id, extraCityIds]);
  const query = useMemo(() => ({ cityIds, categorySlug, sort }), [cityIds, categorySlug, sort]);

  // seed فقط برای کوئری پیش‌فرض اولیه (شهر خود صفحه، related، همان شمارهٔ صفحه) —
  // با اولین تیک/سورت، رفچ تازه از سرویس چندشهری می‌رود
  const isDefaultFilters = sort === 'related' && extraCityIds.length === 0;

  // ─── اسکرول بی‌پایان (خواستهٔ مالک ۱۴-۱۱) — عین ProductListing ────
  const firstPage = initialPage ?? 1;
  const { data, isLoading, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage, isError, refetch } =
    useInfiniteCityMarketProducts(query, isDefaultFilters ? initialData : undefined);

  const items = useMemo(() => {
    const seen = new Set<number>();
    const out: Product[] = [];
    for (const pg of data?.pages ?? []) {
      for (const p of pg.items) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          out.push(p);
        }
      }
    }
    return out;
  }, [data]);

  const loadedCount = data?.pages.length ?? 0;
  const total = data?.pages.at(-1)?.total ?? 0;

  /** صفحهٔ در حال مشاهده — از جایگاه ویوپورت در گرید (بافر پیش‌واکشی) */
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [viewedPage, setViewedPage] = useState(1);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      if (rect.height <= 0 || loadedCount <= 0) return;
      const perPage = rect.height / loadedCount;
      if (perPage <= 0) return;
      const depth = Math.ceil((window.innerHeight - rect.top) / perPage);
      const v = Math.max(1, Math.min(loadedCount, depth));
      setViewedPage((prev) => (prev !== v ? v : prev));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [loadedCount]);

  /** بافر پیش‌واکشی — ۲ صفحه جلوتر از صفحهٔ در حال مشاهده، idle پس از لود اولیه */
  useEffect(() => {
    if (!hasNextPage || isFetching || isLoading) return;
    if (loadedCount >= viewedPage + 2) return;
    let cancelled = false;
    const go = () => {
      if (!cancelled) void fetchNextPage();
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (h: number) => void;
    };
    const ric = w.requestIdleCallback;
    const handle = ric !== undefined ? ric(go, { timeout: 1500 }) : window.setTimeout(go, 400);
    return () => {
      cancelled = true;
      if (ric !== undefined) w.cancelIdleCallback?.(handle);
      else window.clearTimeout(handle);
    };
  }, [viewedPage, hasNextPage, isFetching, isLoading, loadedCount, fetchNextPage]);

  /** نگهبان انتهای گرید — تور ایمنی روی تخمین viewedPage */
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '1200px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ─── تیک چندشهری — فوری + پایدار در URL ──────────────────────
  /** مسیر جاری بازار (دسته یا ریشه) — تیک‌ها باید همان‌جا بمانند */
  const basePath = categorySlug
    ? `${cityHref}/category/${encodeURIComponent(categorySlug)}`
    : cityHref;

  const applyTicks = (next: number[]) => {
    setExtraCityIds(next);
    // URL آپدیت می‌شود (بدون پرش اسکرول) → رفرش لینک‌های سایدبار با تیک‌های
    // جدید + ماندگاری تیک‌ها در رفرش/بک/فوروارد و جستجوهای بعدی
    router.replace(`${basePath}${citiesParam(next)}`, { scroll: false });
  };

  const toggleCity = (id: number) => {
    const next = extraCityIds.includes(id)
      ? extraCityIds.filter((x) => x !== id)
      : [...extraCityIds, id];
    applyTicks(next);
  };

  const clearTicks = () => applyTicks([]);

  const extraCityName = (id: number) =>
    provinceCities.find((c) => c.id === id)?.name ?? '';

  // ─── موبایل: انتخاب دسته سلسله‌مراتبی — لینک‌های شهری ──────────
  const sheetLevel = catStack[catStack.length - 1];
  const sheetItems = sheetLevel ? (sheetLevel.children ?? []) : tree;

  const openCategoriesSheet = () => {
    if (categorySlug) {
      const p = findCategoryPath(tree, categorySlug);
      if (p?.length) {
        const cur = p[p.length - 1];
        setCatStack(cur.children?.length ? p : p.slice(0, -1));
        setSheet('categories');
        return;
      }
    }
    setCatStack([]);
    setSheet('categories');
  };

  /** ناوبری دسته داخل همین بازار — تیک‌های فعلی همراهش می‌آیند */
  const goCategory = (slug?: string) => {
    setSheet(null);
    setCatStack([]);
    const qs = citiesParam(extraCityIds);
    router.push(slug ? `${cityHref}/category/${encodeURIComponent(slug)}${qs}` : `${cityHref}${qs}`);
  };

  const selectCategory = (c: Category) => {
    if (c.children?.length) {
      setCatStack((st) => [...st, c]);
      return;
    }
    goCategory(c.slug);
  };

  const closeSheets = () => {
    setSheet(null);
    setCatStack([]);
  };

  // ─── چیپ‌های فیلتر فعال — شهر صفحه قفل است، تیک‌ها قابل حذف‌اند ──
  const fixedCityChip = (
    <span
      title={`بازار ${city.name} — فیلتر شهر ثابت است`}
      className="inline-flex max-w-[11rem] shrink-0 items-center gap-1.5 rounded-md border bg-secondary px-2.5 py-1.5 text-xs font-bold text-secondary-foreground"
    >
      <MapPin size={12} className="shrink-0" aria-hidden />
      <span className="truncate">{city.name}</span>
      <Lock size={11} className="shrink-0 opacity-60" aria-hidden />
    </span>
  );

  const chips = (
    <>
      {categoryName && (
        <button
          type="button"
          onClick={() => goCategory()}
          aria-label={`حذف فیلتر دسته ${categoryName}`}
          title="حذف فیلتر دسته"
          className="inline-flex max-w-[11rem] shrink-0 items-center gap-1.5 rounded-md border border-primary/35 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/15"
        >
          <span className="truncate">{categoryName}</span>
          <X size={13} className="shrink-0" aria-hidden />
        </button>
      )}
      {fixedCityChip}
      {extraCityIds.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => toggleCity(id)}
          aria-label={`حذف ${extraCityName(id)} از جستجو`}
          title={`حذف ${extraCityName(id)} از جستجو`}
          className="inline-flex max-w-[11rem] shrink-0 items-center gap-1.5 rounded-md border border-primary/35 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/15"
        >
          <MapPin size={12} className="shrink-0" aria-hidden />
          <span className="truncate">{extraCityName(id)}</span>
          <X size={13} className="shrink-0" aria-hidden />
        </button>
      ))}
    </>
  );

  // ─── بلاک «شهرهای استان» — دسکتاپ سایدبار / موبایل بات‌شیت ──
  const provinceCitiesBlock = (variant: 'sidebar' | 'sheet') => (
    <>
      <div
        className={cn(
          'flex items-center justify-between gap-2',
          variant === 'sidebar' ? '' : 'px-2.5 pb-1 pt-2',
        )}
      >

        {extraCityIds.length > 0 && (
          <button
            type="button"
            onClick={clearTicks}
            className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw size={12} />
            فقط {city.name}
          </button>
        )}
      </div>

      <div className={cn('mt-2', variant === 'sheet' && 'pb-1')}>
        {/* شهر خود صفحه — تیک‌شده و قفل (فیلتر شهر حذف نمی‌شود) */}
        <CityCheckRow checked onChange={() => {}} label={city.name} note="بازار این صفحه" disabled locked />
        <div className="max-h-72 space-y-0.5 overflow-y-auto pe-1">
          {provinceCities.map((c) => (
            <CityCheckRow
              key={c.id}
              checked={extraCityIds.includes(c.id)}
              onChange={() => toggleCity(c.id)}
              label={c.name}
            />
          ))}
        </div>
      </div>
      {variant === 'sheet' && (
        <Button className="mt-3 w-full rounded-md" onClick={() => setSheet(null)}>
          نمایش نتایج
        </Button>
      )}
    </>
  );

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-4 lg:grid-cols-[260px_1fr] lg:px-6 lg:py-6">
      {/* سایدبار فیلتر — دسکتاپ؛ چسبان (خواستهٔ مالک ۱۴-۱۱): عین ProductListing */}
      <aside
        className="hidden space-y-5 lg:block lg:self-start lg:sticky lg:top-[125px] lg:max-h-[calc(100vh-141px)] lg:overflow-y-auto lg:pb-1"
        aria-label="فیلترها"
      >
        <div className="rounded-md border bg-card p-4">{sidebar}</div>
        <div className="rounded-md border bg-card p-4">{provinceCitiesBlock('sidebar')}</div>
      </aside>

      {/* لیست */}
      <div className="min-w-0 space-y-4">
        {/* نوار بالا — دسکتاپ: چیپ‌های فعال + مرتب‌سازی */}
        <div className="hidden flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-3 lg:flex">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">{chips}</div>
          <div className="flex items-center gap-1.5 text-sm">

            {SORTS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSort(opt.key)}
                className={cn(
                  'rounded-md px-2 py-1 text-xs font-semibold transition-colors',
                  sort === opt.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-primary',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* نوار فیلتر و مرتب‌سازی — موبایل: دسته‌ها، مرتب‌سازی، شهرهای استان */}
        <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto border-b border-border/70 px-4 pb-2.5 lg:hidden">
          <button
            type="button"
            onClick={openCategoriesSheet}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:border-foreground/30"
          >
            <List size={14} className="text-muted-foreground" />
            دسته ها
          </button>
          <button
            type="button"
            onClick={() => setSheet('sort')}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:border-foreground/30"
          >
            <ArrowDownWideNarrow size={14} className="text-muted-foreground" />
            مرتب سازی
          </button>
          {/* شهرهای استان — به‌جای فیلتر استان/شهر (تیک چندشهری) */}
          <button
            type="button"
            onClick={() => setSheet('cities')}
            aria-label={`شهرهای استان ${city.provinceName}`}
            className={cn(
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-2 text-xs transition-colors',
              extraCityIds.length
                ? 'border-primary/35 bg-primary/10 font-bold text-primary'
                : 'border-border bg-card font-medium text-foreground/85 hover:border-foreground/30',
            )}
          >
            <MapPin size={14} className={extraCityIds.length ? 'text-primary' : 'text-muted-foreground'} />
            <span>شهرهای استان</span>
            {extraCityIds.length > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-bold leading-4 text-primary-foreground">
                {toFa(extraCityIds.length)}+
              </span>
            )}
          </button>
          {categoryName && (
            <button
              type="button"
              onClick={() => goCategory()}
              aria-label={`حذف فیلتر دسته ${categoryName}`}
              title="حذف فیلتر دسته"
              className="flex max-w-[11rem] shrink-0 items-center gap-1.5 rounded-md border border-primary/35 bg-primary/10 px-2.5 py-2 text-xs font-bold text-primary"
            >
              <span className="truncate">{categoryName}</span>
              <X size={13} className="shrink-0" aria-hidden />
            </button>
          )}
        </div>

        {/* گرید — ref برای تخمین صفحهٔ در حال مشاهده */}
        <div ref={gridRef}>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-md md:h-80" />)}
            </div>
          ) : isError ? (
            // خطای سرویس — جدا از «نتیجه‌ای نیست» تا کاربر فکر نکند آگهی واقعاً نیست
            <div className="rounded-md border bg-card p-8 text-center md:p-12">
              <p className="text-lg font-bold">دریافت آگهی‌ها ناموفق بود.</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                ارتباط با بازار {city.name} برقرار نشد — دوباره تلاش کنید.
              </p>
              <Button className="mt-4 rounded-md" onClick={() => refetch()}>
                <RotateCcw size={15} />
                تلاش دوباره
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-md border bg-card p-8 text-center md:p-12">
              <p className="text-lg font-bold">آگهی‌ای با این فیلترها پیدا نشد!</p>
              {provinceCities.length > 0 && (
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  هنوز در {city.name} با این فیلترها آگهی‌ای نیست — شهرهای دیگر استان{' '}
                  {city.provinceName} را تیک بزنید یا بازار شهرهای نزدیک را ببینید.
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {provinceCities.length > 0 && (
                  <Button
                    variant="outline"
                    className="rounded-md lg:hidden"
                    onClick={() => setSheet('cities')}
                  >
                    <MapPin size={14} />
                    تیک شهرهای دیگر استان
                  </Button>
                )}
                <Button asChild className="rounded-md">
                  <Link href="/#rfq">ثبت درخواست خرید</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'grid grid-cols-1 gap-2.5 transition-opacity md:grid-cols-3 md:gap-4 xl:grid-cols-4',
                isFetching && !isFetchingNextPage && 'opacity-60',
              )}
            >
              {items.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 4} />
              ))}
            </div>
          )}
        </div>

        {/* ─── اسکرول بی‌پایان: لینک «مشاهده بیشتر» سئو (خواستهٔ مالک ۱۴-۱۱) ───
            در حالت پیش‌فرض (بدون تیک چندشهری) <a href> واقعی به /city/tehran/2 و…
            می‌رود — زنجیرهٔ کشف گوگل؛ کلیک کاربر = لود درجا؛ صفحهٔ آخر → حذف */}
        {!isLoading && !isError && items.length > 0 && hasNextPage && (
          <div className="flex justify-center pt-3">
            {isDefaultFilters ? (
              <Button asChild variant="outline" className="gap-1.5 rounded-md px-6 font-bold">
                <a
                  href={
                    firstPage + loadedCount <= 1
                      ? basePath
                      : `${basePath}/${firstPage + loadedCount}`
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    if (!isFetchingNextPage) void fetchNextPage();
                  }}
                >
                  {isFetchingNextPage ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <ChevronDown size={15} />
                  )}
                  مشاهده آگهی‌های بیشتر
                </a>
              </Button>
            ) : (
              <Button
                variant="outline"
                className="gap-1.5 rounded-md px-6 font-bold"
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage ? <Loader2 size={15} className="animate-spin" /> : <ChevronDown size={15} />}
                مشاهده آگهی‌های بیشتر
              </Button>
            )}
          </div>
        )}

        {/* پایان لیست — همهٔ آگهی‌ها دیده شد */}
        {!isLoading && !isError && items.length > 0 && !hasNextPage && loadedCount > 1 && (
          <p className="pt-3 text-center text-xs text-muted-foreground">
            همهٔ {toFa(total)} آگهی این بازار نمایش داده شد
          </p>
        )}

        {/* نگهبان اسکرول — ۱۲۰۰px قبل از رسیدن به انتها صفحهٔ بعد را می‌خواهد */}
        <div ref={sentinelRef} aria-hidden className="h-px" />
      </div>

      {/* ─── بات‌شیت دسته‌ها — موبایل (سلسله‌مراتبی، لینک‌های شهری) ── */}
      <BottomSheet
        open={sheet === 'categories'}
        onClose={closeSheets}
        onBack={catStack.length ? () => setCatStack((st) => st.slice(0, -1)) : undefined}
        title={sheetLevel ? sheetLevel.categoryName : 'همه دسته ها'}
      >
        {categoryName && categorySlug && (
          <button
            type="button"
            onClick={() => goCategory()}
            className="mb-1 flex w-full items-center justify-between gap-2 rounded-md bg-primary/5 px-3 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/10"
          >
            مشاهده همه محصولات {categoryName}
            <ChevronLeft size={16} aria-hidden />
          </button>
        )}
        <ul>
          {sheetItems.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => selectCategory(c)}
                className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-3 text-start text-sm font-medium transition-colors hover:bg-accent"
              >
                <span className="line-clamp-1">{c.categoryName}</span>
                {c.children?.length ? (
                  <ChevronLeft size={16} className="shrink-0 text-muted-foreground" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>

      {/* ─── بات‌شیت مرتب‌سازی — موبایل ─────────────────────────── */}
      <BottomSheet open={sheet === 'sort'} onClose={() => setSheet(null)} title="مرتب سازی بر اساس">
        <ul>
          {SORTS.map((opt) => (
            <li key={opt.key}>
              <button
                type="button"
                onClick={() => { setSort(opt.key); setSheet(null); }}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-md px-3 py-3 text-start text-sm transition-colors hover:bg-accent',
                  sort === opt.key ? 'font-bold text-primary' : 'font-medium',
                )}
              >
                <span>{opt.label}</span>
                <ChevronLeft size={16} className={sort === opt.key ? 'text-primary' : 'text-muted-foreground/40'} />
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>

      {/* ─── بات‌شیت شهرهای استان — موبایل؛ تیک چندشهری ────────── */}
      <BottomSheet
        open={sheet === 'cities'}
        onClose={() => setSheet(null)}
        title={`شهرهای استان ${city.provinceName || ''}`.trim()}
      >
        <div className="p-1">{provinceCitiesBlock('sheet')}</div>
        {/* دسترسی سریع به بازار اختصاصی شهرهای استان (خواستهٔ مالک) */}
        {provinceCities.length > 0 && (
          <div className="mt-3 border-t border-border/70 pt-3">
            <p className="px-2.5 pb-1.5 text-[11px] leading-5 text-muted-foreground">
              بازار اختصاصی هر شهر استان:
            </p>
            <div className="flex flex-wrap gap-1.5 px-1.5 pb-2">
              {provinceCities.slice(0, 12).map((c) => (
                <Link
                  key={c.id}
                  href={cityMarketHref(c.name)}
                  onClick={() => setSheet(null)}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
                >
                  {c.name}
                  <ArrowUpLeft size={11} className="opacity-60" aria-hidden />
                </Link>
              ))}
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
