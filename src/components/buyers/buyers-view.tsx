'use client';

/**
 * خریداران (بازطراحی مالک ۳۱-۱۰) — مرور آیتم‌های دفاتر خرید، عین الگوی صفحه
 * جستجوی آگهی‌ها اما با طراحی متمایز و ساده‌تر:
 *  • دسکتاپ: سایدبار دسته‌بندی (هر سطح قابل انتخاب — ریشه کل زیردرخت، برگ دقیق)
 *    + دوره خرید + موقعیت؛ جستجوی بالای لیست سرجایش مانده است.
 *  • موبایل: چیپ‌های فیلتر + بات‌شیت‌های سلسله‌مراتبی (الگوی ایمچ).
 *  • کارت‌ها مینیمال و کشیده مثل درخواست‌های خرید — یک کارت برای هر کالای دفتر خرید.
 *  • دو تب «خریداران» و «درخواست‌های خرید» — نوار تب برجسته بالای جستجو، همیشه
 *    نمایان (موبایل و دسکتاپ)؛ رنگ‌های مکمل: تب خریداران آبی برند، تب درخواست‌ها
 *    کهربایی — تا کاربر بلافاصله دو بخش را تشخیص دهد (خواسته مالک ۳۱-۱۰).
 *  • «پیشنهاد تامین»: فقط فروشندگان دارندهٔ بستهٔ فعال — تکی با سهمیهٔ روزانه؛
 *    «ارسال گروهی» پولی است (هر گیرنده از کیف پول). دکمه‌های ارسال خاکستری‌اند
 *    تا صفحه از رنگ آبی اشباع نشود (خواسته مالک ۳۱-۱۰).
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  List,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/mock/auth';
import {
  useBuyerDirectory,
  useBuyRequests,
  useCategoryTree,
  useCities,
  useMyOfferQuota,
  useProvinces,
} from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AuthModal } from '@/components/shared/auth-modal';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { SupplyOfferModal } from '@/components/buyers/supply-offer-modal';
import { BookEntryCard } from '@/components/buyers/book-entry-card';
import { dateFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  PERIOD_LABELS,
  PURCHASE_PERIODS,
  type BuyerDirectoryItem,
  type BuyerDirectoryPage,
  type Category,
  type PurchasePeriod,
} from '@/lib/types';

const PER_PAGE = 12;
type SheetKind = 'categories' | 'period' | 'location' | null;
type PeriodFilter = PurchasePeriod | 'all';

export function BuyersView({ initialData }: { initialData?: BuyerDirectoryPage }) {
  const { user } = useAuth();
  const { toast } = useToast();

  // فیلترها
  const [s, setS] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [reqPage, setReqPage] = useState(1);
  const [tab, setTab] = useState<'buyers' | 'requests'>('buyers');

  // موبایل — بات‌شیت‌ها
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [catStack, setCatStack] = useState<Category[]>([]);

  // انتخاب گروهی + مودال‌ها
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [offerTargets, setOfferTargets] = useState<BuyerDirectoryItem[] | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const { data: tree = [] } = useCategoryTree();
  const { data: provinces = [] } = useProvinces();
  const { data: cities = [] } = useCities(provinceId ?? undefined);

  const dirQuery = {
    categoryId: categoryId ?? undefined,
    s: s || undefined,
    period: period === 'all' ? undefined : period,
    provinceId: provinceId ?? undefined,
    cityId: cityId ?? undefined,
    page,
    perPage: PER_PAGE,
  };
  const directory = useBuyerDirectory(dirQuery);
  const data = directory.data ?? initialData;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  // تب دوم — درخواست‌های خرید همین دسته
  const reqData = useBuyRequests(
    { categoryId: categoryId ?? undefined, provinceId: provinceId ?? undefined, page: reqPage },
  );
  const showRequestsTab = data?.buyRequestCount == null || data.buyRequestCount > 0;

  // سهمیه — فقط برای کاربر واردشده (دارندهٔ بسته معنا دارد)
  const quotaQuery = useMyOfferQuota(Boolean(user));
  const quota = quotaQuery.data ?? null;
  const isFeatured = quota?.isFeatured ?? false;

  const pickCategory = (c: Category) => {
    setCategoryId(c.id);
    setCategoryLabel(c.categoryName);
    setPage(1);
    setReqPage(1);
    closeSheets();
  };

  const clearCategory = () => {
    setCategoryId(null);
    setCategoryLabel(null);
    setPage(1);
    setReqPage(1);
  };

  const resetFilters = () => {
    setS('');
    setPeriod('all');
    setProvinceId(null);
    setCityId(null);
    clearCategory();
  };

  const hasFilters = !!s || period !== 'all' || provinceId != null || cityId != null || !!categoryId;

  const closeSheets = () => {
    setSheet(null);
    setCatStack([]);
  };

  const toggleSelect = (b: BuyerDirectoryItem) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(b.id)) {
        next.delete(b.id);
      } else {
        next.add(b.id);
      }
      return next;
    });
  };

  const selectedItems = items.filter((b) => selection.has(b.id));

  const startOffer = (b: BuyerDirectoryItem | null) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (!isFeatured) {
      toast({
        description: 'ارسال پیشنهاد تامین مخصوص فروشندگان دارندهٔ بستهٔ اشتراک فعال است.',
        variant: 'destructive',
      });
      return;
    }
    // گروهی: انتخاب‌ها ممکن است همهٔ یک خریدار باشند → یگانه‌سازی بر خریدار
    setOfferTargets(b ? [b] : dedupeByBuyer(selectedItems));
  };

  // ─── موبایل: انتخاب دسته سلسله‌مراتبی ─────────────────────────
  const sheetLevel = catStack[catStack.length - 1];
  const sheetItems = sheetLevel ? sheetLevel.children ?? [] : tree;

  const selectMobileCategory = (c: Category) => {
    if (c.children?.length) {
      setCatStack((st) => [...st, c]);
      return;
    }
    pickCategory(c);
  };

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-4 lg:grid-cols-[260px_1fr] lg:px-6 lg:py-6">
      {/* سایدبار — دسکتاپ */}
      <aside className="hidden space-y-5 lg:block" aria-label="فیلترها">
        <div className="rounded-md border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold">
            <Filter size={14} className="text-primary" />
            دسته بندی خرید
          </h2>
          <CategoryNav
            tree={tree}
            activeId={categoryId}
            onPick={pickCategory}
            onClear={clearCategory}
          />
        </div>

        <div className="rounded-md border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold">
            <CalendarClock size={14} className="text-primary" />
            دوره خرید
          </h2>
          <ul className="space-y-0.5 text-sm">
            <li>
              <button
                type="button"
                onClick={() => {
                  setPeriod('all');
                  setPage(1);
                }}
                className={cn(
                  'block w-full rounded-lg px-2.5 py-1.5 text-start transition-colors',
                  period === 'all'
                    ? 'bg-accent font-bold text-accent-foreground'
                    : 'text-muted-foreground hover:bg-secondary',
                )}
              >
                همه دوره‌ها
              </button>
            </li>
            {PURCHASE_PERIODS.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => {
                    setPeriod(p);
                    setPage(1);
                  }}
                  className={cn(
                    'block w-full rounded-lg px-2.5 py-1.5 text-start transition-colors',
                    period === p
                      ? 'bg-accent font-bold text-accent-foreground'
                      : 'text-muted-foreground hover:bg-secondary',
                  )}
                >
                  {PERIOD_LABELS[p]}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3 rounded-md border bg-card p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <MapPin size={14} className="text-primary" />
            موقعیت جغرافیایی
          </h2>
          <Select
            dir="rtl"
            value={provinceId ? String(provinceId) : undefined}
            onValueChange={(v) => {
              setProvinceId(Number(v));
              setCityId(null);
              setPage(1);
            }}
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
          <Select
            dir="rtl"
            value={cityId ? String(cityId) : undefined}
            onValueChange={(v) => {
              setCityId(Number(v));
              setPage(1);
            }}
            disabled={!provinceId}
          >
            <SelectTrigger className="w-full rounded-md" aria-label="شهر">
              <SelectValue placeholder={provinceId ? 'همه شهرها' : 'ابتدا استان را انتخاب کنید'} />
            </SelectTrigger>
            <SelectContent>
              {cities.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* نوار سهمیهٔ فروشندهٔ ویژه */}
        {user && quota && (
          <div className="rounded-md border bg-secondary/60 p-3 text-[11px] leading-5">
            {isFeatured ? (
              <>
                <p>
                  <ShieldCheck size={13} className="ms-0.5 inline text-emerald-600" /> سهمیهٔ پیشنهاد
                  تامین امروز: <b>{toFa(quota.left)}</b> از <b>{toFa(quota.dailyLimit)}</b>
                </p>
                <p className="mt-1 text-muted-foreground">
                  ارسال گروهی: {toFa(quota.groupSend.perRecipientPrice.toLocaleString('fa-IR'))} تومان
                  به‌ازای هر خریدار
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                ارسال پیشنهاد تامین به خریداران، ویژهٔ دارندگان بستهٔ اشتراک است —{' '}
                <Link href="/panel/pricing" className="font-bold text-primary underline">
                  مشاهدهٔ بسته‌ها
                </Link>
              </p>
            )}
          </div>
        )}
      </aside>

      {/* لیست */}
      <div className="min-w-0 space-y-4">
        {/* تب‌های اصلی — برجسته و همیشه نمایان (موبایل و دسکتاپ)؛
            رنگ مکمل: خریداران آبی برند / درخواست‌ها کهربایی (خواسته مالک ۳۱-۱۰) */}
        <div
          className={cn('grid gap-2', showRequestsTab ? 'grid-cols-2' : 'grid-cols-1')}
          role="tablist"
          aria-label="بخش‌های صفحه خریداران"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'buyers'}
            onClick={() => setTab('buyers')}
            className={cn(
              'flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-[13px] font-extrabold transition-colors sm:text-sm',
              tab === 'buyers'
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground',
            )}
          >
            <Users size={16} className="shrink-0" />
            خریداران
            <span
              className={cn(
                'min-w-6 rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-4',
                tab === 'buyers' ? 'bg-white/25 text-primary-foreground' : 'bg-secondary text-muted-foreground',
              )}
            >
              {directory.isLoading && !data ? '…' : toFa(total)}
            </span>
          </button>
          {showRequestsTab && (
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'requests'}
              onClick={() => setTab('requests')}
              className={cn(
                'flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-[13px] font-extrabold transition-colors sm:text-sm',
                tab === 'requests'
                  ? 'border-amber-600 bg-amber-500 text-white shadow-sm'
                  : 'border-border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground',
              )}
            >
              <ClipboardList size={16} className="shrink-0" />
              درخواست‌های خرید
              {data?.buyRequestCount != null && (
                <span
                  className={cn(
                    'min-w-6 rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-4',
                    tab === 'requests' ? 'bg-white/25 text-white' : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {toFa(data.buyRequestCount)}
                </span>
              )}
            </button>
          )}
        </div>

        {/* جستجو — سرجایش، بالای لیست */}
        <div className="rounded-md border bg-card p-3 sm:p-4">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <form className="relative flex-1" onSubmit={(e) => e.preventDefault()} role="search">
              <Input
                value={s}
                onChange={(e) => {
                  setS(e.target.value);
                  setPage(1);
                }}
                placeholder="جستجوی کالا در دفاتر خرید؛ مثلاً پسته"
                className="rounded-md pe-4 ps-10"
                aria-label="جستجوی کالا در دفاتر خرید"
              />
              <Search size={15} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-muted-foreground" />
            </form>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="truncate">
              {directory.isLoading && !data
                ? '…'
                : tab === 'buyers'
                  ? <>
                      <b className="text-foreground">{toFa(total)}</b> کالا در دفاتر خرید
                      {categoryLabel && <> در «{categoryLabel}»</>}
                    </>
                  : 'درخواست‌های خرید'}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex shrink-0 items-center gap-1 transition-colors hover:text-primary"
              >
                <RotateCcw size={12} />
                حذف فیلترها
              </button>
            )}
          </div>
        </div>

        {/* نوار فیلتر — موبایل (الگوی باسکول/دیوار)؛ تب‌ها بالا هستند و اینجا نیستند */}
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
            onClick={() => setSheet('period')}
            className={cn(
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border bg-card px-3 py-2 text-xs font-medium transition-colors',
              period === 'all'
                ? 'border-border text-foreground/85 hover:border-foreground/30'
                : 'border-primary/45 bg-primary/5 font-bold text-primary',
            )}
          >
            <CalendarClock size={14} className={period === 'all' ? 'text-muted-foreground' : undefined} />
            {period === 'all' ? 'دوره خرید' : PERIOD_LABELS[period]}
          </button>
          <button
            type="button"
            onClick={() => setSheet('location')}
            className={cn(
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border bg-card px-3 py-2 text-xs font-medium transition-colors',
              provinceId == null
                ? 'border-border text-foreground/85 hover:border-foreground/30'
                : 'border-primary/45 bg-primary/5 font-bold text-primary',
            )}
          >
            <MapPin size={14} className={provinceId == null ? 'text-muted-foreground' : undefined} />
            {provinceId == null
              ? 'همه ایران'
              : (provinces.find((p) => p.id === provinceId)?.name ?? 'استان')}
          </button>
          {categoryLabel && (
            <button
              type="button"
              onClick={clearCategory}
              aria-label={`حذف فیلتر دسته ${categoryLabel}`}
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-primary/45 bg-primary/5 px-3 py-2 text-xs font-bold text-primary"
            >
              {categoryLabel}
              <X size={13} />
            </button>
          )}
          {s && (
            <button
              type="button"
              onClick={() => setS('')}
              aria-label="حذف جستجو"
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-primary/45 bg-primary/5 px-3 py-2 text-xs font-bold text-primary"
            >
              «{s}»
              <X size={13} />
            </button>
          )}
        </div>

        {/* ── تب خریداران ── */}
        {tab === 'buyers' && (
          <div role="tabpanel" aria-label="خریداران">
            {directory.isLoading && !data ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-32 animate-pulse rounded-md bg-secondary/60" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-md border border-dashed bg-card p-10 text-center">
                <Users size={30} className="mx-auto text-muted-foreground/60" />
                <p className="mt-3 text-sm font-bold">خریداری با این فیلترها پیدا نشد!</p>
                <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
                  فیلترها را تغییر دهید؛ اگر خودتان هم می‌خرید، «دفتر خرید من» را تکمیل کنید تا
                  فروشندگان شما را پیدا کنند —{' '}
                  <Link href="/panel/buyer-book" className="font-bold text-primary underline">
                    دفتر خرید من
                  </Link>
                </p>
                {hasFilters && (
                  <Button className="mt-4 rounded-md" onClick={resetFilters}>
                    حذف فیلترها
                  </Button>
                )}
              </div>
            ) : (
              <>
                <ul className={cn('space-y-3 transition-opacity', directory.isFetching && 'opacity-60')}>
                  {items.map((b) => (
                    <BookEntryCard
                      key={b.id}
                      entry={b}
                      selectable={isFeatured}
                      selected={selection.has(b.id)}
                      onToggle={() => toggleSelect(b)}
                      onOffer={() => startOffer(b)}
                    />
                  ))}
                </ul>

                {/* صفحه‌بندی */}
                {pageCount > 1 && (
                  <nav className="flex items-center justify-center gap-3 pt-1" aria-label="صفحه‌بندی">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-md"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronRight size={15} /> قبلی
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      صفحهٔ {toFa(page)} از {toFa(pageCount)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-md"
                      disabled={page >= pageCount}
                      onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    >
                      بعدی <ChevronLeft size={15} />
                    </Button>
                  </nav>
                )}
              </>
            )}

            {/* نوار ارسال گروهی — چسبان پایین وقتی انتخابی هست */}
            {isFeatured && selection.size > 0 && (
              <div className="sticky bottom-20 z-30 mt-4 rounded-xl border-2 border-primary/30 bg-card p-3 shadow-lg sm:bottom-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] leading-5">
                    <b>{toFa(dedupeByBuyer(selectedItems).length)}</b> خریدار انتخاب شد — هزینه:{' '}
                    <b className="text-primary">
                      {toFa(
                        (dedupeByBuyer(selectedItems).length *
                          (quota?.groupSend.perRecipientPrice ?? 0)).toLocaleString('fa-IR'),
                      )}
                    </b>{' '}
                    تومان از کیف پول
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="rounded-md bg-[#5b6472] text-white hover:bg-[#4c5462]"
                      onClick={() => startOffer(null)}
                    >
                      <Send size={13} /> ارسال گروهی پیشنهاد
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-md"
                      onClick={() => setSelection(new Set())}
                    >
                      لغو انتخاب
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── تب درخواست‌های خرید ── */}
        {tab === 'requests' && (
          <div role="tabpanel" aria-label="درخواست‌های خرید">
            {reqData.isLoading && !reqData.data ? (
              <div className="grid place-items-center py-16 text-muted-foreground">
                <Loader2 className="animate-spin" size={22} />
              </div>
            ) : (reqData.data?.items?.length ?? 0) === 0 ? (
              <div className="rounded-md border border-dashed bg-card p-10 text-center">
                <ClipboardList size={30} className="mx-auto text-muted-foreground/60" />
                <p className="mt-3 text-sm font-bold">درخواست خریدی در این فیلتر نیست.</p>
                <Link
                  href="/buyAd-requests"
                  className="mt-2 inline-block text-xs font-bold text-primary underline"
                >
                  مشاهدهٔ همهٔ درخواست‌های خرید
                </Link>
              </div>
            ) : (
              <>
                <ul className="space-y-2.5">
                  {(reqData.data?.items ?? []).map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3 rounded-md border bg-card p-3.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-extrabold">
                          {r.name ? `${r.subcategoryName} (${r.name})` : r.subcategoryName}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {toFa(r.requirementAmount.toLocaleString('fa-IR'))} {r.unit} · {r.city} ·{' '}
                          {dateFa(r.createdAt)}
                        </p>
                      </div>
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-8 shrink-0 rounded-md px-3 text-[11px]"
                      >
                        <Link href="/buyAd-requests">مشاهده</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 text-center">
                  <Link href="/buyAd-requests" className="text-xs font-bold text-primary underline">
                    مشاهدهٔ همهٔ درخواست‌ها و جستجو
                  </Link>
                </div>
              </>
            )}
          </div>
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
          {sheetLevel && (
            <li>
              <button
                type="button"
                onClick={() => pickCategory(sheetLevel)}
                className="flex w-full items-center justify-between gap-2 rounded-lg bg-primary/5 px-3 py-3 text-start text-sm font-bold text-primary transition-colors hover:bg-primary/10"
              >
                <span>انتخاب همهٔ «{sheetLevel.categoryName}»</span>
                <ChevronLeft size={16} />
              </button>
            </li>
          )}
          {sheetItems.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => selectMobileCategory(c)}
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

      {/* ─── بات‌شیت دوره خرید — موبایل ───────────────────────── */}
      <BottomSheet open={sheet === 'period'} onClose={() => setSheet(null)} title="دوره خرید">
        <ul>
          {(['all', ...PURCHASE_PERIODS] as PeriodFilter[]).map((p) => (
            <li key={p}>
              <button
                type="button"
                onClick={() => {
                  setPeriod(p);
                  setPage(1);
                  setSheet(null);
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-3 text-start text-sm transition-colors hover:bg-accent',
                  period === p ? 'font-bold text-primary' : 'font-medium',
                )}
              >
                <span>{p === 'all' ? 'همه دوره‌ها' : PERIOD_LABELS[p]}</span>
                <ChevronLeft size={16} className={period === p ? 'text-primary' : 'text-muted-foreground/40'} />
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>

      {/* ─── بات‌شیت موقعیت — موبایل ─────────────────────────── */}
      <BottomSheet open={sheet === 'location'} onClose={() => setSheet(null)} title="موقعیت جغرافیایی">
        <div className="space-y-3 p-1">
          <Select
            dir="rtl"
            value={provinceId ? String(provinceId) : undefined}
            onValueChange={(v) => {
              setProvinceId(Number(v));
              setCityId(null);
              setPage(1);
            }}
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
          <Select
            dir="rtl"
            value={cityId ? String(cityId) : undefined}
            onValueChange={(v) => {
              setCityId(Number(v));
              setPage(1);
            }}
            disabled={!provinceId}
          >
            <SelectTrigger className="w-full rounded-md" aria-label="شهر">
              <SelectValue placeholder={provinceId ? 'همه شهرها' : 'ابتدا استان را انتخاب کنید'} />
            </SelectTrigger>
            <SelectContent>
              {cities.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="w-full rounded-md" onClick={() => setSheet(null)}>
            نمایش نتایج
          </Button>
        </div>
      </BottomSheet>

      {/* مودال‌ها — key: هر مجموعهٔ هدف، فرم تازه با متن خالی */}
      <SupplyOfferModal
        key={offerTargets ? offerTargets.map((t) => t.buyerId).join(',') : 'closed'}
        open={offerTargets !== null}
        onClose={() => setOfferTargets(null)}
        targets={offerTargets ?? []}
        quota={quota}
      />
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onLoggedIn={() => {
          setAuthOpen(false);
          void quotaQuery.refetch();
        }}
      />
    </div>
  );
}

/** درخت دسته‌بندی سایدبار — هر سطح قابل انتخاب است (ریشه = کل زیردرخت) */
function CategoryNav({
  tree,
  activeId,
  onPick,
  onClear,
}: {
  tree: Category[];
  activeId: number | null;
  onPick: (c: Category) => void;
  onClear: () => void;
}) {
  return (
    <nav className="max-h-96 space-y-0.5 overflow-y-auto pe-1 text-sm">
      <button
        type="button"
        onClick={onClear}
        className={cn(
          'block w-full rounded-lg px-2.5 py-1.5 text-start transition-colors',
          activeId == null
            ? 'bg-accent font-bold text-accent-foreground'
            : 'text-muted-foreground hover:bg-secondary',
        )}
      >
        همه دسته‌ها
      </button>
      {tree.map((root) => (
        <div key={root.id}>
          <button
            type="button"
            onClick={() => onPick(root)}
            className={cn(
              'block w-full rounded-lg px-2.5 py-1.5 text-start transition-colors',
              activeId === root.id ? 'bg-accent font-bold text-accent-foreground' : 'font-medium hover:bg-secondary',
            )}
          >
            {root.categoryName}
          </button>
          {(root.children ?? []).map((l2) => (
            <div key={l2.id}>
              <button
                type="button"
                onClick={() => onPick(l2)}
                className={cn(
                  'block w-full rounded-lg ps-5 pe-2.5 py-1.5 text-start text-[13px] transition-colors',
                  activeId === l2.id
                    ? 'bg-accent font-bold text-accent-foreground'
                    : 'text-muted-foreground hover:bg-secondary',
                )}
              >
                {l2.categoryName}
              </button>
              {(l2.children ?? []).map((l3) => (
                <button
                  key={l3.id}
                  type="button"
                  onClick={() => onPick(l3)}
                  className={cn(
                    'block w-full rounded-lg ps-8 pe-2.5 py-1.5 text-start text-xs transition-colors',
                    activeId === l3.id
                      ? 'bg-accent font-bold text-accent-foreground'
                      : 'text-muted-foreground/80 hover:bg-secondary',
                  )}
                >
                  {l3.categoryName}
                </button>
              ))}
            </div>
          ))}
        </div>
      ))}
    </nav>
  );
}

/** یگانه‌سازی بر خریدار — انتخاب چند کالا از یک خریدار فقط یک گیرنده است */
function dedupeByBuyer(items: BuyerDirectoryItem[]): BuyerDirectoryItem[] {
  const seen = new Set<string>();
  const out: BuyerDirectoryItem[] = [];
  for (const it of items) {
    if (seen.has(it.buyerId)) continue;
    seen.add(it.buyerId);
    out.push(it);
  }
  return out;
}
