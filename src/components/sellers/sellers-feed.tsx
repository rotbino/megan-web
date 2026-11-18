'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownWideNarrow,
  ChevronDown,
  Loader2,
  LogIn,
  NotebookPen,
  Search,
  Store,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductCard } from '@/components/products/product-card';
import { useAuth } from '@/lib/mock/auth';
import { useCities, useProvinces, useSellersFeed } from '@/lib/mock/hooks';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SellersFeedQuery } from '@/lib/mock/api';
import type { Product } from '@/lib/types';

/**
 * فید «فروشندگان» خریدار (خواستهٔ مالک ۱۸-۱۱) — تمایز با «درخواست‌ها»:
 * آنجا کاربر اول درخواست‌های خریدش را می‌بیند و از هر ردیف به تامین‌کنندگان
 * همان کالا می‌رود؛ اینجا کل آگهی‌های فروشِ مرتبط با درخواست‌های خرید
 * (دوره‌ای + فوری) یک‌جا می‌آید و کاربر می‌تواند بین گروه کالاهای خودش فیلتر
 * کند. دسته‌ها «فقط» از لیست خرید خود کاربرند (نه کل درخت) و سورت/فیلتر
 * پیش‌فرض «تطابق» است (دسته + نوع + حجم خرید + نزدیکی + تازگی ثبت/قیمت).
 *
 * بدون درخواست ثبت‌شده: پیام راهنما + فالبک (آگهی‌های شهر/استان خودش،
 * کالاهایی که دیده و جستجوهایی که کرده) تا لیست هرگز خالی نماند.
 */

const SORTS: { key: NonNullable<SellersFeedQuery['sort']>; label: string }[] = [
  { key: 'match', label: 'مطابق نیاز من' },
  { key: 'related', label: 'مرتبط ترین' },
  { key: 'newest', label: 'جدیدترین' },
];

