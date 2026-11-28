'use client';

/**
 * صفحهٔ فیلتر پیشرفتهٔ عمده — دور ۴ (بازخورد مالک ۲۸-۱۱ دور ۴):
 *
 *  ۱) سرچ‌باکس فقط در هدر — درِ بدنه حذف شد؛ با پراپ filterSearch هدر، جستجو
 *     همین‌جا در صفحه فیلتر می‌زند (رویداد محلی + آینهٔ عبارت/چیپ)؛
 *  ۲) زیر-هدر چسبان (به‌جای نوار «دسته بندی | فروشنده شوید» حذف‌شده): نوار
 *     فیلتر + نوار نتیجه (چیپ‌های فعال + شمار + مرتب‌سازی) — موقع اسکرول
 *     هرگز غیب نمی‌شود، نه در دسکتاپ نه موبایل؛ ارتفاع هدر زمان اجرا اندازه
 *     می‌شود تا چسبندگی بی‌درز باشد؛
 *  ۳) مرتب‌سازی «تهِ نوار» است — اول فیلترهای منتخب/شمار، آخر (فاصلهٔ
 *     space-between) دکمهٔ درآپ‌داون سورت؛
 *  ۴) گزینه‌های وابسته (دور ۴): کشور تولیدکننده ← نوع/برند؛ انتخاب فرزند
 *     والدش را خودکار می‌نشاند و والد عوض‌شده فرزند ناهمخوان را می‌پاکد؛
 *  ۵) کارت دعوت فروشنده با تصویر — سایدبار دسکتاپ + انتهای لیست موبایل؛
 *  ۶) اسکرول بی‌نهایت + پیش‌واکش بافر ۲ صفحه + دکمهٔ «مشاهده آگهی‌های بیشتر»
 *     با href واقعی برای گوگل؛ شیت‌های دریل‌شونده ارتفاع ثابت ۷۰٪ دارند.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  ArrowUpDown,
  BadgeCheck,
  Banknote,
  ChevronDown,
  ImageOff,
  Layers,
  Loader2,
  MapPin,
  Package,
} from 'lucide-react';
import {
  chainOf,
  impliedParent,
  pruneAttrSelection,
  visibleAttrOptions,
  fetchCatalogV2List,
  fetchCatalogV2Tree,
  type CatalogV2Attr,
  type CatalogV2Row,
  type CatalogV2Sort,
  type CatalogV2TreeNode,
} from '@/lib/catalog-v2';
import { FILTER_SEARCH_SUBMIT, dispatchFilterSearchSync } from '@/lib/filter-search';
import { getCities, getProvinces } from '@/lib/mock/api';
import { useAuth } from '@/lib/mock/auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { priceFa, toFa } from '@/lib/format';
import {
  ActiveChip,
  AttrCheckboxRow,
  CatalogCard,
  CategorySheetBody,
  DualChip,
  LocationPickerBody,
  MoqChips,
  OptionsSheetBody,
  PER_PAGE,
  RangeInputs,
  RangeSheetBody,
  SellerCtaCard,
  SideCategories,
  SORTS,
  unitShort,
  type FilterState,
} from './product-filter-parts';

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

  /** ورود عمیق ?page=N — لینک سئو/گوگل: صفحه‌های ۲..N بی‌صدا پشت هم لود
   *  می‌شوند. یک‌بار در مونت خوانده می‌شود (setState-اِول) چون همگام‌ساز URL
   *  بعد از مونت پارامتر page را بازنویسی می‌کند و خوانش دوباره از sp عمق
   *  ورود را گم می‌کند. */
  const [initialPage] = useState(() => Math.max(1, Number(sp.get('page')) || 1));

  const [f, setF] = useState<FilterState>(() => ({
    nodeKey: sp.get('node') ?? 'all',
    provinceId: sp.get('province') ? Number(sp.get('province')) : undefined,
    cityId: sp.get('city') ? Number(sp.get('city')) : undefined,
    attrs: parseAttrsParam(sp.get('a')),
    priceMin: sp.get('pmin') ? Number(sp.get('pmin')) : undefined,
    priceMax: sp.get('pmax') ? Number(sp.get('pmax')) : undefined,
    moqMin: sp.get('mmin') ? Number(sp.get('mmin')) : undefined,
    moqMax: sp.get('mmax') ? Number(sp.get('mmax')) : undefined,
    // مرتبط‌ترین = پیش‌فرض (امتیاز تطابق سمت سرور — شهر کاربر + ویژگی‌ها + تازگی)
    sort: (sp.get('sort') as CatalogV2Sort) || 'related',
  }));
  /** عبارت جستجوی فعال — سرچ‌باکس فقط در هدر است (دور ۴)؛ این‌جا با رویداد
   *  FILTER_SEARCH_SUBMIT پر می‌شود و با چیپ جستجو خالی؛ SYNC آن را به هدر
   *  آینه می‌کند. debounce-state حذف شد — اینترِ هدر نتیجهٔ نهایی است. */
  const [q, setQ] = useState(sp.get('q') ?? '');

  /** تغییر هر فیلتر (صفحه در state نیست — اسکرول بی‌نهایت) */
  const patch = (p: Partial<FilterState>) => setF((cur) => ({ ...cur, ...p }));

  // جستجوی هدر ↔ صفحه (پراپ filterSearch) — رویداد محلی، بدون ناوبری
  useEffect(() => {
    const onSubmit = (e: Event) => {
      const term = ((e as CustomEvent<string>).detail ?? '').trim();
      setQ(term);
    };
    window.addEventListener(FILTER_SEARCH_SUBMIT, onSubmit);
    return () => window.removeEventListener(FILTER_SEARCH_SUBMIT, onSubmit);
  }, []);

  // عبارت فعال → آینهٔ جعبهٔ هدر (ورود عمیق ?q / پاک‌شدن چیپ / جستجوی تازه)
  useEffect(() => {
    dispatchFilterSearchSync(q);
  }, [q]);

  // ─── داده‌ها: درخت / استان‌ها / شهرها ─────────────────────────────
  /** بینندهٔ واردشده — سورت «مرتبط‌ترین» برایش شهر خودش را در امتیاز می‌آورد؛
   *  مهمان هم همان اندپوینت را می‌زند (توکن فقط وقتی هست چسبیده) */
  const { user } = useAuth();

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

  // ─── لیست بی‌نهایت (عین useInfiniteProducts در product-list) ────────
  const filters = useMemo(
    () => ({
      nodeKey: f.nodeKey,
      provinceId: f.provinceId,
      cityId: f.cityId,
      search: q || undefined,
      attrs: f.attrs,
      priceMin: f.priceMin,
      priceMax: f.priceMax,
      moqMin: f.moqMin,
      moqMax: f.moqMax,
      sort: f.sort,
      perPage: PER_PAGE,
    }),
    [f, q],
  );

  const { data, isLoading, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      // بیننده جزء کلید است — ورود/خروج کاربر نتایج شخصی‌شده را تازه می‌کند
      queryKey: ['catalog-v2-infinite', filters, user?.phone ?? 'guest'],
      queryFn: ({ pageParam }: { pageParam: number }) =>
        fetchCatalogV2List({ ...filters, page: pageParam }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.pageCount ? lastPage.page + 1 : undefined,
      placeholderData: keepPreviousData,
      staleTime: 60_000,
    });

  /** مسطح + ضدتکرار (تغییر داده بین صفحه‌ها نباید کارت تکراری بیاورد) */
  const items = useMemo(() => {
    const seen = new Set<number>();
    const out: CatalogV2Row[] = [];
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
  const facets = lastMeta?.facets;
  const unit = lastMeta?.unit?.top;
  const bounds = facets ?? { price: { min: null, max: null }, moq: { min: null, max: null } };

  /** ورود عمیق ?page=N: صفحه‌های ۲..N بی‌صدا لود شوند تا کاربر همان عمق را ببیند */
  useEffect(() => {
    if (initialPage <= 1 || isLoading) return;
    if (loadedCount >= initialPage) return;
    if (isFetching) return;
    void fetchNextPage();
  }, [initialPage, loadedCount, isLoading, isFetching, fetchNextPage]);

  /** صفحهٔ در حال مشاهده — از جایگاه ویوپورت در گرید (عین product-list) */
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

  /** بافر پیش‌واکش (عین product-list): همیشه ۲ صفحه جلوترِ صفحهٔ در حال
   *  مشاهده در پس‌زمینه آماده باشد؛ بعد از لود اولیه idle می‌شود تا با
   *  هیدریشن/LCP رقابت نکند. */
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

  /** نگهبان انتهای گرید — ۱۲۰۰px قبل از رسیدن کاربر صفحهٔ بعد را می‌خواهد */
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

  // ─── زیر-هدر چسبان — اندازه‌گیری زندهٔ ارتفاع هدر (دور ۴) ───────────────
  /** نوار «دسته بندی | فروشنده شوید» روی این صفحه حذف است (hideNavRow)؛
   *  زیر-هدر خودمان به‌جایش زیرِ هدر می‌چسبد و با اسکرول غیب نمی‌شود (نه
   *  دسکتاپ نه موبایل). ارتفاع هدر بریک‌پوینت‌به‌بریک‌پوینت فرق دارد —
   *  اندازه‌گیری زمان اجرا (مونت + تغییر اندازه) تا چسبندگی بی‌درز باشد. */
  const [headerH, setHeaderH] = useState<number | null>(null);
  const [subH, setSubH] = useState<number | null>(null);
  const subRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const measureHeader = () => {
      const h = document.querySelector('header');
      setHeaderH(h ? Math.round(h.getBoundingClientRect().height) : null);
    };
    measureHeader();
    window.addEventListener('resize', measureHeader);
    return () => window.removeEventListener('resize', measureHeader);
  }, []);
  /** ارتفاع زیر-هدر با تغییر فیلترها/چیپ‌ها عوض می‌شود — ResizeObserver آن
   *  را زنده نگه می‌دارد تا سایدبارِ چسبان همیشه زیرش بنشیند. */
  useEffect(() => {
    const el = subRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      setSubH(Math.round(el.getBoundingClientRect().height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ─── URL لینک‌پذیر — «page» = عمق لودشده (لینک سئوی دکمهٔ «مشاهده بیشتر») ───
  const buildUrl = useCallback(
    (page?: number) => {
      const qp = new URLSearchParams();
      if (f.nodeKey !== 'all') qp.set('node', f.nodeKey);
      if (f.provinceId) qp.set('province', String(f.provinceId));
      if (f.cityId) qp.set('city', String(f.cityId));
      if (f.priceMin) qp.set('pmin', String(f.priceMin));
      if (f.priceMax) qp.set('pmax', String(f.priceMax));
      if (f.moqMin) qp.set('mmin', String(f.moqMin));
      if (f.moqMax) qp.set('mmax', String(f.moqMax));
      if (f.sort !== 'related') qp.set('sort', f.sort);
      if (q) qp.set('q', q);
      const attrEntries = Object.entries(f.attrs).filter(([, v]) => v.length > 0);
      if (attrEntries.length) qp.set('a', attrEntries.map(([k, v]) => `${k}:${v.join('|')}`).join(','));
      if (page && page > 1) qp.set('page', String(page));
      const qs = qp.toString();
      return qs ? `/product-filter?${qs}` : '/product-filter';
    },
    [f, q],
  );

  useEffect(() => {
    window.history.replaceState(null, '', buildUrl(loadedCount > 1 ? loadedCount : undefined));
  }, [buildUrl, loadedCount]);

  // ─── زنجیرهٔ گره + اتریبیوت‌های مؤثر (خانواده + خود دسته) ────────────
  const nodeChain = useMemo(() => chainOf(tree?.roots, f.nodeKey), [tree, f.nodeKey]);
  const selectedNode = nodeChain.length ? nodeChain[nodeChain.length - 1] : null;

  /** ویژگی‌های نوار افقی — بدون عنوان‌بندی؛ فقط چیپ‌های خودشان */
  const attrList = useMemo(
    () => nodeChain.flatMap((n) => n.attrs ?? []),
    [nodeChain],
  );

  const uShort = unitShort(unit);

  const resetFilters = () => {
    patch({
      nodeKey: 'all',
      provinceId: undefined,
      cityId: undefined,
      attrs: {},
      priceMin: undefined,
      priceMax: undefined,
      moqMin: undefined,
      moqMax: undefined,
    });
    setQ('');
  };

  // ─── انتخاب اتریبیوت با وابستگی کشور/نوع (دور ۴) ─────────────────────
  /** انتخاب گزینهٔ وابسته والدش را خودکار می‌نشاند («صدری پاکستانی» → کشور
   *  =پاکستان) و والدِ عوض‌شده فرزندِ ناهمخوان را می‌پاکد (کشور=ایران →
   *  «هاشمی» می‌ماند، کشور=پاکستان → «هاشمی» می‌رود). */
  const toggleAttr = (key: string, label: string) => {
    const attr = attrList.find((a) => a.key === key);
    const opt = attr?.options.find((o) => o.label === label);
    const cur = f.attrs[key] ?? [];
    const removing = cur.includes(label);
    let attrs = { ...f.attrs };
    if (removing) {
      const next = cur.filter((l) => l !== label);
      if (next.length) attrs[key] = next;
      else delete attrs[key];
    } else {
      attrs[key] = [...cur, label];
      const imp = opt ? impliedParent(opt, attrs) : undefined;
      if (imp) attrs[imp.key] = [...(attrs[imp.key] ?? []), imp.value];
    }
    attrs = pruneAttrSelection(attrList, attrs);
    patch({ attrs });
  };
  const clearAttr = (key: string) => {
    const attrs = { ...f.attrs };
    delete attrs[key];
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
    (q ? 1 : 0) +
    (f.nodeKey !== 'all' ? 1 : 0) +
    (f.provinceId || f.cityId ? 1 : 0) +
    (f.priceMin || f.priceMax ? 1 : 0) +
    (f.moqMin || f.moqMax ? 1 : 0) +
    Object.values(f.attrs).reduce((a, v) => a + v.length, 0);

  const priceValue =
    f.priceMin || f.priceMax
      ? [f.priceMin ? `از ${priceFa(f.priceMin)}` : '', f.priceMax ? `تا ${priceFa(f.priceMax)}` : '']
          .filter(Boolean)
          .join('، ')
      : undefined;
  const moqValue =
    f.moqMin || f.moqMax
      ? [
          f.moqMin ? `از ${toFa(f.moqMin)}` : '',
          f.moqMax ? `تا ${toFa(f.moqMax)}` : '',
        ]
          .filter(Boolean)
          .join('، ') + (uShort ? ` ${uShort}` : '')
      : undefined;
  const sortValue = SORTS.find((s) => s.key === f.sort)?.label;
  const attrValue = (attr: CatalogV2Attr): string | undefined => {
    const sel = f.attrs[attr.key] ?? [];
    if (!sel.length) return undefined;
    return sel.length === 1 ? sel[0] : `${toFa(sel.length)} گزینه`;
  };

  // ─── چیپ‌های فیلتر فعال (حذف‌پذیر تکی) ──────────────────────────────
  /** جستجو = چیپ اول (الگوی دیوار)؛ دستهٔ انتخابی چیپ دوم؛ بقیه فیلترها */
  const chips: { label: string; onClear: () => void }[] = [];
  if (q) chips.push({ label: q, onClear: () => setQ('') });
  if (selectedNode) {
    chips.push({ label: selectedNode.name, onClear: () => patch({ nodeKey: 'all' }) });
  }
  /** مکان: فقط عمیق‌ترین سطح — شهر حذف شد به استان برمی‌گردد (دریل برعکس)؛
   *  وقتی شهر انتخاب است استان در چیپ‌ها نیست */
  if (f.cityId && cityLabel) {
    chips.push({ label: cityLabel, onClear: () => patch({ cityId: undefined }) });
  } else if (provinceId && cityLabel) {
    chips.push({ label: cityLabel, onClear: () => patch({ provinceId: undefined, cityId: undefined }) });
  }
  if (f.priceMin) chips.push({ label: `قیمت از ${priceFa(f.priceMin)}`, onClear: () => patch({ priceMin: undefined }) });
  if (f.priceMax) chips.push({ label: `قیمت تا ${priceFa(f.priceMax)}`, onClear: () => patch({ priceMax: undefined }) });
  if (f.moqMin) chips.push({ label: `حجم از ${toFa(f.moqMin)} ${uShort}`.trim(), onClear: () => patch({ moqMin: undefined }) });
  if (f.moqMax) chips.push({ label: `حجم تا ${toFa(f.moqMax)} ${uShort}`.trim(), onClear: () => patch({ moqMax: undefined }) });
  for (const [key, labels] of Object.entries(f.attrs)) {
    for (const l of labels) {
      chips.push({ label: l, onClear: () => toggleAttr(key, l) });
    }
  }

  /** بدنهٔ شیتِ مرتب‌سازی (موبایل) — با کلیک بسته می‌شود؛ تابع ساده (نه
   *  کامپوننت داخلی) تا هویتش با هر رندر عوض نشود و ریمانت نگیرد */
  const sortSheetBody = (onPick: (k: CatalogV2Sort) => void, close: () => void) => (
    <div className="pb-6">
      <SheetHeader className="px-4 pt-4 pb-1 text-start">
        <SheetTitle className="text-[14px]">مرتب‌سازی بر اساس</SheetTitle>
      </SheetHeader>
      <ul>
        {SORTS.map((s) => (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => {
                onPick(s.key);
                close();
              }}
              className={cn(
                'flex w-full items-center justify-between gap-2 px-4 py-3 text-start text-[13px] transition-colors hover:bg-secondary/40',
                f.sort === s.key && 'font-bold text-primary',
              )}
            >
              <span>{s.label}</span>
              {f.sort === s.key && <BadgeCheck size={15} className="text-primary" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  // ─── نوار افقی فیلترها — همه کنار هم (الگوی دیوار)؛ متغیر JSX (نه
  //      کامپوننت داخلی!) تا با هر رندرِ والد، ساب‌تری نریمانت نشود — ریمانت
  //      DualChipها را می‌بست و کلیک‌ها را می‌خورد (باگ کشف‌شدهٔ دور ۴) ─────
  const filterBar = (
    <div
      className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="toolbar"
      aria-label="فیلترها"
    >
      {/* دسته‌بندی — فقط موبایل؛ دسکتاپ: سایدبار دریل‌شونده (شیت ارتفاع ثابت) */}
      <DualChip
        mobileOnly
        fixedSheet
        label="دسته‌بندی"
        value={selectedNode?.name}
        active={Boolean(selectedNode)}
        icon={Layers}
        sheet={(close) => (
          <CategorySheetBody
            tree={tree?.roots}
            selected={f.nodeKey}
            onPick={(k) => {
              patch({ nodeKey: k });
              close();
            }}
          />
        )}
      />

      {/* شهر فروشنده — انتخابگر دو-مرحله‌ای: استان ← شهرهای همان استان؛
          شهر = فیلتر نهایی، «کل استان» = فیلتر استان؛ ارتفاع ثابت، بدون پرش */}
      <DualChip
        fixedSheet
        popClass="h-[min(520px,70vh)] w-80 overflow-hidden"
        label="شهر"
        value={cityLabel}
        active={Boolean(f.provinceId || f.cityId)}
        icon={MapPin}
        panel={(close) => (
          <LocationPickerBody
            variant="popover"
            provinces={provinces ?? []}
            provinceId={provinceId}
            cityId={f.cityId}
            provinceCount={provinceCount}
            cityCount={cityCount}
            onAll={() => {
              patch({ provinceId: undefined, cityId: undefined });
              close();
            }}
            onProvince={(id) => {
              patch({ provinceId: id, cityId: undefined });
              close();
            }}
            onCity={(pid, id) => {
              patch({ provinceId: pid, cityId: id });
              close();
            }}
          />
        )}
        sheet={(close) => (
          <LocationPickerBody
            provinces={provinces ?? []}
            provinceId={provinceId}
            cityId={f.cityId}
            provinceCount={provinceCount}
            cityCount={cityCount}
            onAll={() => {
              patch({ provinceId: undefined, cityId: undefined });
              close();
            }}
            onProvince={(id) => patch({ provinceId: id, cityId: undefined })}
            onCity={(pid, id) => {
              patch({ provinceId: pid, cityId: id });
              close();
            }}
          />
        )}
      />

      {/* قیمت */}
      <DualChip
        label="قیمت"
        value={priceValue}
        active={Boolean(f.priceMin || f.priceMax)}
        icon={Banknote}
        popClass="w-80"
        panel={() => (
          <div className="p-2">
            <p className="px-1 pb-1 text-[11px] font-bold text-foreground/80">
              قیمت هر {uShort || 'واحد'} <span className="text-[9.5px] font-normal text-muted-foreground">(تومان)</span>
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
                <p className="px-1 pt-1 text-[10px] text-muted-foreground">
                  بازهٔ واقعی این دسته: {priceFa(bounds.price.min)} تا {priceFa(bounds.price.max)} تومان
                </p>
              )}
            {(f.priceMin || f.priceMax) && (
              <button
                type="button"
                onClick={() => patch({ priceMin: undefined, priceMax: undefined })}
                className="mt-1 w-full rounded-lg border border-dashed px-2 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/5"
              >
                حذف محدودیت قیمت
              </button>
            )}
          </div>
        )}
        sheet={(close) => (
          <RangeSheetBody
            kind="price"
            unit={unit}
            bounds={bounds}
            current={{ min: f.priceMin, max: f.priceMax }}
            onApply={(min, max) => {
              patch({ priceMin: min, priceMax: max });
              close();
            }}
          />
        )}
      />

      {/* حجم خرید */}
      <DualChip
        label="حجم خرید"
        value={moqValue}
        active={Boolean(f.moqMin || f.moqMax)}
        icon={Package}
        popClass="w-80"
        panel={() => (
          <div className="p-2">
            <p className="px-1 pb-1 text-[11px] font-bold text-foreground/80">
              حداقل سفارش فروشنده{unit ? ` — ${uShort}` : ''}
            </p>
            <RangeInputs
              min={f.moqMin}
              max={f.moqMax}
              onMin={(v) => patch({ moqMin: v })}
              onMax={(v) => patch({ moqMax: v })}
              unit={unit}
            />
            <MoqChips unit={unit} f={f} onPick={(p) => patch({ moqMin: p.min, moqMax: p.max })} />
            {(f.moqMin || f.moqMax) && (
              <button
                type="button"
                onClick={() => patch({ moqMin: undefined, moqMax: undefined })}
                className="mt-1 w-full rounded-lg border border-dashed px-2 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/5"
              >
                حذف محدودیت حجم
              </button>
            )}
          </div>
        )}
        sheet={(close) => (
          <RangeSheetBody
            kind="moq"
            unit={unit}
            bounds={bounds}
            current={{ min: f.moqMin, max: f.moqMax }}
            onApply={(min, max) => {
              patch({ moqMin: min, moqMax: max });
              close();
            }}
          />
        )}
      />

      {/* مرتب‌سازی اینجا نیست — «تهِ» نوار نتیجه است (خواستهٔ مالک دور ۴) */}

      {/* ویژگی‌های تخصصی دستهٔ فعال — چیپ خودشان، بدون عنوان‌بندیِ بخش؛
          گزینه‌های وابسته فقط مرئی‌هایشان لیست می‌شوند (کشور ← نوع/برند) */}
      {attrList.map((attr) => {
        const vis = visibleAttrOptions(attr, f.attrs);
        return (
          <DualChip
            key={attr.key}
            label={attr.label}
            value={attrValue(attr)}
            active={Boolean((f.attrs[attr.key] ?? []).length)}
            panel={() => (
              <div className="py-1">
                {attr.hint && <p className="px-3 pt-1.5 pb-0.5 text-[10px] leading-5 text-muted-foreground">{attr.hint}</p>}
                <button
                  type="button"
                  onClick={() => clearAttr(attr.key)}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-2 text-[12px] transition-colors hover:bg-secondary/40',
                    !(f.attrs[attr.key] ?? []).length && 'bg-primary/10 font-bold text-primary',
                  )}
                >
                  همه
                  {!(f.attrs[attr.key] ?? []).length && <BadgeCheck size={14} />}
                </button>
                <div className="max-h-72 overflow-y-auto">
                  {vis.map((opt) => (
                    <AttrCheckboxRow
                      key={opt.label}
                      label={opt.label}
                      count={attrCount(attr.key, opt.label)}
                      on={(f.attrs[attr.key] ?? []).includes(opt.label)}
                      onClick={() => toggleAttr(attr.key, opt.label)}
                    />
                  ))}
                </div>
              </div>
            )}
            sheet={(close) => (
              <OptionsSheetBody
                attr={attr}
                options={vis}
                selected={f.attrs[attr.key] ?? []}
                counts={facets?.attrs?.[attr.key]}
                onApply={(vals) => {
                  let attrs = { ...f.attrs };
                  if (vals.length) {
                    attrs[attr.key] = vals;
                    // گزینه‌های وابسته‌ای که از شیت تیک خوردند → والدشان
                    for (const label of vals) {
                      const opt = attr.options.find((o) => o.label === label);
                      const imp = opt ? impliedParent(opt, attrs) : undefined;
                      if (imp) attrs[imp.key] = [...(attrs[imp.key] ?? []), imp.value];
                    }
                  } else delete attrs[attr.key];
                  attrs = pruneAttrSelection(attrList, attrs);
                  patch({ attrs });
                  close();
                }}
              />
            )}
          />
        );
      })}
    </div>
  );

  // ─── نوار نتیجه — چیپ‌های فیلتر فعال (رنگی، حذف‌پذیر تکی) + شمار آگهی،
  //      و مرتب‌سازی «تهِ نوار» (space-between — خواستهٔ مالک دور ۴)؛
  //      متغیر JSX نه کامپوننت داخلی — هویت پایدار تا با هر رندر والد،
  //      ساب‌تری نریمانت شود و DualChipها بسته/کلیک‌خوره نشوند (باگ دور ۴)
  const resultsBar = (
    <div
      className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] lg:flex-wrap lg:justify-between lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden"
      aria-label="نتیجه‌ها و فیلترهای فعال"
    >
      {/* گروه اول: شمار + چیپ‌ها + حذف همه — در دسکتاپ می‌پیچد */}
      <div className="flex min-w-0 items-center gap-1.5 lg:flex-wrap">
        {/* شمار آگهی — سربرگِ حذف‌شدهٔ دور ۳ حالا همین‌جاست، کنار فیلترها */}
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {isLoading ? '…' : `${toFa(total)} آگهی`}
        </span>

        {chips.map((c, i) => (
          <ActiveChip key={`${i}:${c.label}`} label={c.label} onClear={c.onClear} />
        ))}

        {chips.length > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="shrink-0 rounded-full text-[11px] font-bold text-primary hover:underline"
          >
            حذف همه ({toFa(activeCount)})
          </button>
        )}
      </div>

      {/* مرتب‌سازی — تهِ نوار، درآپ‌داون (دور ۳) و انتهای نوار (دور ۴)؛
          پیش‌فرض «مرتبط‌ترین» = امتیاز تطابق؛ خود امتیاز نمایش نمی‌یابد */}
      <DualChip
        label="مرتب‌سازی"
        value={sortValue}
        active={f.sort !== 'related'}
        icon={ArrowUpDown}
        popClass="w-52"
        panel={(close) => (
          <ul className="p-1">
            {SORTS.map((s) => (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => {
                    patch({ sort: s.key });
                    close();
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-[12.5px] transition-colors hover:bg-secondary/60',
                    f.sort === s.key && 'font-bold text-primary',
                  )}
                >
                  <span>{s.label}</span>
                  {f.sort === s.key && <BadgeCheck size={14} className="text-primary" />}
                </button>
              </li>
            ))}
          </ul>
        )}
        sheet={(close) => sortSheetBody((k) => patch({ sort: k }), close)}
      />
    </div>
  );

  /** بالای سایدبار چسبان — زیر هدر + زیر-هدر (اندازه‌گیری زنده) */
  const asideTop =
    headerH != null && subH != null ? headerH + subH + 12 : undefined;

  return (
    <div className="mx-auto w-full max-w-[1240px] px-3 pt-2 sm:px-4 lg:px-5 lg:pt-3">
      {/* سربرگ فقط برای سئو/a11y — هیچ خط سربرگ بصری وجود ندارد (دور ۳) */}
      <h1 className="sr-only">
        {selectedNode ? `خرید و فروش عمده ${selectedNode.name}` : 'خرید و فروش عمده'}
      </h1>

      {/* ═══ زیر-هدر چسبان (دور ۴) — جای نوار «دسته بندی | فروشنده شوید»؛
          نوار فیلتر + نوار نتیجه، همه‌جا (موبایل/دسکتاپ) بدون غیب‌شدگی در اسکرول؛
          سرچ‌باکس فقط در هدر است (رویداد محلی filterSearch) ═══ */}
      <div
        ref={subRef}
        style={headerH != null ? { top: headerH } : undefined}
        className="sticky top-[60px] z-30 -mx-3 border-b bg-background/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4 lg:-mx-5 lg:px-5"
      >
        {filterBar}
        <div className="mt-1.5 lg:mt-2">
          {resultsBar}
        </div>
      </div>

      <div className="grid items-start gap-4 py-3 lg:grid-cols-[264px_minmax(0,1fr)] lg:py-4">
        {/* ═══ سایدبار دسکتاپ: فقط دسته‌بندی (دریل‌شونده + اسکرول مستقل) +
                کارت دعوت فروشنده (دور ۴) ═══ */}
        <aside
          className="hidden lg:sticky lg:top-24 lg:block"
          style={asideTop != null ? { top: asideTop } : undefined}
        >
          <section className="rounded-xl border bg-card" aria-label="دسته‌بندی‌ها">
            <header className="flex items-center gap-2 border-b px-3 py-2.5">
              <Layers size={15} className="text-primary" />
              <h2 className="text-[13px] font-bold">دسته‌بندی‌ها</h2>
              {tree && (
                <span className="ms-auto text-[10px] text-muted-foreground">
                  {toFa(tree.mapped)} آگهی
                </span>
              )}
            </header>
            {/* اسکرول مستقل — لیست بلند گروه‌ها هرگز صفحه را نمی‌راند */}
            <div className="max-h-[calc(100vh-360px)] overflow-y-auto">
              <SideCategories
                tree={tree?.roots}
                loading={treeLoading}
                selected={f.nodeKey}
                onSelect={(k) => patch({ nodeKey: k })}
              />
            </div>
          </section>

          {/* دعوت فروشنده با تصویر (دور ۴) — «محصول برای فروش عمده دارید؟»
              + دکمهٔ ساخت ویترین محصولات */}
          <SellerCtaCard />
        </aside>

        {/* ═══ محتوای اصلی ═══ */}
        <main className="min-w-0 space-y-3">
          {/* کارت‌ها — اسکرول بی‌نهایت */}
          {isLoading && !data ? (
            <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
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
            <div
              ref={gridRef}
              className={cn(
                'grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 transition-opacity',
                isFetching && !isFetchingNextPage && 'opacity-60',
              )}
            >
              {items.map((row) => (
                <CatalogCard key={row.id} row={row} />
              ))}
            </div>
          )}

          {/* ─── اسکرول بی‌نهایت: لینک «مشاهده بیشتر» سئو (عین product-list) ───
              موتور جستجو نمی‌تواند اسکرول کند — این <a href> واقعی به URL صفحهٔ
              بعدی می‌رود و زنجیرهٔ کشف گوگل را زنده نگه می‌دارد؛ برای کاربرِ
              جاوااسکریپت‌دار کلیک = لود درجا؛ صفحهٔ آخر → دکمه حذف می‌شود */}
          {!isLoading && items.length > 0 && hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button asChild variant="outline" className="gap-1.5 rounded-md px-6 font-bold">
                <a
                  href={buildUrl(loadedCount + 1)}
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
            </div>
          )}

          {/* پایان لیست — همهٔ آگهی‌ها دیده شد */}
          {!isLoading && items.length > 0 && !hasNextPage && loadedCount > 1 && (
            <p className="pt-1 text-center text-xs text-muted-foreground">
              همهٔ {toFa(total)} آگهی این لیست نمایش داده شد
            </p>
          )}

          {/* دعوت فروشنده — انتهای لیست (موبایل؛ دسکتاپ کارت خودش را در
              سایدبار دارد — دور ۴) */}
          {!isLoading && items.length > 0 && (
            <SellerCtaCard className="mx-auto max-w-md lg:hidden" />
          )}

          {/* نگهبان اسکرول — ۱۲۰۰px قبل از رسیدن به انتها صفحهٔ بعد را می‌خواهد */}
          <div ref={sentinelRef} aria-hidden className="h-px" />
        </main>
      </div>
    </div>
  );
}
