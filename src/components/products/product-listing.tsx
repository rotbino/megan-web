'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowDownWideNarrow,
  Check,
  ChevronDown,
  ChevronLeft,
  List,
  Loader2,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/products/product-card';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { LocationFilterCard, useFilterState } from '@/components/products/filter-state';
import { logActivity } from '@/lib/activity';
import { CarryFilters } from '@/components/shared/carry-filters';
import { UrlFilterSeed } from '@/components/shared/url-seed';
import { useCities, useCategoryTree, useInfiniteProducts, useProvinces } from '@/lib/mock/hooks';
import { findCategoryPath } from '@/lib/categories';
import { productListHref, writeUrlFilters } from '@/lib/list-nav';
import type { Paged } from '@/lib/mock/api';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Category, Product, SortKey } from '@/lib/types';
/** مرتب‌سازی — دقیقاً مثل باسکول: مرتبط‌ترین / جدیدترین (نردبان‌شده‌ها همیشه بالا) */
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'related', label: 'مرتبط ترین' },
  { key: 'newest', label: 'جدیدترین' },
];

/** گزینهٔ سوم — فقط وقتی زمینهٔ نیاز از «درخواست‌های خرید من» آمده باشد
 *  (خواستهٔ مالک ۱۱-۱۱): «مطابق نیاز من» = اول همان نوع، بعد تطابق حجم و
 *  موجودی و نزدیکی به شهر خریدار؛ نردبان/ویژه هم امتیاز می‌گیرند. */
const MATCH_SORT: { key: SortKey; label: string } = { key: 'match', label: 'مطابق نیاز من' };

type SheetKind = 'categories' | 'sort' | 'province' | 'city' | null;

/** زمینهٔ نیاز خریدار — از پارامترهای URL (ورود از درخواست‌های خرید من) */
interface BuyNeed {
  type?: string;
  amount?: number;
  unit?: string;
  provinceId?: number;
  cityId?: number;
}

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
 * پل زمینهٔ نیاز (خواستهٔ مالک ۱۱-۱۱) — مثل SearchBridge داخل Suspense خودش
 * می‌نشیند تا رندر ایستای گرید کارت‌ها سالم بماند. پارامترها (type/amount/unit/
 * provinceId/cityId) فقط بعد از هیدریشن می‌آیند؛ سورت پیش‌فرض با رسیدن نیاز
 * «مطابق نیاز من» می‌شود و با رفتن آن به «مرتبط‌ترین» برمی‌گردد.
 */
function MatchBridge({ onNeed }: { onNeed: (n: BuyNeed | null) => void }) {
  const sp = useSearchParams();
  const type = sp.get('type')?.trim() ?? '';
  const amount = Number(sp.get('amount')) || 0;
  const unit = sp.get('unit')?.trim() ?? '';
  const provinceId = Number(sp.get('provinceId')) || 0;
  const cityId = Number(sp.get('cityId')) || 0;
  useEffect(() => {
    // هیچ پارامتری نیست → نیاز خاموش؛ وابستگی‌ها primitive تا هر رندر دوباره
    // فعال نشود و رد شدنِ کاربر (حذف چیپ) تا پیمایش بعدی URL پایدار بماند
    if (!type && !amount && !provinceId && !cityId) {
      onNeed(null);
      return;
    }
    onNeed({
      ...(type ? { type } : {}),
      ...(amount > 0 ? { amount } : {}),
      ...(unit ? { unit } : {}),
      ...(provinceId > 0 ? { provinceId } : {}),
      ...(cityId > 0 ? { cityId } : {}),
    });
  }, [type, amount, unit, provinceId, cityId, onNeed]);
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
  /** دیتای اولیه SSR (صفحهٔ initialPage، مرتبط‌ترین، فیلترهای seed) — فقط برای همان کوئری seed می‌شود */
  initialData?: Paged<Product>;
  /** سایدبار سرور-رندر (CategoryFilter) — از مرز کلاینت خارج است (F5) */
  sidebar?: ReactNode;
  /** فیلتر مکان اولیه از URL سئو (صفحهٔ فرود شهری /search/[q]/[city]) —
   *  فقط seed اولیهٔ state است؛ کاربر بعد از آن آزادانه عوض/حذف می‌کند */
  initialProvinceId?: number;
  initialCityId?: number;
  /** شمارهٔ صفحه از URL سئو (/product-list/2 و…) — خواستهٔ مالک ۱۴-۱۱:
   *  هر پیج آدرس جدا برای ایندکس جداگانهٔ گوگل */
  initialPage?: number;
  /** آدرس تمیز صفحهٔ ۱ (مثل /product-list) — داده شود یعنی صفحه‌بندی لینکی */
  page1Href?: string;
  /** الگوی آدرس صفحه‌های ۲ به بعد با جای‌نگهدار {p} (مثل /product-list/{p}) */
  pageHrefPattern?: string;
  /** حالت ستون-لیست (خواستهٔ مالک ۱۷-۱۱): صفحهٔ دسته که گرید صفحه و سایدبار
   *  را از layout می‌گیرد — این کامپوننت فقط ستون لیست + شیت‌ها را رندر می‌کند */
  embedded?: boolean;
}