export function SellersFeed() {
  const { requireAuth } = useAuth();

  // ── فیلترها — سورت/فیلتر پیش‌فرض = تطابق ─────────────────────────────
  const [sort, setSort] = useState<NonNullable<SellersFeedQuery['sort']>>('match');
  const [categorySlug, setCategorySlug] = useState<string | undefined>(undefined);
  const [provinceId, setProvinceId] = useState<number | undefined>(undefined);
  const [cityId, setCityId] = useState<number | undefined>(undefined);
  const [s, setS] = useState('');

  const { data: provinces = [] } = useProvinces();
  const { data: cities = [] } = useCities(provinceId);

  const query = useMemo<Omit<SellersFeedQuery, 'page'>>(
    () => ({
      sort,
      ...(categorySlug ? { categorySlug } : {}),
      ...(provinceId ? { provinceId } : {}),
      ...(cityId ? { cityId } : {}),
      ...(s.trim() ? { s: s.trim() } : {}),
    }),
    [sort, categorySlug, provinceId, cityId, s],
  );

  const { data, isLoading, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useSellersFeed(query);

  // صفحهٔ اول — منبع hasRequests/دسته‌ها (در همهٔ صفحه‌ها یکسان است)
  const firstPage = data?.pages[0];

  /** ۴۰۱ → مهمان: queryFn خطا نمی‌دهد، صفحهٔ اول null یعنی وارد نشده */
  const guest = !isLoading && firstPage === null;
  const hasRequests = firstPage?.hasRequests ?? true;
  const categories = useMemo(
    () => (firstPage ? (firstPage.categories ?? []) : []),
    [firstPage],
  );

  // مسطح‌سازی + ضدتکرار بین صفحه‌ها
  const items = useMemo(() => {
    const seen = new Set<number>();
    const out: Product[] = [];
    for (const pg of data?.pages ?? []) {
      if (!pg) continue;
      for (const p of pg.items) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          out.push(p);
        }
      }
    }
    return out;
  }, [data]);

  const total = firstPage ? firstPage.total : 0;
  const loadedPages = data?.pages.length ?? 0;

  const hasFilters = !!categorySlug || !!provinceId || !!cityId || !!s.trim() || sort !== 'match';
  const resetFilters = () => {
    setCategorySlug(undefined);
    setProvinceId(undefined);
    setCityId(undefined);
    setS('');
    setSort('match');
  };

  // ── اسکرول بی‌پایان — نگهبان انتهای گرید (عین product-listing) ────────
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

  const chipBase =
    'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-2 text-xs transition-colors';
  const chipOff = 'border-border bg-card font-medium text-foreground/85 hover:border-foreground/30';
  const chipOn = 'border-primary/35 bg-primary/10 font-bold text-primary';

  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-4 nav-desktop:px-6">
      {/* ── عنوان ── */}
      <div className="mb-3 flex items-center gap-2">
        <Store size={20} className="text-primary" />
        <h1 className="text-base font-extrabold nav-desktop:text-lg">فروشندگان</h1>
        <span className="text-xs text-muted-foreground nav-desktop:text-sm">
          تامین‌کنندگان مطابق درخواست‌های خرید شما
        </span>
      </div>

      {/* ── پیام ثبت درخواست — وقتی هنوز درخواستی ثبت نشده (خواستهٔ مالک) ── */}
      {!guest && !hasRequests && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 text-orange-900 sm:flex-row sm:items-center sm:justify-between dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-200">
          <p className="text-[13px] leading-6 nav-desktop:text-sm">
            برای نمایش و پیشنهاد تامین‌کنندگان دقیق‌تر، درخواست‌های خرید عمده دوره‌ای خود را ثبت کنید.
          </p>
          <Button
            asChild
            size="sm"
            className="shrink-0 rounded-md bg-orange-600 font-bold text-white hover:bg-orange-700"
          >
            <Link href="/panel/my-requests?tab=book" className="gap-1.5">
              <NotebookPen size={15} />
              ثبت درخواست خرید دوره‌ای
            </Link>
          </Button>
        </div>
      )}

      {/* ── مهمان — دعوت به ورود ── */}
      {guest ? (
        <div className="rounded-lg border bg-card p-8 text-center md:p-12">
          <Store size={36} className="mx-auto text-muted-foreground" />
          <p className="mt-3 text-lg font-bold">فروشندگان مطابق نیاز شما</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
            وارد حساب شوید تا آگهی‌های فروش بر اساس درخواست‌های خرید شما — با تطابق حجم، نزدیکی و
            تازگی — پیشنهاد شود.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button className="gap-1.5 rounded-md font-bold" onClick={() => requireAuth('login')}>
              <LogIn size={16} />
              ورود / ثبت نام
            </Button>
            <Button asChild variant="outline" className="rounded-md font-bold">
              <Link href="/product-list">مشاهده همه آگهی‌ها</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* ── نوار فیلتر — دسته‌های لیست خرید خود کاربر + سورت + مکان + جستجو ── */}
          <div className="mb-4 space-y-2.5">
            {/* چیپ دسته‌ها — فقط گروه کالاهای درخواست‌های کاربر (خواستهٔ مالک) */}
            {categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-0.5">
                <button
                  type="button"
                  onClick={() => setCategorySlug(undefined)}
                  className={cn(chipBase, !categorySlug ? chipOn : chipOff)}
                  aria-pressed={!categorySlug}
                >
                  همه کالاهای من
                </button>
                {categories.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => setCategorySlug(c.slug === categorySlug ? undefined : c.slug)}
                    className={cn(chipBase, categorySlug === c.slug ? chipOn : chipOff)}
                    aria-pressed={categorySlug === c.slug}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {/* سورت — پیش‌فرض تطابق */}
              <div className="flex items-center gap-1.5">
                <ArrowDownWideNarrow size={15} className="text-muted-foreground" />
                {SORTS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setSort(opt.key)}
                    aria-pressed={sort === opt.key}
                    className={cn(
                      'rounded-md px-2.5 py-1.5 text-xs transition-colors',
                      sort === opt.key
                        ? 'bg-primary/10 font-bold text-primary'
                        : 'font-medium text-foreground/75 hover:bg-accent',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <span className="hidden h-6 w-px bg-border sm:block" aria-hidden />

              {/* مکان — استان/شهر */}
              <Select
                value={provinceId ? String(provinceId) : 'all'}
                onValueChange={(v) => {
                  setProvinceId(v === 'all' ? undefined : Number(v));
                  setCityId(undefined);
                }}
              >
                <SelectTrigger
                  className={cn('h-9 w-[8.5rem] rounded-md text-xs', provinceId && 'border-primary/35 font-bold text-primary')}
                  aria-label="استان"
                >
                  <SelectValue placeholder="همه استان‌ها" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه استان‌ها</SelectItem>
                  {provinces.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={cityId ? String(cityId) : 'all'}
                onValueChange={(v) => setCityId(v === 'all' ? undefined : Number(v))}
                disabled={!provinceId}
              >
                <SelectTrigger
                  className={cn('h-9 w-[8.5rem] rounded-md text-xs', cityId && 'border-primary/35 font-bold text-primary')}
                  aria-label="شهر"
                >
                  <SelectValue placeholder="همه شهرها" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه شهرها</SelectItem>
                  {cities.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* جستجو — state-driven (تایپ = فیلتر زنده) */}
              <div className="ms-auto flex h-9 min-w-0 items-center gap-1 rounded-md border border-input px-2 focus-within:border-primary/60">
                <Search size={14} className="shrink-0 text-muted-foreground" />
                <input
                  value={s}
                  onChange={(e) => setS(e.target.value)}
                  placeholder="جستجو در این فید"
                  aria-label="جستجو در فید فروشندگان"
                  className="h-full w-36 min-w-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground nav-desktop:w-48"
                />
                {s && (
                  <button
                    type="button"
                    onClick={() => setS('')}
                    aria-label="پاک کردن جستجو"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── گرید ── */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-md md:h-80" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-md border bg-card p-8 text-center md:p-12">
              <p className="text-lg font-bold">آگهی‌ای با این فیلترها پیدا نشد!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                دسته یا فیلتر دیگری از کالاهای لیست خرید خودتان را انتخاب کنید.
              </p>
              {hasFilters && (
                <Button variant="outline" className="mt-4 rounded-md" onClick={resetFilters}>
                  حذف همه فیلترها
                </Button>
              )}
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

          {/* ── ادامهٔ لیست ── */}
          {!isLoading && items.length > 0 && hasNextPage && (
            <div className="flex justify-center pt-3">
              <Button
                variant="outline"
                className="gap-1.5 rounded-md px-6 font-bold"
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage ? <Loader2 size={15} className="animate-spin" /> : <ChevronDown size={15} />}
                مشاهده آگهی‌های بیشتر
              </Button>
            </div>
          )}
          {!isLoading && items.length > 0 && !hasNextPage && loadedPages > 1 && (
            <p className="pt-3 text-center text-xs text-muted-foreground">
              همهٔ {toFa(total)} آگهی این فید نمایش داده شد
            </p>
          )}
          <div ref={sentinelRef} aria-hidden className="h-px" />
        </>
      )}
    </div>
  );
}
