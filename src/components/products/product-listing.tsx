'use client';

import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowDownWideNarrow,
  ChevronLeft,
  ChevronRight,
  Filter,
  List,
  MapPin,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/products/product-card';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { useCities, useCategoryTree, useProducts, useProvinces } from '@/lib/mock/hooks';
import { findCategoryPath } from '@/lib/categories';
import type { Paged } from '@/lib/mock/api';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Category, Product, SortKey } from '@/lib/types';
/** مرتب‌سازی — دقیقاً مثل باسکول: مرتبط‌ترین / جدیدترین (نردبان‌شده‌ها همیشه بالا) */
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'related', label: 'مرتبط ترین' },
  { key: 'newest', label: 'جدیدترین' },
];

type SheetKind = 'categories' | 'sort' | null;

/**
 * پل پارامتر جستجو (F5) — useSearchParams در رندر ایستا باعث CSR-bailout کل
 * Suspense می‌شود و کارت‌ها از HTML می‌روند (ضد-سئو). این برگه‌ی null-رندر
 * داخل Suspense خودش می‌نشیند: bailout فقط همین برگه‌ی نامرئی را می‌گیرد و
 * گرید کارت‌ها کامل در HTML ایستا می‌ماند؛ بعد از هیدریشن `s` را به لیست
 * می‌رساند (واکنشی به router.push با ?s= — عین رفتار قبلی).
 */
function SearchBridge({ onS }: { onS: (v: string) => void }) {
  const sp = useSearchParams();
  const s = sp.get('s') ?? '';
  useEffect(() => {
    onS(s);
  }, [s, onS]);
  return null;
}

/**
 * جستجوی مسیر-محور — صفحه /product-list/search/[q] مقدار را از prop سرور
 * می‌گیرد (نه از ?s=)؛ جستجوی دوباره از هدر هم به همان مسیر ناوبری می‌کند.
 */

interface ProductListingInnerProps {
  categorySlug?: string;
  /** نام دسته فعال — از صفحه سروری می‌آید (بدون نیاز به درخت کلاینت) */
  categoryName?: string;
  /** عبارت جستجو از مسیر سئو (/product-list/search/[q]) — منبع حقیقت prop سرور است */
  searchQuery?: string;
  /** دیتای اولیه SSR (صفحه ۱، مرتبط‌ترین، بدون فیلتر مکان) — فقط برای همان کوئری seed می‌شود */
  initialData?: Paged<Product>;
  /** سایدبار سرور-رندر (CategoryFilter) — از مرز کلاینت خارج است (F5) */
  sidebar?: ReactNode;
}

