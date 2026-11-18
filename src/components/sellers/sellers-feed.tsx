'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownWideNarrow,
  Check,
  ChevronDown,
  ChevronLeft,
  Loader2,
  LogIn,
  MapPin,
  NotebookPen,
  Search,
  ShoppingBasket,
  Store,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/products/product-card';
import { LocationFilterCard } from '@/components/products/filter-state';
import { BottomSheet } from '@/components/shared/bottom-sheet';
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
 *
 * (بازخورد مالک ۱۸-۱۱ دور ۲ — چیدمان هم‌سبک بقیهٔ سایت):
 *  • دسکتاپ: گرید دوستونهٔ عین layout دستهٔ /product-list — سایدبار چسبان
 *    (جستجوی فید + «کالاهای من» + موقعیت جغرافیایی) کنار ستون لیست؛
 *    نوار بالای ستون = چیپ‌های فیلتر فعال + مرتب‌سازی (بدون شمار آگهی).
 *  • موبایل: نوار فیلتر دیواری (کالاهای من / مرتب‌سازی / استان / شهر /
 *    جستجو + چیپ‌های فعال) — هر کدام بات‌شیت پایین‌رونده باز می‌شود.
 */

const SORTS: { key: NonNullable<SellersFeedQuery['sort']>; label: string }[] = [
  { key: 'match', label: 'مطابق نیاز من' },
  { key: 'related', label: 'مرتبط ترین' },
  { key: 'newest', label: 'جدیدترین' },
];

type SheetKind = 'categories' | 'sort' | 'province' | 'city' | 'search' | null;

