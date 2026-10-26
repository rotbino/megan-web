'use client';

import { Suspense, useMemo, useState } from 'react';
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

interface ProductListingInnerProps {
  categorySlug?: string;
  /** دیتای اولیه SSR (صفحه ۱، مرتبط‌ترین، بدون فیلتر مکان) — فقط برای همان کوئری seed می‌شود */
  initialData?: Paged<Product>;
}

function ProductListingInner({ categorySlug, initialData }: ProductListingInnerProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const s = sp.get('s') ?? '';

  const [sort, setSort] = useState<SortKey>('related');
  const [page, setPage] = useState(1);
  const [provinceId, setProvinceId] = useState<number | undefined>();
  const [cityId, setCityId] = useState<number | undefined>();

  // موبایل — مودال‌های انتخاب (بات‌شیت پایین‌رونده)
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [catStack, setCatStack] = useState<Category[]>([]);

  const { data: tree = [] } = useCategoryTree();
  const { data: provinces = [] } = useProvinces();
  const { data: cities = [] } = useCities(provinceId);

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

  // seed فقط وقتی کوئری فعال عین کوئری پیش‌فرض اولیه باشد (تطبیق ساخت‌یافته — بدون JSON.stringify)
  const isDefaultQuery =
    page === 1 && sort === 'related' && !provinceId && !cityId && (!s || s === '');
  const { data, isFetching, isLoading } = useProducts(query, isDefaultQuery ? initialData : undefined);
  const items = data?.items ?? [];

  const activeCategory = useMemo(() => {
    const flat = tree.flatMap((r) => [r, ...(r.children ?? [])]).flatMap((c) => [c, ...(c.children ?? [])]);
    return flat.find((c) => c.slug === categorySlug || c.categoryName === categorySlug);
  }, [tree, categorySlug]);

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
  const filterContent = (
    <>
      <div className="rounded-md border bg-card p-4">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold">
          <Filter size={14} className="text-primary" />
          دسته بندی محصولات
        </h2>
        <CategoryFilter tree={tree} activeSlug={categorySlug} />
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
              {activeCategory && <> در «{activeCategory.categoryName}»</>}
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
            onClick={() => setSheet('categories')}
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
          {activeCategory && (
            <button
              type="button"
              onClick={clearCategory}
              aria-label={`حذف فیلتر دسته ${activeCategory.categoryName}`}
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-primary/45 bg-primary/5 px-3 py-2 text-xs font-bold text-primary"
            >
              {activeCategory.categoryName}
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

function CategoryFilter({ tree, activeSlug }: { tree: Category[]; activeSlug?: string }) {
  return (
    <nav className="max-h-96 space-y-0.5 overflow-y-auto pe-1 text-sm">
      <Link
        href="/product-list"
        className={cn('block rounded-lg px-2.5 py-1.5', !activeSlug ? 'bg-accent font-bold text-accent-foreground' : 'text-muted-foreground hover:bg-secondary')}
      >
        همه دسته‌ها
      </Link>
      {tree.map((root) => (
        <div key={root.id}>
          <Link
            href={`/product-list/category/${root.slug}`}
            className={cn('block rounded-lg px-2.5 py-1.5', activeSlug === root.slug ? 'bg-accent font-bold text-accent-foreground' : 'font-medium hover:bg-secondary')}
          >
            {root.categoryName}
          </Link>
          {(root.children ?? []).map((l2) => (
            <div key={l2.id}>
              <Link
                href={`/product-list/category/${l2.slug}`}
                className={cn('block rounded-lg ps-5 pe-2.5 py-1.5 text-[13px]', activeSlug === l2.slug ? 'bg-accent font-bold text-accent-foreground' : 'text-muted-foreground hover:bg-secondary')}
              >
                {l2.categoryName}
              </Link>
              {(l2.children ?? []).map((l3) => (
                <Link
                  key={l3.id}
                  href={`/product-list/category/${l3.slug}`}
                  className={cn('block rounded-lg ps-8 pe-2.5 py-1.5 text-xs', activeSlug === l3.slug ? 'bg-accent font-bold text-accent-foreground' : 'text-muted-foreground/80 hover:bg-secondary')}
                >
                  {l3.categoryName}
                </Link>
              ))}
            </div>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function ProductListing({
  categorySlug,
  initialData,
}: {
  categorySlug?: string;
  initialData?: Paged<Product>;
}) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-6 lg:px-6"><Skeleton className="h-96 rounded-md" /></div>}>
      <ProductListingInner categorySlug={categorySlug} initialData={initialData} />
    </Suspense>
  );
}