function ProductListingInner({ categorySlug, categoryName, searchQuery, initialData, sidebar }: ProductListingInnerProps) {
  const router = useRouter();
  /** جستجوی پایه — از prop مسیر (صفحه جستجو) یا خالی (لیست/دسته‌بندی) */
  const baseS = searchQuery ?? '';
  const [s, setS] = useState(baseS);

  const [sort, setSort] = useState<SortKey>('related');
  const [page, setPage] = useState(1);
  const [provinceId, setProvinceId] = useState<number | undefined>();
  const [cityId, setCityId] = useState<number | undefined>();

  // موبایل — مودال‌های انتخاب (بات‌شیت پایین‌رونده)
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [catStack, setCatStack] = useState<Category[]>([]);

  const { data: tree = [] } = useCategoryTree(); // فقط برای بات‌شیت موبایل — seed سرور
  const { data: provinces = [] } = useProvinces();
  const { data: cities = [] } = useCities(provinceId);

  // ناوبری بین صفحات جستجو (q جدید از هدر) — همگام‌سازی s با prop سرور
  // (الگوی تنظیم state در زمان رندر — بدون افکت)
  const [lastBaseS, setLastBaseS] = useState(baseS);
  if (lastBaseS !== baseS) {
    setLastBaseS(baseS);
    setS(baseS);
    setPage(1);
  }

  // با تغییر فیلترها به صفحه ۱ برگرد (الگوی تنظیم state در زمان رندر — بدون افکت)
  const filterKey = `${categorySlug ?? ''}|${s}|${provinceId ?? ''}|${cityId ?? ''}|${sort}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const query = useMemo(
    () => ({ categorySlug, s, provinceId, cityId, sort, page }),
    [categorySlug, s, provinceId, cityId, sort, page],
  );

  // seed فقط وقتی کوئری فعال عین کوئری پیش‌فرض اولیه باشد (تطبیق ساخت‌یافته — بدون JSON.stringify)؛
  // در صفحه جستجو initialData با همان s=q پخته شده است
  const isDefaultQuery =
    page === 1 && sort === 'related' && !provinceId && !cityId && s === baseS;
  const { data, isFetching, isLoading } = useProducts(query, isDefaultQuery ? initialData : undefined);
  const items = data?.items ?? [];

  const reset = () => {
    setProvinceId(undefined);
    setCityId(undefined);
    setSort('related');
    if (s) router.replace('/product-list');
  };

  const hasFilters = !!provinceId || !!cityId || !!s || sort !== 'related';

  // ─── موبایل: انتخاب دسته سلسله‌مراتبی ─────────────────────────
  const sheetLevel = catStack[catStack.length - 1];
  const sheetItems = sheetLevel ? (sheetLevel.children ?? []) : tree;

  /**
   * باز کردن بات‌شیت دسته‌ها — روی صفحه دسته، پشته تا سطح دسته فعال
   * پیش‌تنظیم می‌شود (نه از ریشه) تا هم‌ترازهای/فرزندان همان دسته دیده شوند؛
   * برای برگ، یک سطح عقب‌تر (هم‌ترازهای خودش) — عین رفتار باسکول.
   */
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

  const selectCategory = (c: Category) => {
    if (c.children?.length) {
      setCatStack((st) => [...st, c]);
      return;
    }
    setSheet(null);
    setCatStack([]);
    router.push(`/product-list/category/${c.slug}`);
  };

  const closeSheets = () => {
    setSheet(null);
    setCatStack([]);
  };

  const clearCategory = () => router.push('/product-list');

  // ─── سایدبار دسکتاپ (بدون تغییر) ──────────────────────────────
  // سایدبار فیلتر — دسکتاپ؛ بخش دسته‌ها سرور-رندر (prop)، مکان کلاینت
  const filterContent = (
    <>
      <div className="rounded-md border bg-card p-4">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold">
          <Filter size={14} className="text-primary" />
          دسته بندی محصولات
        </h2>
        {sidebar}
      </div>

      <div className="space-y-3 rounded-md border bg-card p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-bold">
          <MapPin size={14} className="text-primary" />
          موقعیت جغرافیایی
        </h2>
        <Select
          dir="rtl"
          value={provinceId ? String(provinceId) : undefined}
          onValueChange={(v) => { setProvinceId(Number(v)); setCityId(undefined); }}
        >
          <SelectTrigger className="w-full rounded-md" aria-label="استان">
            <SelectValue placeholder="همه استان‌ها" />
          </SelectTrigger>
          <SelectContent>
            {provinces.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select dir="rtl" value={cityId ? String(cityId) : undefined} onValueChange={(v) => setCityId(Number(v))} disabled={!provinceId}>
          <SelectTrigger className="w-full rounded-md" aria-label="شهر">
            <SelectValue placeholder={provinceId ? 'همه شهرها' : 'ابتدا استان را انتخاب کنید'} />
          </SelectTrigger>
          <SelectContent>
            {cities.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={reset} className="w-full gap-1.5 text-muted-foreground">
            <RotateCcw size={13} />
            حذف همه فیلترها
          </Button>
        )}
      </div>
    </>
  );

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-4 lg:grid-cols-[260px_1fr] lg:px-6 lg:py-6">
      {/* پل جستجو — فقط همین ناحیه در رندر ایستا به CSR می‌افتد (نامرئی)؛
          در صفحه جستجوی مسیر-محور لازم نیست (s از prop سرور می‌آید) */}
      {!searchQuery && (
        <Suspense>
          <SearchBridge onS={setS} />
        </Suspense>
      )}
      {/* سایدبار فیلتر — دسکتاپ */}
      <aside className="hidden space-y-5 lg:block" aria-label="فیلترها">
        {filterContent}
      </aside>

      {/* لیست */}
      <div className="min-w-0 space-y-4">
        {/* نوار بالا — دسکتاپ */}
        <div className="hidden flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-3 lg:flex">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            {s && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold">
                <Search size={12} />
                «{s}»
                <button type="button" onClick={() => router.replace('/product-list')} aria-label="حذف جستجو" className="text-muted-foreground hover:text-destructive">×</button>
              </span>
            )}
            <span className="truncate text-muted-foreground">
              {data ? <b className="text-foreground">{toFa(data.total)}</b> : '—'} آگهی عمده
              {categoryName && <> در «{categoryName}»</>}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">مرتب سازی بر اساس:</span>
            {SORTS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSort(opt.key)}
                className={cn(
                  'rounded-sm px-2 py-1 text-xs font-semibold transition-colors',
                  sort === opt.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-primary',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* نوار فیلتر و مرتب‌سازی — موبایل (الگوی باسکول/دیوار: دسته ها، مرتب سازی، فیلتر فعال) */}
        <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto border-b border-border/70 px-4 pb-2.5 lg:hidden">
          <button
            type="button"
            onClick={openCategoriesSheet}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:border-foreground/30"
          >
            <List size={14} className="text-muted-foreground" />
            دسته ها
          </button>
          <button
            type="button"
            onClick={() => setSheet('sort')}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:border-foreground/30"
          >
            <ArrowDownWideNarrow size={14} className="text-muted-foreground" />
            مرتب سازی
          </button>
          {categoryName && (
            <button
              type="button"
              onClick={clearCategory}
              aria-label={`حذف فیلتر دسته ${categoryName}`}
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-primary/45 bg-primary/5 px-3 py-2 text-xs font-bold text-primary"
            >
              {categoryName}
              <X size={13} />
            </button>
          )}
          {s && (
            <button
              type="button"
              onClick={() => router.replace('/product-list')}
              aria-label="حذف جستجو"
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-primary/45 bg-primary/5 px-3 py-2 text-xs font-bold text-primary"
            >
              «{s}»
              <X size={13} />
            </button>
          )}
        </div>

        {/* گرید */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-md md:h-80" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-md border bg-card p-8 text-center md:p-12">
            <p className="text-lg font-bold">آگهی‌ای با این فیلترها پیدا نشد!</p>
            <Button asChild className="mt-4 rounded-md"><Link href="/#rfq">ثبت درخواست خرید</Link></Button>
          </div>
        ) : (
          <div className={cn('grid grid-cols-1 gap-2.5 transition-opacity md:grid-cols-3 md:gap-4 xl:grid-cols-4', isFetching && 'opacity-60')}>
            {items.map((p, i) => (
              // اولین ردیف کارت‌ها (LCP) eager لود می‌شود — بقیه lazy
              <ProductCard key={p.id} product={p} priority={i < 4} />
            ))}
          </div>
        )}

        {/* صفحه‌بندی */}
        {data && data.pageCount > 1 && (
          <nav className="flex items-center justify-center gap-1 pt-2" aria-label="صفحه‌بندی">
            <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="صفحه قبل">
              <ChevronRight size={16} />
            </Button>
            {Array.from({ length: data.pageCount }).map((_, i) => (
              <Button
                key={i}
                variant={page === i + 1 ? 'default' : 'outline'}
                size="icon-sm"
                onClick={() => setPage(i + 1)}
                aria-current={page === i + 1 ? 'page' : undefined}
              >
                {toFa(i + 1)}
              </Button>
            ))}
            <Button variant="outline" size="icon-sm" disabled={page >= data.pageCount} onClick={() => setPage((p) => p + 1)} aria-label="صفحه بعد">
              <ChevronLeft size={16} />
            </Button>
          </nav>
        )}
      </div>

      {/* ─── بات‌شیت انتخاب دسته — موبایل (سلسله‌مراتبی با دکمه بازگشت) ── */}
      <BottomSheet
        open={sheet === 'categories'}
        onClose={closeSheets}
        onBack={catStack.length ? () => setCatStack((st) => st.slice(0, -1)) : undefined}
        title={sheetLevel ? sheetLevel.categoryName : 'همه دسته ها'}
      >
        {/* میان‌بر: مشاهده همه محصولات دسته فعال (مثل باسکول) */}
        {categoryName && categorySlug && (
          <Link
            href={`/product-list/category/${encodeURIComponent(categorySlug)}`}
            onClick={closeSheets}
            className="mb-1 flex items-center justify-between gap-2 rounded-lg bg-primary/5 px-3 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/10"
          >
            مشاهده همه محصولات {categoryName}
            <ChevronLeft size={16} aria-hidden />
          </Link>
        )}
        <ul>
          {sheetItems.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => selectCategory(c)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-3 text-start text-sm font-medium transition-colors hover:bg-accent"
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
                  'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-3 text-start text-sm transition-colors hover:bg-accent',
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
    </div>
  );
}

export function ProductListing({
  categorySlug,
  categoryName,
  searchQuery,
  initialData,
  sidebar,
}: {
  categorySlug?: string;
  categoryName?: string;
  searchQuery?: string;
  initialData?: Paged<Product>;
  sidebar?: ReactNode;
}) {
  // بدون Suspense بیرونی (F5): useSearchParams فقط داخل SearchBridge است؛
  // رندر ایستا کامل (کارت‌ها در HTML) و هیدریشن بدون fallback-swap.
  return (
    <ProductListingInner
      categorySlug={categorySlug}
      categoryName={categoryName}
      searchQuery={searchQuery}
      initialData={initialData}
      sidebar={sidebar}
    />
  );
}
