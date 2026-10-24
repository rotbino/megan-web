'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/products/product-card';
import { useCities, useCategoryTree, useProducts, useProvinces } from '@/lib/mock/hooks';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SortKey } from '@/lib/types';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'related', label: 'مرتبط‌ترین' },
  { key: 'newest', label: 'جدیدترین' },
  { key: 'cheapest', label: 'ارزان‌ترین' },
  { key: 'stockiest', label: 'بیشترین موجودی' },
];

function ProductListingInner({ categorySlug }: { categorySlug?: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const s = sp.get('s') ?? '';

  const [sort, setSort] = useState<SortKey>('related');
  const [page, setPage] = useState(1);
  const [provinceId, setProvinceId] = useState<number | undefined>();
  const [cityId, setCityId] = useState<number | undefined>();
  const [mobileFilters, setMobileFilters] = useState(false);

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
  const { data, isFetching, isLoading } = useProducts(query);
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

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[260px_1fr] lg:px-6">
      {/* سایدبار فیلتر */}
      <aside className={cn('space-y-5 lg:block', mobileFilters ? 'block' : 'hidden')} aria-label="فیلترها">
        <div className="rounded-2xl border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold">
            <Filter size={14} className="text-primary" />
            دسته‌بندی محصولات
          </h2>
          <CategoryFilter tree={tree} activeSlug={categorySlug} />
        </div>

        <div className="space-y-3 rounded-2xl border bg-card p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <MapPin size={14} className="text-primary" />
            موقعیت جغرافیایی
          </h2>
          <Select
            dir="rtl"
            value={provinceId ? String(provinceId) : undefined}
            onValueChange={(v) => { setProvinceId(Number(v)); setCityId(undefined); }}
          >
            <SelectTrigger className="w-full rounded-xl" aria-label="استان">
              <SelectValue placeholder="همه استان‌ها" />
            </SelectTrigger>
            <SelectContent>
              {provinces.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select dir="rtl" value={cityId ? String(cityId) : undefined} onValueChange={(v) => setCityId(Number(v))} disabled={!provinceId}>
            <SelectTrigger className="w-full rounded-xl" aria-label="شهر">
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
      </aside>

      {/* لیست */}
      <div className="space-y-4">
        {/* نوار بالا */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3">
          <div className="flex items-center gap-2 text-sm">
            {s && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold">
                <Search size={12} />
                «{s}»
                <button type="button" onClick={() => router.replace('/product-list')} aria-label="حذف جستجو" className="text-muted-foreground hover:text-destructive">×</button>
              </span>
            )}
            <span className="text-muted-foreground">
              {data ? <b className="text-foreground">{toFa(data.total)}</b> : '—'} آگهی عمده
              {activeCategory && <> در «{activeCategory.categoryName}»</>}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-lg lg:hidden" onClick={() => setMobileFilters((v) => !v)}>
              <SlidersHorizontal size={14} />
              فیلترها
            </Button>
            <div className="flex items-center rounded-lg border bg-secondary/40 p-0.5 text-xs" role="group" aria-label="مرتب‌سازی">
              {SORTS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSort(opt.key)}
                  className={cn(
                    'rounded-md px-2.5 py-1.5 font-medium transition-colors',
                    sort === opt.key ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* گرید */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border bg-card p-12 text-center">
            <p className="text-lg font-bold">آگهی‌ای با این فیلترها پیدا نشد!</p>
            <p className="mt-2 text-sm text-muted-foreground">فیلترها را تغییر دهید یا درخواست خرید ثبت کنید تا فروشندگان به شما پیشنهاد بدهند.</p>
            <Button asChild className="mt-4 rounded-xl"><Link href="/#rfq">ثبت درخواست خرید</Link></Button>
          </div>
        ) : (
          <div className={cn('grid grid-cols-2 gap-4 transition-opacity md:grid-cols-3 xl:grid-cols-4', isFetching && 'opacity-60')}>
            {items.map((p) => <ProductCard key={p.id} product={p} />)}
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
    </div>
  );
}

function CategoryFilter({ tree, activeSlug }: { tree: { id: number; categoryName: string; slug: string; children?: { id: number; categoryName: string; slug: string }[] }[]; activeSlug?: string }) {
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

export function ProductListing({ categorySlug }: { categorySlug?: string }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-6 lg:px-6"><Skeleton className="h-96 rounded-2xl" /></div>}>
      <ProductListingInner categorySlug={categorySlug} />
    </Suspense>
  );
}
