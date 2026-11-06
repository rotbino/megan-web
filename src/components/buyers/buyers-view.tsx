'use client';

/**
 * خریداران (بازطراحی مالک ۱-۱۱ — دور سوم) — مرور نیازهای خرید:
 *  • تب‌ویوی واقعی (خواستهٔ مالک ۱-۱۱ دور سوم): عنوان «خریداران» حذف شد؛
 *    دو تبِ «خریدهای دوره‌ای» و «درخواست‌های خرید» به‌صورت تب واقعی (خط زیرین،
 *    بدون ظاهر دکمه) همیشه در دسترس‌اند — با هر تب که کار کرد داخلش می‌رود؛
 *    تب دیگری محو نمی‌شود.
 *  • دسکتاپ: سایدبار دسته‌بندی — صفحهٔ اول فقط سطوح اول؛ با انتخاب دسته
 *    (مثلاً کشاورزی) فقط خریداران همان دسته لود می‌شوند و سایدبار فرزندان
 *    همان دسته + دکمهٔ «بازگشت» را نشان می‌دهد (رفتار عین آگهی‌ها).
 *  • موبایل: چیپ‌های فیلتر + بات‌شیت سلسله‌مراتبی؛ باز کردن بات‌شیت روی دستهٔ
 *    فعال، هم‌ترازها/فرزندان همان دسته؛ انتخاب هر دسته بلافاصله فیلتر می‌کند
 *    و اگر فرزند داشته باشد برای ریزترشدن باز می‌ماند.
 *  • کارت‌ها ساده و عین باسکول: آواتار + نام خریدار، جملهٔ «خریدار … هستم»،
 *    تاریخ و مکان.
 *  • «ارسال پیشنهاد تامین» روی کارت همیشه فعال است (خواستهٔ مالک ۱-۱۱ دور
 *    سوم): هر نیاز ثبت‌شده از ابتدا به دستهٔ آخر کالایش وصل است؛ دسته از خود
 *    کارت می‌آید و مودال با عنوان واضح «پیشنهاد تامین برنج» باز می‌شود.
 *  • ارسال گروهی (خواستهٔ مالک): دیگر چک‌باکسی روی کارت‌ها نیست — دکمهٔ
 *    «پیشنهاد تامین گروهی» بالای لیست، ویزار سه‌مرحله‌ای را باز می‌کند:
 *    دستهٔ آخر → انتخاب خریداران همان دسته + محاسبهٔ هزینه → فرم پیشنهاد.
 *    هزینهٔ کامل (تکی: سهمیه، گروهی: جمع از کیف پول) قبل از ارسال مشخص است.
 *  • «پیشنهاد تامین»: فقط فروشندگان دارندهٔ بستهٔ فعال — تکی با سهمیهٔ روزانه؛
 *    «ارسال گروهی» پولی است (هر گیرنده از کیف پول). دکمه‌های ارسال خاکستری‌اند
 *    تا صفحه از رنگ آبی اشباع نشود (خواسته مالک ۳۱-۱۰).
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  List,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/mock/auth';
import { findCategoryPathById } from '@/lib/categories';
import {
  useBuyerDirectory,
  useBuyRequests,
  useCategoryTree,
  useCities,
  useMyOfferQuota,
  useMyProducts,
  useProvinces,
} from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AuthModal } from '@/components/shared/auth-modal';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { NeedPackageModal } from '@/components/shared/need-package-modal';
import { SupplyOfferModal } from '@/components/buyers/supply-offer-modal';
import { GroupOfferWizard } from '@/components/buyers/group-offer-wizard';
import { BookEntryCard } from '@/components/buyers/book-entry-card';
import { dateFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  PERIOD_LABELS,
  PURCHASE_PERIODS,
  type BuyerDirectoryItem,
  type BuyerDirectoryPage,
  type BuyRequest,
  type Category,
  type PurchasePeriod,
} from '@/lib/types';

const PER_PAGE = 12;
type SheetKind = 'categories' | 'period' | 'location' | null;
type PeriodFilter = PurchasePeriod | 'all';
type BuyersTab = 'buyers' | 'requests';

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
  // تب‌ویوی واقعی (خواستهٔ مالک دور سوم) — هر دو تب همیشه در دسترس‌اند
  const [tab, setTab] = useState<BuyersTab>('buyers');

  // موبایل — بات‌شیت‌ها
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [catStack, setCatStack] = useState<Category[]>([]);

  // مودال پیشنهاد تکی + ویزار گروهی
  const [offerTarget, setOfferTarget] = useState<BuyerDirectoryItem | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  // الگوی همیشگی نیاز به اشتراک/شارژ (خواستهٔ مالک ۱-۱۱) — مودال با بستن + خرید بسته
  const [needPkgOpen, setNeedPkgOpen] = useState(false);

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

  // تب دوم — درخواست‌های خرید همین دسته (خواستهٔ مالک دور سوم: تب همیشه هست)
  const reqData = useBuyRequests(
    { categoryId: categoryId ?? undefined, provinceId: provinceId ?? undefined, page: reqPage },
  );
  const reqTotal = reqData.data?.total ?? 0;
  const reqItems = reqData.data?.items ?? [];
  const reqPageCount = Math.max(1, reqData.data?.pageCount ?? 1);

  // گیت بستهٔ فعال — فقط برای کاربر واردشده (خواسته مالک ۶-۱۱: سهمیه/قیمت
  // نمایشی حذف شد؛ این کوئری فقط «بستهٔ فعال؟» را می‌گوید)
  const quotaQuery = useMyOfferQuota(Boolean(user));
  const isFeatured = quotaQuery.data?.isFeatured ?? false;

  // آگهی‌های خود فروشنده — برای پیش‌نویس دقیق متن پیشنهاد (کالا/واحد/قیمت واقعی)
  const { data: myProducts } = useMyProducts(Boolean(user));

  const pickCategory = (c: Category) => {
    setCategoryId(c.id);
    setCategoryLabel(c.categoryName);
    setPage(1);
    setReqPage(1);
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

  /** دروازهٔ مشترک پیشنهاد تامین (تکی و گروهی): ورود → بستهٔ فعال؛
   *  دکمه‌ها همیشه فعال‌اند و مودال‌های راهنما باز می‌شوند. */
  const passOfferGates = (): boolean => {
    if (!user) {
      setAuthOpen(true);
      return false;
    }
    // اگر وضعیت بسته هنوز در حال بارگذاری است صبر می‌کنیم تا قضاوت اشتباه نشود.
    if (quotaQuery.isPending) {
      toast({ description: 'در حال بررسی وضعیت بستهٔ شما…' });
      return false;
    }
    // بدون بستهٔ فعال → مودال خرید اشتراک (الگوی همیشگی ۱-۱۱، به‌جای توست).
    if (!isFeatured) {
      setNeedPkgOpen(true);
      return false;
    }
    return true;
  };

  /** پیشنهاد تکی — دستهٔ کالا از خود کارت می‌آید (خواستهٔ مالک ۱-۱۱ دور سوم):
   *  هر نیاز ثبت‌شده به دستهٔ آخر وصل است؛ دکمه همیشه فعال است. */
  const startOffer = (b: BuyerDirectoryItem) => {
    if (!passOfferGates()) return;
    setOfferTarget(b);
  };

  /** پیشنهاد گروهی — ویزار سه‌مرحله‌ای (خواستهٔ مالک دور سوم) */
  const startGroupOffer = () => {
    if (!passOfferGates()) return;
    setWizardOpen(true);
  };

  /** دستهٔ کامل هدف از درخت — برای واحد/مثال و عنوان «پیشنهاد تامین برنج» */
  const targetCategory = (b: BuyerDirectoryItem | null): Category | null => {
    if (!b) return null;
    const path = findCategoryPathById(tree, b.categoryId);
    if (path?.length) return path[path.length - 1];
    // اگر درخت هنوز لود نشده، از دیتای خود کارت می‌سازیم تا دکمه هیچ‌وقت قفل نشود
    return {
      id: b.categoryId,
      categoryName: b.categoryName,
      slug: '',
      unit: b.unit,
      min: 0,
      parentId: null,
      score: 0,
    };
  };

  // ─── موبایل: انتخاب دسته سلسله‌مراتبی — عین الگوی آگهی‌ها (خواستهٔ مالک ۱-۱۱) ──
  const sheetLevel = catStack[catStack.length - 1];
  const sheetItems = sheetLevel ? sheetLevel.children ?? [] : tree;

  /** باز کردن بات‌شیت دسته‌ها — روی دستهٔ فعال، پشته تا سطح همان دسته
   *  پیش‌تنظیم می‌شود (نه از ریشه) تا فرزندان/هم‌ترازهای همان دسته دیده شوند؛
   *  برای برگ، یک سطح عقب‌تر (هم‌ترازهای خودش) — عین رفتار آگهی‌ها. */
  const openCategoriesSheet = () => {
    if (categoryId != null) {
      const p = findCategoryPathById(tree, categoryId);
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

  /** انتخاب هر دسته (هر سطح) بلافاصله خریداران همان دسته را لود می‌کند؛
   *  اگر فرزند داشته باشد بات‌شیت برای ریزترشدن باز می‌ماند (خواستهٔ مالک ۱-۱۱). */
  const selectMobileCategory = (c: Category) => {
    pickCategory(c);
    if (c.children?.length) {
      setCatStack((st) => [...st, c]);
      return;
    }
    closeSheets();
  };

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-4 lg:grid-cols-[260px_1fr] lg:px-6 lg:py-6">
      {/* ─── تب‌ویوی واقعی (خواستهٔ مالک دور سوم) — عنوان «خریداران» حذف شد؛
          هر دو تب همیشه کنار هم، حسِ تب واقعی با خط زیرین، بدون شلوغی ─── */}
      <div className="lg:col-span-2" role="tablist" aria-label="بخش‌های صفحه خریداران">
        <div className="flex items-stretch gap-6 border-b border-border">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'buyers'}
            onClick={() => setTab('buyers')}
            className={cn(
              '-mb-px flex items-center gap-1.5 border-b-2 px-1 pb-2.5 pt-1 text-sm font-bold transition-colors',
              tab === 'buyers'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Users size={15} className="shrink-0" />
            خریدهای دوره‌ای
            <span className={cn('font-num text-[11px]', tab === 'buyers' ? 'text-primary/70' : 'text-muted-foreground/70')}>
              {directory.isLoading && !data ? '…' : toFa(total)}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'requests'}
            onClick={() => setTab('requests')}
            className={cn(
              '-mb-px flex items-center gap-1.5 border-b-2 px-1 pb-2.5 pt-1 text-sm font-bold transition-colors',
              tab === 'requests'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <ClipboardList size={15} className="shrink-0" />
            درخواست‌های خرید
            <span className={cn('font-num text-[11px]', tab === 'requests' ? 'text-primary/70' : 'text-muted-foreground/70')}>
              {reqData.isLoading && !reqData.data ? '…' : toFa(reqTotal)}
            </span>
          </button>
        </div>
      </div>

      {/* سایدبار — دسکتاپ: دسته‌ها + سهمیه؛ فیلترهای دوره/موقعیت زیر جستجوست
          (خواستهٔ مالک شب دوم — بیشتر جلوی چشم) */}
      <aside className="hidden space-y-5 lg:block" aria-label="فیلترها">
        <div className="rounded-md border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold">
            <List size={14} className="text-primary" />
            دسته بندی خرید
          </h2>
          <CategoryNav
            tree={tree}
            activeId={categoryId}
            onPick={pickCategory}
            onClear={clearCategory}
          />
        </div>

        {/* فروشندهٔ بدون بستهٔ فعال → همان باکس آپ‌سل همیشگی (خواسته مالک
            ۶-۱۱: اعداد سهمیه/قیمت حذف شد — ارسال پولی است و هزینه لحظهٔ
            ارسال از کیف پول حساب می‌شود) */}
        {user && !isFeatured && (
          <div className="rounded-md border bg-secondary/60 p-3 text-[11px] leading-5">
            <p className="text-muted-foreground">
              ارسال پیشنهاد تامین به خریداران، ویژهٔ دارندگان بستهٔ اشتراک است —{' '}
              <Link href="/panel/pricing" className="font-bold text-primary underline">
                مشاهدهٔ بسته‌ها
              </Link>
            </p>
          </div>
        )}
      </aside>

      {/* لیست */}
      <div className="min-w-0 space-y-4">
        {/* جستجو — سرجایش، بالای لیست + فیلترهای دوره/استان/شهر زیر سرچ‌باکس
            (خواستهٔ مالک شب دوم: بیشتر جلوی چشم؛ موبایل چیپ‌های خودش را دارد) */}
        <div className="rounded-md border bg-card p-3 sm:p-4">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <form className="relative flex-1" onSubmit={(e) => e.preventDefault()} role="search">
              <Input
                value={s}
                onChange={(e) => {
                  setS(e.target.value);
                  setPage(1);
                }}
                placeholder="جستجو در نیازهای خرید؛ مثلاً پسته"
                className="rounded-md ps-4 pe-10"
                aria-label="جستجو در نیازهای خرید"
              />
              <Search size={15} className="pointer-events-none absolute inset-y-0 end-3 my-auto text-muted-foreground" />
            </form>

            {/* دکمهٔ پیشنهاد گروهی (خواستهٔ مالک ۱-۱۱ دور سوم) — به‌جای چک‌باکس
                روی کارت‌ها؛ ویزار سه‌مرحله‌ای: دسته → خریداران + هزینه → فرم */}
            {tab === 'buyers' && (
              <button
                type="button"
                onClick={startGroupOffer}
                className="flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-input bg-card px-3.5 py-2.5 text-xs font-bold text-foreground/75 transition-colors hover:border-foreground/30 hover:bg-secondary hover:text-foreground sm:py-2"
              >
                <Users size={14} />
                پیشنهاد تامین گروهی
              </button>
            )}
          </div>

          {/* فیلترهای دوره/استان/شهر — دسکتاپ، همین زیر سرچ‌باکس */}
          <div className="mt-2.5 hidden flex-wrap items-center gap-2 lg:flex">
            <Select
              dir="rtl"
              value={period}
              onValueChange={(v) => {
                setPeriod(v as PeriodFilter);
                setPage(1);
              }}
            >
              <SelectTrigger size="sm" className="h-9 w-[150px] rounded-md text-xs" aria-label="دوره خرید">
                <CalendarClock className="size-3.5" />
                <SelectValue placeholder="همه دوره‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه دوره‌ها</SelectItem>
                {PURCHASE_PERIODS.map((p) => (
                  <SelectItem key={p} value={p}>{PERIOD_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              dir="rtl"
              value={provinceId ? String(provinceId) : 'all'}
              onValueChange={(v) => {
                setProvinceId(v === 'all' ? null : Number(v));
                setCityId(null);
                setPage(1);
              }}
            >
              <SelectTrigger size="sm" className="h-9 w-[168px] rounded-md text-xs" aria-label="استان">
                <MapPin className="size-3.5" />
                <SelectValue placeholder="همه استان‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه استان‌ها</SelectItem>
                {provinces.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              dir="rtl"
              value={cityId ? String(cityId) : 'all'}
              onValueChange={(v) => {
                setCityId(v === 'all' ? null : Number(v));
                setPage(1);
              }}
              disabled={!provinceId}
            >
              <SelectTrigger size="sm" className="h-9 w-[150px] rounded-md text-xs" aria-label="شهر">
                <SelectValue placeholder={provinceId ? 'همه شهرها' : 'ابتدا استان'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه شهرها</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="truncate">
              {directory.isLoading && !data
                ? '…'
                : tab === 'buyers'
                  ? <>
                      <b className="text-foreground">{toFa(total)}</b> نیاز خرید
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
            onClick={openCategoriesSheet}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:border-foreground/30"
          >
            <List size={14} className="text-muted-foreground" />
            دسته ها
          </button>
          <button
            type="button"
            onClick={() => setSheet('period')}
            className={cn(
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border bg-card px-3 py-2 text-xs font-medium transition-colors',
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
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border bg-card px-3 py-2 text-xs font-medium transition-colors',
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
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-primary/45 bg-primary/5 px-3 py-2 text-xs font-bold text-primary"
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
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-primary/45 bg-primary/5 px-3 py-2 text-xs font-bold text-primary"
            >
              «{s}»
              <X size={13} />
            </button>
          )}
        </div>

        {/* ── تب خریدهای دوره‌ای ── */}
        {tab === 'buyers' && (
          <div role="tabpanel" aria-label="خریدهای دوره‌ای">
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
          </div>
        )}

        {/* ── تب درخواست‌های خرید (خواستهٔ مالک دور سوم: تب کامل، داخلش می‌شود
            رفت و صفحه‌بندی دارد؛ لینک «مشاهدهٔ همه» فقط برای جستجوی پیشرفته‌تر) ── */}
        {tab === 'requests' && (
          <div role="tabpanel" aria-label="درخواست‌های خرید">
            {reqData.isLoading && !reqData.data ? (
              <div className="grid place-items-center py-16 text-muted-foreground">
                <Loader2 className="animate-spin" size={22} />
              </div>
            ) : reqItems.length === 0 ? (
              <div className="rounded-md border border-dashed bg-card p-10 text-center">
                <ClipboardList size={30} className="mx-auto text-muted-foreground/60" />
                <p className="mt-3 text-sm font-bold">درخواست خریدی در این فیلتر نیست.</p>
                <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
                  فیلترها را تغییر دهید یا همهٔ درخواست‌ها را ببینید —{' '}
                  <Link href="/buyAd-requests" className="font-bold text-primary underline">
                    همهٔ درخواست‌های خرید
                  </Link>
                </p>
              </div>
            ) : (
              <>
                <ul className="space-y-3">
                  {reqItems.map((r) => (
                    <RequestPreviewCard key={r.id} request={r} />
                  ))}
                </ul>
                {reqPageCount > 1 && (
                  <nav className="mt-4 flex items-center justify-center gap-3" aria-label="صفحه‌بندی درخواست‌ها">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-md"
                      disabled={reqPage <= 1}
                      onClick={() => setReqPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronRight size={15} /> قبلی
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      صفحهٔ {toFa(reqPage)} از {toFa(reqPageCount)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-md"
                      disabled={reqPage >= reqPageCount}
                      onClick={() => setReqPage((p) => Math.min(reqPageCount, p + 1))}
                    >
                      بعدی <ChevronLeft size={15} />
                    </Button>
                  </nav>
                )}
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
                className="flex w-full items-center justify-between gap-2 rounded-md bg-primary/5 px-3 py-3 text-start text-sm font-bold text-primary transition-colors hover:bg-primary/10"
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
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-md px-3 py-3 text-start text-sm transition-colors hover:bg-accent',
                  c.id === categoryId ? 'font-bold text-primary' : 'font-medium',
                )}
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
                  'flex w-full items-center justify-between gap-2 rounded-md px-3 py-3 text-start text-sm transition-colors hover:bg-accent',
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
            value={provinceId ? String(provinceId) : 'all'}
            onValueChange={(v) => {
              setProvinceId(v === 'all' ? null : Number(v));
              setCityId(null);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full rounded-md" aria-label="استان">
              <SelectValue placeholder="همه استان‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه استان‌ها</SelectItem>
              {provinces.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            dir="rtl"
            value={cityId ? String(cityId) : 'all'}
            onValueChange={(v) => {
              setCityId(v === 'all' ? null : Number(v));
              setPage(1);
            }}
            disabled={!provinceId}
          >
            <SelectTrigger className="w-full rounded-md" aria-label="شهر">
              <SelectValue placeholder={provinceId ? 'همه شهرها' : 'ابتدا استان را انتخاب کنید'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه شهرها</SelectItem>
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

      {/* مودال پیشنهاد تکی — key: هر هدف تازه، فرم تازه با نمونهٔ پارامتریک؛
          عنوان مودال خیلی واضح نام دسته را می‌آورد: «پیشنهاد تامین برنج» */}
      <SupplyOfferModal
        key={offerTarget?.id ?? 'closed'}
        open={offerTarget !== null}
        onClose={() => setOfferTarget(null)}
        targets={offerTarget ? [offerTarget] : []}
        products={myProducts?.items}
        category={targetCategory(offerTarget)}
      />

      {/* ویزار پیشنهاد گروهی — دستهٔ آخر → خریداران همان دسته → فرم */}
      <GroupOfferWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        products={myProducts?.items}
      />
      {/* الگوی همیشگی ۱-۱۱: بدون بستهٔ فعال، مودال «خرید اشتراک» باز می‌شود */}
      <NeedPackageModal
        open={needPkgOpen}
        onClose={() => setNeedPkgOpen(false)}
        kind="package"
        message="ارسال پیشنهاد تامین به خریداران عمده، ویژهٔ فروشندگان دارندهٔ بستهٔ اشتراک فعال است. با فعال‌سازی یکی از بسته‌های ایمچ، از امروز می‌توانید برای خریداران پیشنهاد بفرستید."
      />
      <AuthModal
        open={authOpen}
        intent="offer"
        onClose={() => setAuthOpen(false)}
        onLoggedIn={() => {
          setAuthOpen(false);
          void quotaQuery.refetch();
        }}
      />
    </div>
  );
}

/** ناوبری دسته‌های خریداران — عین الگوی آگهی‌های خرید (خواستهٔ مالک ۱-۱۱):
 *  صفحهٔ اول فقط سطوح اول؛ با انتخاب دسته (مثلاً کشاورزی) فقط خریداران همان
 *  دسته لود می‌شوند و سایدبار فرزندان همان دسته + دکمهٔ «بازگشت» نشان می‌دهد.
 *  برای برگ، هم‌ترازهای خودش (فرزندان والد) دیده می‌شوند. */
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
  const path = activeId != null ? findCategoryPathById(tree, activeId) : null;
  const current = path?.[path.length - 1];
  const parent = path && path.length > 1 ? path[path.length - 2] : undefined;

  // صفحهٔ اول — فقط سطوح اول (خواستهٔ مالک ۱-۱۱)
  const rootsList = (highlightId?: number) => (
    <nav className="max-h-96 space-y-0.5 overflow-y-auto pe-1 text-sm" aria-label="دسته‌های خرید">
      <button
        type="button"
        onClick={onClear}
        className={cn(
          'block w-full rounded-md px-2.5 py-1.5 text-start transition-colors',
          activeId == null
            ? 'bg-accent font-bold text-accent-foreground'
            : 'text-muted-foreground hover:bg-secondary',
        )}
      >
        همه دسته‌ها
      </button>
      {tree.map((root) => (
        <button
          key={root.id}
          type="button"
          onClick={() => onPick(root)}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-start transition-colors',
            root.id === highlightId || root.id === activeId
              ? 'font-bold text-primary'
              : 'font-medium text-foreground/85 hover:bg-secondary',
          )}
        >
          <span className="line-clamp-1">{root.categoryName}</span>
          {!!root.children?.length && (
            <ChevronLeft size={14} className="shrink-0 opacity-50" aria-hidden />
          )}
        </button>
      ))}
    </nav>
  );

  if (!current) return rootsList();

  // تمرکز: فرزندان دستهٔ فعلی؛ اگر برگ بود → هم‌ترازهای خودش (فرزندان والد)
  const focus = current.children?.length ? current : parent;
  if (!focus) return rootsList(current.id);

  // مقصد دکمهٔ بازگشت: والدِ سطحِ درحال‌نمایش (یا فهرست سطوح اول اگر ریشه است)
  const focusIndex = path.indexOf(focus);
  const backTarget = focusIndex > 0 ? path[focusIndex - 1] : undefined;

  return (
    <nav aria-label="زیردسته‌ها">
      {/* همه دسته ها (خواسته مالک ۴-۱۱ — الگوی مشترک با سایدبار آگهی‌ها) —
          فلش بازگشتِ روشن، هم‌رنگ برند و بولد */}
      <button
        type="button"
        onClick={() => (backTarget ? onPick(backTarget) : onClear())}
        className="mb-2 flex w-full items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/5"
      >
        <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
        همه دسته ها
      </button>

      {/* سرشاخه — بولد و غلیظ، هم‌اندازهٔ زیردسته‌ها؛ زیردسته‌ها یک تَب جلوتر */}
      <p className="mb-1.5 px-2.5 text-sm font-extrabold text-foreground">
        {focus.categoryName}
        <span className="ms-1 text-[11px] font-normal text-muted-foreground">
          ({toFa(focus.children?.length ?? 0)} زیردسته)
        </span>
      </p>

      <ul className="max-h-96 space-y-0.5 overflow-y-auto pe-1">
        {(focus.children ?? []).map((c) => {
          const active = c.id === current.id;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onPick(c)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-start text-sm transition-colors ps-7',
                  active
                    ? 'font-bold text-primary'
                    : 'text-muted-foreground hover:bg-secondary',
                )}
              >
                <span className="line-clamp-1">{c.categoryName}</span>
                {!!c.children?.length && (
                  <ChevronLeft size={14} className="shrink-0 opacity-50" aria-hidden />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** کارت پیش‌نمایش درخواست خرید — عین چیدمان باسکول (خواستهٔ مالک ۱-۱۱):
 *  سربرگ آواتار + نام خریدار، جملهٔ «خریدار … هستم»، تاریخ و مکان. */
function RequestPreviewCard({ request }: { request: BuyRequest }) {
  const initial = request.firstName.trim().charAt(0) || 'خ';
  return (
    <li>
      <Link
        href="/buyAd-requests"
        className="block rounded-md border bg-card p-4 transition-shadow hover:shadow-md sm:p-5"
      >
        {/* سربرگ: خریدار */}
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
            {initial}
          </span>
          <span className="truncate text-sm font-extrabold sm:text-[15px]">
            {request.firstName} {request.lastName}
          </span>
        </div>

        {/* جمله — عین باسکول */}
        <p className="mt-3 text-[13px] leading-7 text-muted-foreground sm:text-sm">
          خریدار <b className="text-foreground">{toFa(request.requirementAmount)} {request.unit}</b>{' '}
          <b className="text-foreground">{request.subcategoryName}</b>
          {request.name ? (
            <> از نوع <b className="text-foreground">{request.name}</b> هستم</>
          ) : (
            ' هستم'
          )}
        </p>

        {/* زمان و مکان */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays size={14} className="text-foreground/45" />
            {dateFa(request.createdAt)}
          </span>
          {request.city && (
            <span className="flex items-center gap-1">
              <MapPin size={14} className="text-foreground/45" />
              {request.city}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}