export function SellersFeed() {
  const { requireAuth } = useAuth();

  // ── فیلترها — سورت/فیلتر پیش‌فرض = تطابق ─────────────────────────────
  const [sort, setSort] = useState<NonNullable<SellersFeedQuery['sort']>>('match');
  const [categorySlug, setCategorySlug] = useState<string | undefined>(undefined);
  const [provinceId, setProvinceId] = useState<number | undefined>(undefined);
  const [cityId, setCityId] = useState<number | undefined>(undefined);
  const [s, setS] = useState('');
  // موبایل — بات‌شیت‌های نوار فیلتر (الگوی دیوار/باسکول)
  const [sheet, setSheet] = useState<SheetKind>(null);

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

  // برچسب‌های فیلترهای فعال — برای چیپ‌ها و دکمه‌های نوار موبایل
  const activeCategory = categories.find((c) => c.slug === categorySlug);
  const provinceName = provinces.find((p) => p.id === provinceId)?.name;
  const cityName = cityId ? cities.find((c) => c.id === cityId)?.name : undefined;

  /** انتخاب استان — شهر وابسته را هم پاک می‌کند */
  const selectProvince = (id: number | undefined) => {
    setProvinceId(id);
    setCityId(undefined);
  };

  const hasFilters =
    !!categorySlug || !!provinceId || !!cityId || !!s.trim() || sort !== 'match';
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

  // ── چیپ‌های فیلتر فعال — نوار دسکتاپ (الگوی product-listing) ──────────
  const chips = (
    <>
      {activeCategory && (
        <button
          type="button"
          onClick={() => setCategorySlug(undefined)}
          aria-label={`حذف فیلتر ${activeCategory.name}`}
          title="حذف فیلتر کالا"
          className="inline-flex max-w-[11rem] shrink-0 items-center gap-1.5 rounded-md border border-primary/35 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/15"
        >
          <span className="truncate">{activeCategory.name}</span>
          <X size={13} className="shrink-0" aria-hidden />
        </button>
      )}
      {s.trim() && (
        <button
          type="button"
          onClick={() => setS('')}
          aria-label="حذف جستجو"
          title="حذف جستجو"
          className="inline-flex max-w-[11rem] shrink-0 items-center gap-1.5 rounded-md border border-primary/35 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/15"
        >
          <Search size={12} className="shrink-0" aria-hidden />
          <span className="truncate">«{s.trim()}»</span>
          <X size={13} className="shrink-0" aria-hidden />
        </button>
      )}
      {/* چیپ مکان فقط دسکتاپ — در موبایل دکمه‌های استان/شهر همان نقش را دارند */}
      {cityName ? (
        <button
          type="button"
          onClick={() => setCityId(undefined)}
          aria-label="حذف فیلتر شهر"
          title="حذف فیلتر شهر"
          className="inline-flex max-w-[11rem] shrink-0 items-center gap-1.5 rounded-md border border-primary/35 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/15"
        >
          <MapPin size={12} className="shrink-0" aria-hidden />
          <span className="truncate">{cityName}</span>
          <X size={13} className="shrink-0" aria-hidden />
        </button>
      ) : provinceName ? (
        <button
          type="button"
          onClick={() => selectProvince(undefined)}
          aria-label="حذف فیلتر استان"
          title="حذف فیلتر استان"
          className="inline-flex max-w-[11rem] shrink-0 items-center gap-1.5 rounded-md border border-primary/35 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/15"
        >
          <MapPin size={12} className="shrink-0" aria-hidden />
          <span className="truncate">{provinceName}</span>
          <X size={13} className="shrink-0" aria-hidden />
        </button>
      ) : null}
    </>
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-4 nav-desktop:px-6">
      {/* ── عنوان صفحه ── */}
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Store size={18} />
        </span>
        <div className="min-w-0">
          <h1 className="text-base font-extrabold leading-6 nav-desktop:text-lg">
            فروشندگان
          </h1>
          <p className="text-xs leading-5 text-muted-foreground nav-desktop:text-[13px]">
            تامین‌کنندگان و آگهی‌های فروش مطابق درخواست‌های خرید شما
          </p>
        </div>
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
          {/* ── بدنه: سایدبار فیلتر (دسکتاپ) + ستون لیست (الگوی layout دسته) ── */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr] lg:gap-6">
            {/* سایدبار — فقط دسکتاپ؛ چسبان زیر هدر سایت */}
            <aside
              className="hidden space-y-5 lg:block lg:self-start lg:sticky lg:top-[125px] lg:max-h-[calc(100vh-141px)] lg:overflow-y-auto lg:pb-1"
              aria-label="فیلترها"
            >
              {/* جستجوی فید — سمت دسکتاپ این‌جاست، نه نوار بالا */}
              <div className="rounded-md border bg-card p-4">
                <label
                  htmlFor="sellers-feed-search"
                  className="flex items-center gap-1.5 text-sm font-bold"
                >
                  <Search size={14} className="text-primary" />
                  جستجو در فید
                </label>
                <div className="mt-3 flex h-9 items-center gap-1 rounded-md border border-input px-2 focus-within:border-primary/60">
                  <Search size={14} className="shrink-0 text-muted-foreground" />
                  <input
                    id="sellers-feed-search"
                    value={s}
                    onChange={(e) => setS(e.target.value)}
                    placeholder="نام کالا، نوع یا فروشنده…"
                    className="h-full w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                  />
                  {s && (
                    <button
                      type="button"
                      onClick={() => setS('')}
                      aria-label="پاک کردن جستجو"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* کالاهای من — فقط گروه کالاهای درخواست‌های خود کاربر (خواستهٔ مالک) */}
              {(isLoading || categories.length > 0) && (
                <div className="rounded-md border bg-card p-4">
                  <h2 className="flex items-center gap-1.5 text-sm font-bold">
                    <ShoppingBasket size={14} className="text-primary" />
                    کالاهای من
                  </h2>
                  <ul className="mt-2 space-y-0.5">
                    <li>
                      <button
                        type="button"
                        onClick={() => setCategorySlug(undefined)}
                        aria-pressed={!categorySlug}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-start text-sm transition-colors',
                          !categorySlug
                            ? 'font-bold text-primary'
                            : 'text-muted-foreground hover:bg-secondary',
                        )}
                      >
                        <span className="line-clamp-1">همه کالاهای من</span>
                        {!categorySlug && <Check size={14} className="ms-auto shrink-0" />}
                      </button>
                    </li>
                    {isLoading
                      ? Array.from({ length: 3 }).map((_, i) => (
                          <li key={i}>
                            <Skeleton className="h-8 rounded-md" />
                          </li>
                        ))
                      : categories.map((c) => (
                          <li key={c.slug}>
                            <button
                              type="button"
                              onClick={() =>
                                setCategorySlug(c.slug === categorySlug ? undefined : c.slug)
                              }
                              aria-pressed={categorySlug === c.slug}
                              className={cn(
                                'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-start text-sm transition-colors',
                                categorySlug === c.slug
                                  ? 'font-bold text-primary'
                                  : 'text-muted-foreground hover:bg-secondary',
                              )}
                            >
                              <span className="line-clamp-1">{c.name}</span>
                              {categorySlug === c.slug && (
                                <Check size={14} className="ms-auto shrink-0" />
                              )}
                            </button>
                          </li>
                        ))}
                  </ul>
                </div>
              )}

              {/* موقعیت جغرافیایی — همان کارت سایدبار لیست محصولات */}
              <LocationFilterCard
                provinceId={provinceId}
                cityId={cityId}
                onProvinceChange={selectProvince}
                onCityChange={setCityId}
                showReset={hasFilters}
                onReset={resetFilters}
              />
            </aside>

            {/* ستون لیست — تنها ناحیه‌ای که با فیلترها عوض می‌شود */}
            <div className="min-w-0 space-y-4">
              {/* نوار بالا — دسکتاپ: چیپ فیلترهای فعال + مرتب‌سازی (بدون شمار آگهی) */}
              <div className="hidden flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-3 lg:flex">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
                  {chips}
                  {!hasFilters && (
                    <span className="text-xs text-muted-foreground">
                      مرتب‌شده بر اساس درخواست‌های خرید شما
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  {SORTS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSort(opt.key)}
                      aria-pressed={sort === opt.key}
                      className={cn(
                        'rounded-md px-2 py-1 text-xs font-semibold transition-colors',
                        sort === opt.key
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-primary',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* نوار فیلتر — موبایل (الگوی دیوار: کالاهای من، مرتب‌سازی،
                  استان، شهر، جستجو + چیپ‌های فعال)؛ هر کدام بات‌شیت باز می‌کند */}
              <div className="no-scrollbar -mx-3 flex items-center gap-2 overflow-x-auto px-3 pb-2.5 lg:hidden">
                {/* کالاهای من — برچسب عمومی؛ دستهٔ فعال به‌صورت چیپ می‌آید
                    (عین «دسته ها» در نوار دیواری لیست محصولات) */}
                {categories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSheet('categories')}
                    className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:border-foreground/30"
                  >
                    <ShoppingBasket size={14} className="text-muted-foreground" />
                    کالاهای من
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSheet('sort')}
                  className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:border-foreground/30"
                >
                  <ArrowDownWideNarrow size={14} className="text-muted-foreground" />
                  مرتب سازی
                </button>
                {/* استان — قبل از انتخاب ساده، بعد از انتخاب هم‌شکل چیپ فعال */}
                <button
                  type="button"
                  onClick={() => setSheet('province')}
                  aria-label={provinceName ? `تغییر فیلتر استان: ${provinceName}` : 'انتخاب استان'}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-2 text-xs transition-colors',
                    provinceName
                      ? 'max-w-[11rem] border-primary/35 bg-primary/10 font-bold text-primary'
                      : 'border-border bg-card font-medium text-foreground/85 hover:border-foreground/30',
                  )}
                >
                  <MapPin
                    size={14}
                    className={provinceName ? 'text-primary' : 'text-muted-foreground'}
                  />
                  <span className="truncate">{provinceName ?? 'استان'}</span>
                </button>
                {/* شهر — فقط بعد از انتخاب استان (عین سایدبار دسکتاپ) */}
                {provinceId && (
                  <button
                    type="button"
                    onClick={() => setSheet('city')}
                    aria-label={cityName ? `تغییر فیلتر شهر: ${cityName}` : 'انتخاب شهر'}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-2 text-xs transition-colors',
                      cityName
                        ? 'max-w-[11rem] border-primary/35 bg-primary/10 font-bold text-primary'
                        : 'border-border bg-card font-medium text-foreground/85 hover:border-foreground/30',
                    )}
                  >
                    <MapPin
                      size={14}
                      className={cityName ? 'text-primary' : 'text-muted-foreground'}
                    />
                    <span className="truncate">{cityName ?? 'شهر'}</span>
                  </button>
                )}
                {/* جستجو — برچسب عمومی؛ عبارت فعال به‌صورت چیپ می‌آید */}
                <button
                  type="button"
                  onClick={() => setSheet('search')}
                  aria-label="جستجو در فید"
                  className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:border-foreground/30"
                >
                  <Search size={14} className="text-muted-foreground" />
                  جستجو
                </button>
                {activeCategory && (
                  <button
                    type="button"
                    onClick={() => setCategorySlug(undefined)}
                    aria-label={`حذف فیلتر ${activeCategory.name}`}
                    className="inline-flex max-w-[11rem] shrink-0 items-center gap-1.5 rounded-md border border-primary/35 bg-primary/10 px-2.5 py-2 text-xs font-bold text-primary"
                  >
                    <span className="truncate">{activeCategory.name}</span>
                    <X size={13} className="shrink-0" aria-hidden />
                  </button>
                )}
                {s.trim() && (
                  <button
                    type="button"
                    onClick={() => setS('')}
                    aria-label="حذف جستجو"
                    className="inline-flex max-w-[11rem] shrink-0 items-center gap-1.5 rounded-md border border-primary/35 bg-primary/10 px-2.5 py-2 text-xs font-bold text-primary"
                  >
                    <Search size={12} aria-hidden />
                    <span className="truncate">«{s.trim()}»</span>
                    <X size={13} className="shrink-0" aria-hidden />
                  </button>
                )}
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
                    {isFetchingNextPage ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <ChevronDown size={15} />
                    )}
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
            </div>
          </div>

          {/* ── بات‌شیت‌های موبایل — نوار فیلتر دیواری ── */}
          <BottomSheet
            open={sheet === 'categories'}
            onClose={() => setSheet(null)}
            title="کالاهای من"
          >
            <ul>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setCategorySlug(undefined);
                    setSheet(null);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-3 py-3 text-start text-sm transition-colors hover:bg-accent',
                    !categorySlug ? 'font-bold text-primary' : 'font-medium',
                  )}
                >
                  <span>همه کالاهای من</span>
                  {!categorySlug && <Check size={16} className="text-primary" />}
                </button>
              </li>
              {categories.map((c) => (
                <li key={c.slug}>
                  <button
                    type="button"
                    onClick={() => {
                      setCategorySlug(c.slug);
                      setSheet(null);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-md px-3 py-3 text-start text-sm transition-colors hover:bg-accent',
                      categorySlug === c.slug ? 'font-bold text-primary' : 'font-medium',
                    )}
                  >
                    <span className="line-clamp-1">{c.name}</span>
                    {categorySlug === c.slug && <Check size={16} className="text-primary" />}
                  </button>
                </li>
              ))}
            </ul>
          </BottomSheet>

          <BottomSheet open={sheet === 'sort'} onClose={() => setSheet(null)} title="مرتب سازی بر اساس">
            <ul>
              {SORTS.map((opt) => (
                <li key={opt.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setSort(opt.key);
                      setSheet(null);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-md px-3 py-3 text-start text-sm transition-colors hover:bg-accent',
                      sort === opt.key ? 'font-bold text-primary' : 'font-medium',
                    )}
                  >
                    <span>{opt.label}</span>
                    <ChevronLeft
                      size={16}
                      className={sort === opt.key ? 'text-primary' : 'text-muted-foreground/40'}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </BottomSheet>

          <BottomSheet open={sheet === 'province'} onClose={() => setSheet(null)} title="انتخاب استان">
            <ul>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    selectProvince(undefined);
                    setSheet(null);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-3 py-3 text-start text-sm transition-colors hover:bg-accent',
                    !provinceId ? 'font-bold text-primary' : 'font-medium text-muted-foreground',
                  )}
                >
                  <span>همه استان‌ها</span>
                  {!provinceId && <Check size={16} className="text-primary" />}
                </button>
              </li>
              {provinces.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      selectProvince(p.id);
                      setSheet(null);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-md px-3 py-3 text-start text-sm transition-colors hover:bg-accent',
                      provinceId === p.id ? 'font-bold text-primary' : 'font-medium',
                    )}
                  >
                    <span>{p.name}</span>
                    {provinceId === p.id && <Check size={16} className="text-primary" />}
                  </button>
                </li>
              ))}
            </ul>
          </BottomSheet>

          <BottomSheet open={sheet === 'city'} onClose={() => setSheet(null)} title="انتخاب شهر">
            <ul>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setCityId(undefined);
                    setSheet(null);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-3 py-3 text-start text-sm transition-colors hover:bg-accent',
                    !cityId ? 'font-bold text-primary' : 'font-medium text-muted-foreground',
                  )}
                >
                  <span>همه شهرها</span>
                  {!cityId && <Check size={16} className="text-primary" />}
                </button>
              </li>
              {cities.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setCityId(c.id);
                      setSheet(null);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-md px-3 py-3 text-start text-sm transition-colors hover:bg-accent',
                      cityId === c.id ? 'font-bold text-primary' : 'font-medium',
                    )}
                  >
                    <span>{c.name}</span>
                    {cityId === c.id && <Check size={16} className="text-primary" />}
                  </button>
                </li>
              ))}
            </ul>
          </BottomSheet>

          {/* جستجو — ورودی داخل شیت؛ تایپ = فیلتر زندهٔ پشت شیت */}
          <BottomSheet open={sheet === 'search'} onClose={() => setSheet(null)} title="جستجو در فید">
            <div className="px-1 pb-2">
              <div className="flex h-10 items-center gap-1.5 rounded-md border border-input px-2.5 focus-within:border-primary/60">
                <Search size={15} className="shrink-0 text-muted-foreground" />
                <input
                  autoFocus
                  value={s}
                  onChange={(e) => setS(e.target.value)}
                  placeholder="نام کالا، نوع یا فروشنده…"
                  aria-label="جستجو در فید فروشندگان"
                  className="h-full w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {s && (
                  <button
                    type="button"
                    onClick={() => setS('')}
                    aria-label="پاک کردن جستجو"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <p className="mt-2.5 text-xs leading-5 text-muted-foreground">
                نتیجه‌ها همزمان با تایپ در فید زیرین فیلتر می‌شوند.
              </p>
            </div>
          </BottomSheet>
        </>
      )}
    </div>
  );
}