function ProductListingInner({
  categorySlug,
  categoryName,
  searchQuery,
  initialData,
  sidebar,
  initialProvinceId,
  initialCityId,
  initialPage,
  page1Href,
  pageHrefPattern,
  embedded,
}: ProductListingInnerProps) {
  const router = useRouter();
  /** جستجوی پایه — از prop مسیر (صفحه جستجو) یا خالی (لیست/دسته‌بندی) */
  const baseS = searchQuery ?? '';
  const [s, setS] = useState(baseS);

  const [sort, setSort] = useState<SortKey>('related');
  // فیلتر مکان (خواستهٔ مالک ۱۷-۱۱): در صفحهٔ دسته از Context مشترک با
  // سایدبارِ layout می‌آید تا هنگام ناوبری بین دسته‌ها انتخاب کاربر حفظ شود
  // و کارت مکان با کوئری لیست هم‌نوا بماند؛ در بقیهٔ صفحه‌ها (بدون provider)
  // state محلی عین قبل — seed از URL سئو (صفحهٔ فرود شهری).
  const ctx = useFilterState();
  const [localProvinceId, setLocalProvinceId] = useState<number | undefined>(initialProvinceId);
  const [localCityId, setLocalCityId] = useState<number | undefined>(initialCityId);
  const provinceId = ctx ? ctx.provinceId : localProvinceId;
  const cityId = ctx ? ctx.cityId : localCityId;
  /** انتخاب استان — شهر وابسته را هم پاک می‌کند (هر دو مسیر) */
  const selectProvince = useCallback(
    (id: number | undefined) => {
      if (ctx) ctx.setProvince(id); // provider خودش URL را هم هم‌گام می‌کند
      else {
        setLocalProvinceId(id);
        setLocalCityId(undefined);
        writeUrlFilters({ province: id != null ? String(id) : null, city: null });
      }
    },
    [ctx],
  );
  const selectCity = useCallback(
    (id: number | undefined) => {
      if (ctx) ctx.setCity(id);
      else {
        setLocalCityId(id);
        writeUrlFilters({ city: id != null ? String(id) : null });
      }
    },
    [ctx],
  );

  /** تغییر سورت — state + URL بدون ناوبری (خواستهٔ مالک ۱۷-۱۱ دور ۲)؛
   *  «مطابق نیاز من» از زمینهٔ نیاز مشتق می‌شود و در URL ثبت نمی‌شود */
  const applySort = useCallback((k: SortKey) => {
    setSort(k);
    writeUrlFilters({ sort: k === 'newest' ? 'newest' : null });
  }, []);

  // ── seed فیلترها از URL (خواستهٔ مالک ۱۷-۱۱ دور ۲) ──────────────────
  // ورود با لینک اشتراک‌گذاری/رفرش/back: صفحه‌ها ایستا رندر می‌شوند و این
  // پارامترها را نمی‌بینند؛ برگهٔ نامرئی UrlFilterSeed (عین SearchBridge)
  // یک‌بار بعد از هیدریشن مقدارها را می‌رساند. seed سئوی مکان (صفحهٔ فرود
  // شهری /search/[q]/[city]) هم اگر در URL نباشد به URL منتقل می‌شود تا
  // آدرس همیشه حقیقت فیلترها را داشته باشد و اشتراک‌گذاری‌پذیر باشد.
  const seedUrlFilters = useCallback(
    (url: { provinceId?: number; cityId?: number; sort?: 'newest' }) => {
      if (url.sort) applySort(url.sort);
      if (!ctx) {
        if (url.provinceId !== undefined || url.cityId !== undefined) {
          setLocalProvinceId(url.provinceId);
          setLocalCityId(url.provinceId !== undefined ? url.cityId : undefined);
        } else if (initialProvinceId != null || initialCityId != null) {
          writeUrlFilters({
            ...(initialProvinceId != null ? { province: String(initialProvinceId) } : {}),
            ...(initialCityId != null ? { city: String(initialCityId) } : {}),
          });
        }
      }
    },
    [applySort, ctx, initialProvinceId, initialCityId],
  );

  // ── زمینهٔ نیاز خریدار (خواستهٔ مالک ۱۱-۱۱) — ورود از درخواست‌های خرید ──
  // با رسیدن نیاز، سورت پیش‌فرض «مطابق نیاز من» می‌شود؛ با رفتن آن (حذف
  // چیپ یا پیمایش به مسیر بدون پارامتر) به «مرتبط‌ترین» برمی‌گردد — الگوی
  // تنظیم state در زمان رندر (بدون افکت)
  const [need, setNeed] = useState<BuyNeed | null>(null);
  const handleNeed = useCallback((n: BuyNeed | null) => {
    setNeed(n);
    // سورتِ «مطابق نیاز من» از نیاز مشتق می‌شود — پارامتر کهنهٔ sort پاک شود
    if (n) writeUrlFilters({ sort: null });
  }, []);
  const [lastNeed, setLastNeed] = useState<BuyNeed | null>(null);
  if (need !== lastNeed) {
    setLastNeed(need);
    setSort(need ? 'match' : 'related');
  }
  const sorts = need ? [MATCH_SORT, ...SORTS] : SORTS;

  // موبایل — مودال‌های انتخاب (بات‌شیت پایین‌رونده)
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [catStack, setCatStack] = useState<Category[]>([]);

  const { data: tree = [] } = useCategoryTree(); // فقط برای بات‌شیت موبایل — seed سرور
  const { data: provinces = [] } = useProvinces();
  const { data: cities = [], isLoading: citiesLoading } = useCities(provinceId);

  // ناوبری بین صفحات جستجو (q جدید از هدر) — همگام‌سازی s با prop سرور
  // (الگوی تنظیم state در زمان رندر — بدون افکت)
  const [lastBaseS, setLastBaseS] = useState(baseS);
  if (lastBaseS !== baseS) {
    setLastBaseS(baseS);
    setS(baseS);
  }

  // ── دستهٔ فعال (خواستهٔ مالک ۱۸-۱۱ دور ۲) ──────────────────────────
  // روی صفحهٔ دسته، تعویض دسته از سایدبار کلاینت‌ساید است (navigateCategory —
  // pushState بومی، بدون ناوبری سرور): نوار فیلتر/دکمه‌های سورت هیچ‌گاه ریمونت
  // یا اسکلت نمی‌شوند و کوئری لیست از کش React Query فوری جواب می‌گیرد.
  // تا وقتی override کلاینت فعال نباشد، همان prop سرور (SSR/سئو) حاکم است.
  const clientCat = ctx?.category ?? null;
  const activeCategorySlug = clientCat?.slug ?? categorySlug;
  const activeCategoryName = clientCat?.name ?? categoryName;

  // با تغییر فیلترها کلید کوئری عوض می‌شود و لیست بی‌پایان از صفحهٔ ۱ شروع می‌شود
  const query = useMemo(
    () => ({
      categorySlug: activeCategorySlug,
      s,
      provinceId,
      cityId,
      sort,
      // زمینهٔ تطابق — فقط با سورت match به بک‌اند می‌رود
      ...(sort === 'match' && need
        ? {
            matchType: need.type,
            matchAmount: need.amount,
            matchUnit: need.unit,
            nearProvinceId: need.provinceId,
            nearCityId: need.cityId,
          }
        : {}),
    }),
    [activeCategorySlug, s, provinceId, cityId, sort, need],
  );

  // seed فقط وقتی کوئری فعال عین کوئری اولیهٔ SSR باشد (تطبیق ساخت‌یافته — بدون JSON.stringify)؛
  // SSR در هر مسیر صفحه (۱، ۲، ۳…) با همان شمارهٔ صفحه پخته شده است؛ اگر
  // کاربر فیلتر یا دسته را عوض/بردارد، seed دیگر نمی‌خورد و fetch تازه می‌رود
  const isDefaultFilters =
    (!clientCat || clientCat.slug === categorySlug) &&
    sort === 'related' &&
    !need &&
    provinceId === initialProvinceId &&
    cityId === initialCityId &&
    s === baseS;

  // ─── اسکرول بی‌پایان (خواستهٔ مالک ۱۴-۱۱) ─────────────────────────
  // صفحه‌ها به‌هم می‌چسبند؛ پیش‌واکشی بافر ۲ صفحه‌ای پشت صحنه انجام می‌شود
  // تا کاربر تاخیر لود صفحهٔ بعد را حس نکند و لود اولیه هم کند نشود.
  // سوییچ کلاینت‌ساید به دستهٔ دیگر همیشه از صفحهٔ ۱ شروع می‌شود (URL تمیزِ همان دسته).
  const firstPage = clientCat && clientCat.slug !== categorySlug ? 1 : (initialPage ?? 1);
  const { data, isLoading, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useInfiniteProducts(query, isDefaultFilters ? initialData : undefined);

  // مسطح‌سازی + ضدتکرار (تغییر داده بین fetchهای صفحه‌ای نباید کارت تکراری بیاورد)
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
  const lastMeta = data?.pages.at(-1);
  const total = lastMeta?.total ?? 0;

  // کوئری فعال را نزد provider (سایدبار layout دسته) ثبت کن تا پیش‌واکشی
  // hover روی لینک دسته‌ها با همان فیلترهای فعال انجام شود (خواستهٔ مالک ۱۸-۱۱ دور ۲)
  useEffect(() => {
    ctx?.setActiveQuery(query);
  }, [ctx, query]);

  // ثبت بازدید دستهٔ سوییچ‌شده — عین CategoryViewPing سرور، برای مسیر کلاینت‌ساید
  // (ping دستهٔ SSR را خود صفحه می‌زند؛ این فقط برای تعویض‌های بعدی است)
  useEffect(() => {
    if (!clientCat) return;
    logActivity({ type: 'category_view', categoryName: clientCat.name }, `c:${clientCat.name}`);
  }, [clientCat]);

  // ── هم‌نمایی دستهٔ فعال با URL (خواستهٔ مالک ۱۸-۱۱ دور ۲) ─────────────
  // back/forward مرورگر به ورودی‌های سوییچ کلاینت‌ساید (pushState): Next برای
  // این ورودی‌ها درخت کش‌شدهٔ دستهٔ قبلی را بدون فچ برمی‌گرداند؛ این هم‌نماکننده
  // override را با مقصد واقعی URL تنظیم/پاک می‌کند تا همیشه همان دسته‌ای که
  // در آدرس هست نمایش داده شود — و چون کوئری کلاینت‌ساید است، برگشت/پیش‌روی
  // هم از کش React Query فوری جواب می‌گیرد (بدون اسکلت). mount هم پوشش
  // می‌دهد (بازگشت به ورودی pushState بعد از ریمونت provider).
  const syncCategoryFromUrl = useCallback(() => {
    const m = window.location.pathname.match(/^\/product-list\/category\/([^/]+)/);
    const urlSlug = m ? decodeURIComponent(m[1]) : undefined;
    // گارد تساوی — setState تکراری نده (حلقهٔ رندر از مسیر ctx → effect)
    if (urlSlug && urlSlug !== categorySlug) {
      if (ctx?.category?.slug === urlSlug) return; // هم‌نواست
      // درخت سرور کهنه است — override کلاینت با مقصد URL هم‌نما می‌شود؛
      // navigateCategory وقتی URL همان دسته باشد فقط state/عنوان را عوض می‌کند
      const p = findCategoryPath(tree, urlSlug);
      ctx?.navigateCategory(urlSlug, p?.[p.length - 1]?.categoryName ?? urlSlug);
    } else if (ctx?.category) {
      // درخت سرور با URL هم‌نواست — override خاموش (SSR حاکم) و عنوان به SSR برمی‌گردد
      ctx.clearCategory();
      if (categoryName) {
        document.title = `${categoryName} - خرید و قیمت ${categoryName} عمده | ارزان‌ترین قیمت`;
      }
    }
  }, [ctx, categorySlug, categoryName, tree]);
  useEffect(() => {
    if (!ctx) return;
    syncCategoryFromUrl();
    window.addEventListener('popstate', syncCategoryFromUrl);
    return () => window.removeEventListener('popstate', syncCategoryFromUrl);
  }, [ctx, syncCategoryFromUrl]);

  /** صفحهٔ در حال مشاهده (۱ = اولین صفحهٔ لودشده) — از جایگاه ویوپورت در گرید */
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
      const perPage = rect.height / loadedCount; // میانگین ارتفاع هر صفحه
      if (perPage <= 0) return;
      // لبهٔ پایین ویوپورت چند صفحه عمقی است؟ (ceil — صفحه‌ای که تازه شروع شده)
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

  /** بافر پیش‌واکشی (خواستهٔ مالک ۱۴-۱۱): همیشه ۲ صفحه جلوتر از صفحهٔ در حال
   *  مشاهده در پس‌زمینه آماده باشد — بعد از لود اولیه idle می‌شود تا با
   *  هیدریشن/LCP رقابت نکند؛ هر صفحهٔ جدید زنجیره را دوباره ارزیابی می‌کند. */
  useEffect(() => {
    if (!hasNextPage || isFetching || isLoading) return;
    if (loadedCount >= viewedPage + 2) return; // بافر کامل
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

  /** نگهبان انتهای گرید — تور ایمنی روی تخمین viewedPage (rootMargin عمیق:
   *  پیش از رسیدن کاربر به انتها فعال می‌شود) */
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

  const reset = () => {
    selectProvince(undefined);
    setSort('related');
    setNeed(null); // زمینهٔ نیاز هم فیلتر است — «حذف همه» آن را هم می‌برد
    // پاک‌سازی URL بدون ناوبری — فیلتر مکان را selectProvince می‌برد؛
    // سورت و پارامترهای نیاز همین‌جا (تا MatchBridge دوباره فعالشان نکند)
    writeUrlFilters({ sort: null, type: null, amount: null, unit: null, provinceId: null, cityId: null });
    if (s) router.replace('/product-list');
  };

  const hasFilters = !!provinceId || !!cityId || !!s || !!need || sort !== 'related';

  // ثبت فیلترهای محلی صفحه نزد سایدبار layout (صفحهٔ دسته): دکمهٔ «حذف همهٔ
  // فیلترها»ی سایدبار باید سورت/جستجو/نیاز را هم پاک کند — عین رفتار قبل
  const hasPageFilters = !!s || !!need || sort !== 'related';
  const pageReset = useCallback(() => {
    setSort('related');
    setNeed(null);
    writeUrlFilters({ sort: null, type: null, amount: null, unit: null, provinceId: null, cityId: null });
    if (s) router.replace('/product-list');
  }, [s, router]);
  useEffect(() => {
    if (!ctx || !embedded) return;
    ctx.setPageReset(hasPageFilters ? pageReset : null);
    return () => {
      ctx.setPageReset(null);
    };
  }, [ctx, embedded, hasPageFilters, pageReset]);

  // ─── موبایل: انتخاب دسته سلسله‌مراتبی ─────────────────────────
  const sheetLevel = catStack[catStack.length - 1];
  const sheetItems = sheetLevel ? (sheetLevel.children ?? []) : tree;

  /**
   * باز کردن بات‌شیت دسته‌ها — روی صفحه دسته، پشته تا سطح دسته فعال
   * پیش‌تنظیم می‌شود (نه از ریشه) تا هم‌ترازهای/فرزندان همان دسته دیده شوند؛
   * برای برگ، یک سطح عقب‌تر (هم‌ترازهای خودش) — عین رفتار باسکول.
   */
  const openCategoriesSheet = () => {
    if (activeCategorySlug) {
      const p = findCategoryPath(tree, activeCategorySlug);
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
    // (خواستهٔ مالک ۱۸-۱۱ دور ۲) روی صفحهٔ دسته، انتخاب بات‌شیت موبایل هم
    // کلاینت‌ساید است — بدون ناوبری سرور و با کش React Query
    if (ctx) {
      ctx.navigateCategory(c.slug, c.categoryName);
      return;
    }
    router.push(productListHref(`/product-list/category/${encodeURIComponent(c.slug)}`));
  };

  const closeSheets = () => {
    setSheet(null);
    setCatStack([]);
  };

  /** حذف دسته — فیلترهای دیگر (استان/شهر/سورت/جستجو/نیاز) حفظ می‌شوند */
  const clearCategory = () => router.push(productListHref('/product-list'));

  // ─── چیپ‌های فیلتر فعال — نوار مرتب‌سازی (خواسته مالک ۳۰-۱۰) ────────────
  // هر فیلتر انتخاب‌شده به‌صورت دکمه آبی کمرنگ با آیکون بستن می‌آید؛
  // همیشه فقط «آخرین سطح» نمایش داده می‌شود:
  //  • دسته: فقط خود دسته فعال (نه زنجیره اجداد)
  //  • مکان: شهر انتخاب شده → فقط شهر؛ وگرنه فقط استان
  // چیپ مکان فقط دسکتاپ است — در موبایل دکمه‌های استان/شهر نوار فیلتر
  // همان نقش را دارند (خواستهٔ مالک ۸-۱۱ دور ۲۳)
  const provinceName = provinces.find((p) => p.id === provinceId)?.name;
  const cityName = cityId ? cities.find((c) => c.id === cityId)?.name : undefined;

  /** حذف جستجو — مسیر-محور (?s= یا /search/[q]) یا محلی */
  const removeSearch = () => {
    if (searchQuery || s) router.replace('/product-list');
    setS('');
  };

  const baseChips = (
    <>
      {/* زمینهٔ نیاز — چیپ اول (خواستهٔ مالک ۱۱-۱۱): «آگریا · ۵۰۰ کیلوگرم»؛
          حذفش = برگشت به مرور عادی دسته */}

      {activeCategoryName && (
        <button
          type="button"
          onClick={clearCategory}
          aria-label={`حذف فیلتر دسته ${activeCategoryName}`}
          title="حذف فیلتر دسته"
          className="inline-flex max-w-[11rem] shrink-0 items-center gap-1.5 rounded-md border border-primary/35 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/15"
        >
          <span className="truncate">{activeCategoryName}</span>
          <X size={13} className="shrink-0" aria-hidden />
        </button>
      )}
      {need && (
          <button
              type="button"
              onClick={() => setNeed(null)}
              aria-label="حذف تطابق با نیاز"
              title="حذف تطابق با نیاز شما — مرور عادی دسته"
              className="inline-flex max-w-[15rem] shrink-0 items-center gap-1.5 rounded-md border border-primary/35 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/15"
          >
            <span className="truncate">
              {need.type ? ` نوع ${need.type}` : ''}
              {need.amount ? ` · ${toFa(need.amount)} ${need.unit ?? ''}` : ''}
          </span>
            <X size={13} className="shrink-0" aria-hidden />
          </button>
      )}
      {s && (
        <button
          type="button"
          onClick={removeSearch}
          aria-label="حذف جستجو"
          title="حذف جستجو"
          className="inline-flex max-w-[11rem] shrink-0 items-center gap-1.5 rounded-md border border-primary/35 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/15"
        >
          <Search size={12} className="shrink-0" aria-hidden />
          <span className="truncate">«{s}»</span>
          <X size={13} className="shrink-0" aria-hidden />
        </button>
      )}
    </>
  );

  const locationChips = cityName ? (
    <button
      type="button"
      onClick={() => selectCity(undefined)}
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
  ) : null;

  const chips = (
    <>
      {baseChips}
      {locationChips}
    </>
  );

  // ─── سایدبار دسکتاپ (بدون تغییر) ──────────────────────────────
  // سایدبار فیلتر (حالت عادی) — بخش دسته‌ها سرور-رندر (prop)؛ کارت مکان از
  // LocationFilterCard کنترل‌شده. در صفحهٔ دسته (embedded) سایدبار اینجا نیست — از layout می‌آید.
  const filterContent = (
    <>
      <div className="rounded-md border bg-card p-4">
        {/* لینک‌های درخت (Server Component) — کلیک با فیلترهای فعال URL همراه می‌شود */}
        <CarryFilters>{sidebar}</CarryFilters>
      </div>
      <LocationFilterCard
        provinceId={provinceId}
        cityId={cityId}
        onProvinceChange={selectProvince}
        onCityChange={selectCity}
        showReset={hasFilters}
        onReset={reset}
      />
    </>
  );

  // ─── ستون لیست — تنها ناحیه‌ای که در ناوبری دسته‌ها عوض می‌شود ──────────
  // (خواستهٔ مالک ۱۷-۱۱): هدر/فوتر و سایدبار فیلترها از layoutها می‌آیند؛
  // این fragment داخل ستون layout دسته (یا گرید همین کامپوننت در حالت عادی)
  // می‌نشیند و پل‌های نامرئی جستجو/نیاز هم همین‌جا می‌مانند.
  const listColumn = (
    <>
      {/* پل جستجو — فقط همین ناحیه در رندر ایستا به CSR می‌افتد (نامرئی)؛
          در صفحه جستجوی مسیر-محور لازم نیست (s از prop سرور می‌آید) */}
      {!searchQuery && (
        <Suspense>
          <SearchBridge onS={setS} />
        </Suspense>
      )}
      {/* پل زمینهٔ نیاز — ?type=&amount=&unit=&provinceId=&cityId= (۱۱-۱۱) */}
      <Suspense>
        <MatchBridge onNeed={handleNeed} />
      </Suspense>
      {/* seed فیلترهای مکان/سورت — ?province= &city= &sort=newest (۱۷-۱۱ دور ۲) */}
      <UrlFilterSeed onSeed={seedUrlFilters} />

        {/* نوار بالا — دسکتاپ: چیپ فیلترهای فعال + مرتب‌سازی (بدون شمار آگهی — خواسته مالک ۱-۱۱) */}
        <div className="hidden flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-3 lg:flex">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
            {chips}
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            {sorts.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => applySort(opt.key)}
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

        {/* نوار فیلتر و مرتب‌سازی — موبایل (الگوی باسکول/دیوار: دسته ها، مرتب
            سازی، فیلترهای فعال). فیلتر مکان عین دسکتاپ اینجا است (خواستهٔ مالک
            ۸-۱۱ دور ۲۳): اول استان، با انتخاب استان دکمهٔ شهر ظاهر می‌شود */}
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
            <MapPin size={14} className={provinceName ? 'text-primary' : 'text-muted-foreground'} />
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
              <MapPin size={14} className={cityName ? 'text-primary' : 'text-muted-foreground'} />
              <span className="truncate">{cityName ?? 'شهر'}</span>
            </button>
          )}
          {baseChips}
        </div>

        {/* گرید — ref برای تخمین صفحهٔ در حال مشاهده (بافر پیش‌واکشی) */}
        <div ref={gridRef}>
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
            <div
              className={cn(
                'grid grid-cols-1 gap-2.5 transition-opacity md:grid-cols-3 md:gap-4 xl:grid-cols-4',
                isFetching && !isFetchingNextPage && 'opacity-60',
              )}
            >
              {items.map((p, i) => (
                // اولین ردیف کارت‌ها (LCP) eager لود می‌شود — بقیه lazy
                <ProductCard key={p.id} product={p} priority={i < 4} />
              ))}
            </div>
          )}
        </div>

        {/* ─── اسکرول بی‌پایان: لینک «مشاهده بیشتر» سئو (خواستهٔ مالک ۱۴-۱۱) ───
            موتور جستجو نمی‌تواند اسکرول کند — این <a href> واقعی به URL صفحهٔ
            بعدی می‌رود و زنجیرهٔ کشف گوگل را زنده نگه می‌دارد؛ برای کاربرِ جاوااسکریپت‌دار
            کلیک = لود درجا (preventDefault)؛ صفحهٔ آخر → دکمه حذف می‌شود */}
        {!isLoading && items.length > 0 && hasNextPage && (
          <div className="flex flex-col items-center gap-2 pt-3">
            {isDefaultFilters && page1Href && pageHrefPattern ? (
              <Button asChild variant="outline" className="gap-1.5 rounded-md px-6 font-bold">
                {/* href واقعی (کرال‌پذیر) = اولین صفحهٔ لودنشده — با اسکرول کاربر جلو می‌رود */}
                <a
                  href={
                    firstPage + loadedCount <= 1
                      ? page1Href
                      : (pageHrefPattern ?? '').replace('{p}', String(firstPage + loadedCount))
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
              /* فیلتر کلاینت‌ساید فعال — URL اختصاصی ندارد؛ دکمهٔ ساده */
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
        {!isLoading && items.length > 0 && !hasNextPage && loadedCount > 1 && (
          <p className="pt-3 text-center text-xs text-muted-foreground">
            همهٔ {toFa(total)} آگهی این لیست نمایش داده شد
          </p>
        )}

      {/* نگهبان اسکرول — ۱۲۰۰px قبل از رسیدن به انتها صفحهٔ بعد را می‌خواهد */}
      <div ref={sentinelRef} aria-hidden className="h-px" />
    </>
  );

  // بات‌شیت‌های موبایل — fixed هستند؛ جای‌شان در درخت مهم نیست
  const sheets = (
    <>
      {/* ─── بات‌شیت انتخاب دسته — موبایل (سلسله‌مراتبی با دکمه بازگشت) ── */}
      <BottomSheet
        open={sheet === 'categories'}
        onClose={closeSheets}
        onBack={catStack.length ? () => setCatStack((st) => st.slice(0, -1)) : undefined}
        title={sheetLevel ? sheetLevel.categoryName : 'همه دسته ها'}
      >
        {/* میان‌بر: همه محصولات دسته فعال (مثل باسکول؛ خواستهٔ مالک ۱۸-۱۱:
            بدون فعل «مشاهده» — فقط «همه محصولات …») */}
        {activeCategoryName && activeCategorySlug && (
          <Link
            href={`/product-list/category/${encodeURIComponent(activeCategorySlug)}`}
            onClick={closeSheets}
            className="mb-1 flex items-center justify-between gap-2 rounded-md bg-primary/5 px-3 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/10"
          >
            همه محصولات {activeCategoryName}
            <ChevronLeft size={16} aria-hidden />
          </Link>
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
          {sorts.map((opt) => (
            <li key={opt.key}>
              <button
                type="button"
                onClick={() => { applySort(opt.key); setSheet(null); }}
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

      {/* ─── بات‌شیت انتخاب استان — موبایل؛ عین سایدبار دسکتاپ، فقط
          جای آن در نوار فیلتر است (خواستهٔ مالک ۸-۱۱ دور ۲۳) ── */}
      <BottomSheet
        open={sheet === 'province'}
        onClose={() => setSheet(null)}
        title="انتخاب استان"
      >
        <ul>
          <li>
            <button
              type="button"
              onClick={() => { selectProvince(undefined); setSheet(null); }}
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
                onClick={() => { selectProvince(p.id); setSheet(null); }}
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

      {/* ─── بات‌شیت انتخاب شهر — موبایل؛ فقط با استان انتخاب‌شده ── */}
      <BottomSheet
        open={sheet === 'city'}
        onClose={() => setSheet(null)}
        title={provinceName ? `شهرهای ${provinceName}` : 'انتخاب شهر'}
      >
        <ul>
          <li>
            <button
              type="button"
              onClick={() => { selectCity(undefined); setSheet(null); }}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded-md px-3 py-3 text-start text-sm transition-colors hover:bg-accent',
                !cityId ? 'font-bold text-primary' : 'font-medium text-muted-foreground',
              )}
            >
              <span>همه شهرها</span>
              {!cityId && <Check size={16} className="text-primary" />}
            </button>
          </li>
          {citiesLoading ? (
            <li className="space-y-2 p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-md" />
              ))}
            </li>
          ) : (
            cities.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => { selectCity(c.id); setSheet(null); }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-3 py-3 text-start text-sm transition-colors hover:bg-accent',
                    cityId === c.id ? 'font-bold text-primary' : 'font-medium',
                  )}
                >
                  <span>{c.name}</span>
                  {cityId === c.id && <Check size={16} className="text-primary" />}
                </button>
              </li>
            ))
          )}
        </ul>
      </BottomSheet>
    </>
  );

  // حالت embedded (صفحهٔ دسته): گرید صفحه و سایدبار از layout دسته می‌آیند —
  // فقط ستون لیست + شیت‌ها اینجا رندر می‌شود؛ ناوبری سیب→هلو فقط همین ناحیه
  // را با loading.tsx عوض می‌کند و بقیهٔ صفحه سر جایش می‌ماند (خواستهٔ مالک ۱۷-۱۱).
  if (embedded) {
    return (
      <>
        {listColumn}
        {sheets}
      </>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-4 lg:grid-cols-[260px_1fr] lg:px-6 lg:py-6">
      {/* سایدبار فیلتر — دسکتاپ؛ چسبان (خواستهٔ مالک ۱۴-۱۱): هنگام اسکرول
          صفحه سر جایش می‌ماند و همیشه دیده می‌شود؛ اگر از ارتفاع ویوپورت
          بلندتر باشد خودش اسکرول داخلی می‌گیرد (self-start تا آیتم گرید
          کشیده نشود و sticky اثر کند — ارتفاع هدر ۱۱۷px + فاصله ۸px) */}
      <aside
        className="hidden space-y-5 lg:block lg:self-start lg:sticky lg:top-[125px] lg:max-h-[calc(100vh-141px)] lg:overflow-y-auto lg:pb-1"
        aria-label="فیلترها"
      >
        {filterContent}
      </aside>

      {/* لیست */}
      <div className="min-w-0 space-y-4">{listColumn}</div>
      {sheets}
    </div>
  );
}

export function ProductListing({
  categorySlug,
  categoryName,
  searchQuery,
  initialData,
  sidebar,
  initialProvinceId,
  initialCityId,
  initialPage,
  page1Href,
  pageHrefPattern,
  embedded,
}: {
  categorySlug?: string;
  categoryName?: string;
  searchQuery?: string;
  initialData?: Paged<Product>;
  sidebar?: ReactNode;
  initialProvinceId?: number;
  initialCityId?: number;
  initialPage?: number;
  page1Href?: string;
  pageHrefPattern?: string;
  embedded?: boolean;
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
      initialProvinceId={initialProvinceId}
      initialCityId={initialCityId}
      initialPage={initialPage}
      page1Href={page1Href}
      pageHrefPattern={pageHrefPattern}
      embedded={embedded}
    />
  );
}
