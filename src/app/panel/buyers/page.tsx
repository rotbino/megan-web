'use client';

/**
 * خریداران پنل (بازطراحی مالک ۴-۱۱؛ ۶-۱۱؛ ۱۱-۱۱) — عین صفحهٔ عمومی خریداران
 * (/buyers) با چهار تب، با این تفاوت که اینجا نتایج بر اساس امتیاز تطابق با
 * آگهی‌های خودِ فروشنده سورت می‌شوند — سیستم با تطابق گروه‌های محصولی و نوع
 * محصول فروشنده با گروه کالاهای دفتر خرید/درخواست‌های خریداران، مطابق‌ترین‌ها
 * را بالاتر می‌آورد (بج «دقت تطابق» روی کارت‌ها).
 *  • تب‌بار (خواستهٔ مالک ۱۱-۱۱): چسبیده به زیر هدر پنل، تمام‌عرض، با مرز و
 *    سایهٔ خودش — از محتوای صفحه جدا می‌شود و با اسکرول سر جایش می‌ماند؛
 *    تب‌های زیرخط‌دار عین تب‌ویوی واقعی (تب فعال به محتوا وصل است)؛ بدون
 *    شمارنده (دور دوم ۱۱-۱۱): تب‌ها خلوت و کم‌جا — فقط آیکون + عنوان
 *  • نوار فیلتر موبایل (دور دوم ۱۱-۱۱): عین دیوار — جستجوی پیل‌گرد
 *    تمام‌عرض + فیلترهای دسته/استان/شهر به‌صورت چیش‌های افقی کنار هم در یک
 *    نوار سرخود (چیپ شهر فقط در تب دوره‌ای)؛ دسکتاپ همان گرید همیشگی
 *  • فوری: کارت خریدار با تماس/چت/نشان (عین پنل قبلی)
 *  • دوره‌ای: کارت دفتر خرید با «ارسال پیشنهاد تامین» + ویزار گروهی
 *  • ارسال‌شده → «پیشنهادهای من» (خواسته مالک ۸-۱۱): تایم‌لاین واحدِ عین
 *    صفحهٔ خریدارانِ هر کالا — پیشنهادهای تامین ارسالی به درخواست‌های دوره‌ای
 *    (متن و مشخصات روی کارت) + گفتگوهای خرید فوری
 *  • دفاتر ذخیره‌شده (خواسته مالک ۱۰-۱۱ دور ۵): کارت‌های مشتری بالقوه
 *  • جستجو و فیلتر دسته‌های محصول + استان/شهر همچنان در دسترس است
 *  • فرم مینیمال (خواسته مالک ۶-۱۱): بدون جملهٔ سورت/سهمیه — سهمیه و
 *    محدودیت روزانه حذف شد؛ هزینه گروهی فقط لحظهٔ ارسال از کیف پول کسر می‌شود
 *  • گیت‌ها (خواستهٔ مالک ۷-۱۱): دیدن خریداران برای همهٔ فروشندگان آزاد
 *    شد؛ ارسال تامین/تماس/پیام اول گیت ثبت کالا دارد (مودال «ثبت کالا لازم
 *    است») و بعد گیت بستهٔ فعال — این‌طوری فروشندگان به ثبت کالایشان تشویق
 *    می‌شوند و فرمول تطابق (کالا ۴۰ + نوع ۲۰ + حجم ۲۵ + مکان ۱۵) روی همان
 *    داده‌ها مطابق‌ترین و به‌صرفه‌ترین خریداران را می‌سازد
 */

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BookMarked,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Search,
  Send,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import {
  useBuyerDirectory,
  useBuyRequests,
  useCities,
  useCategoryTree,
  useMyOfferQuota,
  useMyProducts,
  useProvinces,
} from '@/lib/mock/hooks';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PanelCard } from '@/components/panel/panel-parts';
import { BuyerCard } from '@/components/panel/buyer-card';
import { BookEntryCard } from '@/components/buyers/book-entry-card';
import { SupplyOfferModal } from '@/components/buyers/supply-offer-modal';
import { GroupOfferWizard } from '@/components/buyers/group-offer-wizard';
import { SentOffersList } from '@/components/panel/sent-offers-list';
import { SavedBuyerBooksList } from '@/components/panel/saved-buyer-books';
import { NeedPackageModal } from '@/components/shared/need-package-modal';
import { matchForBuyRequest, matchForDirectoryItem, sortByMatch } from '@/lib/buyer-match';
import { findCategoryPathById } from '@/lib/categories';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BuyerDirectoryItem, Category } from '@/lib/types';

type PanelBuyersTab = 'requests' | 'periodic' | 'sent' | 'saved';
const REQ_BATCH = 10;

export default function PanelBuyersPage() {
  return (
    <Suspense fallback={<div className="mt-3 h-40 animate-pulse rounded-lg border bg-card sm:mt-4" />}>
      <PanelBuyersInner />
    </Suspense>
  );
}

function PanelBuyersInner() {
  // تب از URL می‌آید (?tab=requests|periodic|sent — دور ۲۸): کلیک روی سکشن‌های
  // «درخواست‌های خرید فوری/دوره‌ای» صفحهٔ اول، تبِ متناسب را باز می‌کند
  const tabParam = useSearchParams().get('tab');
  const initialTab: PanelBuyersTab =
    tabParam === 'periodic'
      ? 'periodic'
      : tabParam === 'sent'
        ? 'sent'
        : tabParam === 'saved'
          ? 'saved'
          : 'requests';
  const { data: tree } = useCategoryTree();
  const { data: provinces = [] } = useProvinces();

  const [tab, setTab] = useState<PanelBuyersTab>(initialTab);
  const [q, setQ] = useState('');
  const [rootCat, setRootCat] = useState('all');
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const [batch, setBatch] = useState(1);
  const [dirPage, setDirPage] = useState(1);

  // پیشنهاد تکی/گروهی + مودال نیاز به بسته/ثبت کالا
  const [offerTarget, setOfferTarget] = useState<BuyerDirectoryItem | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [needPkgOpen, setNeedPkgOpen] = useState(false);
  const [needProductOpen, setNeedProductOpen] = useState(false);

  const roots: Category[] = useMemo(() => tree ?? [], [tree]);
  const rootId = rootCat !== 'all' ? Number(rootCat) : null;

  const { data: cities = [] } = useCities(provinceId ?? undefined);

  // آگهی‌های خودم + گیت بسته — پایهٔ امتیاز تطابق و پیشنهاد تامین
  // (خواسته مالک ۶-۱۱: سهمیه/سقف روزانه حذف شد — فقط isFeatured می‌ماند)
  const myProductsQuery = useMyProducts();
  const products = myProductsQuery.data?.items;
  const quotaQuery = useMyOfferQuota();
  const isFeatured = quotaQuery.data?.isFeatured ?? false;
  // گیت ثبت کالا (خواستهٔ مالک ۷-۱۱) — آگهی تأییدشده یا در انتظار، هر دو حساب است
  const hasProducts = (products ?? []).some(
    (p) => p.status === 'confirmed' || p.status === 'pending',
  );

  // ── تب فوری: درخواست‌های خرید (سرویس باسکول) — سورت تطابق سمت کلاینت ──
  const reqQuery = useBuyRequests({
    s: q || undefined,
    categoryId: rootId ?? undefined,
    provinceId: provinceId ?? undefined,
    perPage: 50,
  });
  const reqItems = useMemo(() => {
    const items = reqQuery.data?.items ?? [];
    return sortByMatch(items, (r) => matchForBuyRequest(tree ?? [], products, r).score);
  }, [reqQuery.data, tree, products]);
  const reqVisible = reqItems.slice(0, batch * REQ_BATCH);

  // ── تب دوره‌ای: دایرکتوری دفتر خرید — سورت تطابق داخل صفحه ──
  const dirQuery = useBuyerDirectory({
    categoryId: rootId ?? undefined,
    s: q || undefined,
    provinceId: provinceId ?? undefined,
    cityId: cityId ?? undefined,
    page: dirPage,
    perPage: 24,
  });
  const dirItems = useMemo(() => {
    const items = dirQuery.data?.items ?? [];
    return sortByMatch(items, (b) => matchForDirectoryItem(tree ?? [], products, b).score);
  }, [dirQuery.data, tree, products]);
  const dirTotal = dirQuery.data?.total ?? 0;
  const dirPageCount = Math.max(1, Math.ceil(dirTotal / 24));

  /** دروازهٔ پیشنهاد تامین (خواستهٔ مالک ۷-۱۱): اول گیت ثبت کالا — فروشندهٔ
   *  بدون آگهی مودال «ثبت کالا لازم است» را می‌بیند؛ بعد گیت بستهٔ فعال */
  const passOfferGates = (): boolean => {
    if (myProductsQuery.isPending || quotaQuery.isPending) return false;
    if (!hasProducts) {
      setNeedProductOpen(true);
      return false;
    }
    if (!isFeatured) {
      setNeedPkgOpen(true);
      return false;
    }
    return true;
  };

  /** دروازهٔ تماس/چت با خریدار — همان ترتیب: کالا اول، بعد بسته (فقط تماس) */
  const contactGate = (needPackageToo: boolean): boolean => {
    if (myProductsQuery.isPending || (needPackageToo && quotaQuery.isPending)) return false;
    if (!hasProducts) {
      setNeedProductOpen(true);
      return false;
    }
    if (needPackageToo && !isFeatured) {
      setNeedPkgOpen(true);
      return false;
    }
    return true;
  };

  const startOffer = (b: BuyerDirectoryItem) => {
    if (!passOfferGates()) return;
    setOfferTarget(b);
  };

  const startGroupOffer = () => {
    if (!passOfferGates()) return;
    setWizardOpen(true);
  };

  /** دستهٔ کامل هدف از درخت — برای واحد/مثال و عنوان «پیشنهاد تامین برنج» */
  const targetCategory = (b: BuyerDirectoryItem | null): Category | null => {
    if (!b) return null;
    const path = findCategoryPathById(tree ?? [], b.categoryId);
    if (path?.length) return path[path.length - 1];
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

  const resetPaging = () => {
    setBatch(1);
    setDirPage(1);
  };

  /** چیپ فیلتر موبایل (خواستهٔ مالک ۱۱-۱۱ دور دوم — عین دیوار): پیل‌گرد فشردهٔ
   *  ۳۶px با متن xs؛ در sm همه‌چیز به سلکت معمولیِ گرید برمی‌گردد (ارتفاع
   *  ۴۸/۵۲، گردِ کم، متن sm) — پسوند ! لازم است چون ارتفاع پایهٔ کامپوننت با
   *  سلکتور data-[size=default] از کلاس ساده خاصیت‌تر است */
  const chipTriggerCls =
    'h-9! w-auto gap-1! shrink-0 rounded-full! px-3! text-xs! sm:h-12! sm:w-full sm:gap-2! sm:rounded-md! sm:text-sm! md:h-13!';

  const tabButton = (
    key: PanelBuyersTab,
    icon: React.ReactNode,
    label: string,
    /** برچسب کوتاه موبایل — چهار تب در یک ردیف ۳۹۰px جا شوند (خواسته مالک:
     *  تب‌ها همیشه کنار هم، نه روی هم و نه نیازمند اسکرول) */
    shortLabel: string,
  ) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === key}
      onClick={() => setTab(key)}
      className={cn(
        // تب کلاسیک زیرخط‌دار (خواستهٔ مالک ۱۱-۱۱): خط زیرین ۲px روی مرز خود
        // نوار می‌نشیند و تب فعال را به محتوا وصل می‌کند — عین تب‌ویوی مرورگر.
        // بدون شمارنده (دور دوم ۱۱-۱۱): تب‌ها خلوت و کم‌جا
        'flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-2 text-[11px] font-bold transition-colors sm:px-3 sm:text-[13px]',
        tab === key
          ? 'border-primary font-extrabold text-primary'
          : 'border-transparent text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
      )}
    >
      {icon}
      {/* دسکتاپ: عنوان کامل · موبایل: عنوان کوتاه — هر چهار تب همیشه هم‌ردیف */}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{shortLabel}</span>
    </button>
  );

  return (
    // پوستهٔ پنل برای این صفحه پدینگ بالای main را حذف کرده
    // (GLUED_TOOLBAR_PAGES) — نوار تب مستقیم زیر هدر می‌نشیند، بدون مارجین
    // منفی (مارجین منفی + sticky در کروم به لبهٔ پدینگ برمی‌گردد و نوار جدا
    // می‌افتاد)
    <div>
      {/* تب‌بار چسبیده به زیر هدر (خواستهٔ مالک ۱۱-۱۱): تمام‌عرض (پدینگ افقی
          main با -mx خنثی شده)، با مرز و سایهٔ خودش تا از محتوا جدا دیده شود؛
          اسکرول که می‌شود سر جایش می‌ماند — موبایل زیر هدر پنل (top-14)،
          دسکتاپ چون main ظرف اسکرول است top-0 یعنی همان لبهٔ زیر هدر.
          تب‌های زیرخط‌دار عین تب‌ویوی واقعی؛ ردیف داخلی max-w-5xl هم‌تراز
          ستون محتواست. نوار خودش می‌لغزد نه اینکه صفحه را به‌هم بریزد */}
      <div className="sticky top-14 z-10 -mx-3 border-b border-border bg-background shadow-[0_3px_10px_rgba(35,38,43,0.12)] sm:-mx-4 lg:top-0 lg:-mx-6">
        <div
          className="mx-auto flex h-12 max-w-5xl items-stretch gap-1 overflow-x-auto px-3 sm:px-4 lg:px-6"
          role="tablist"
          aria-label="بخش‌های خریداران"
        >
          {tabButton(
            'requests',
            <ClipboardList size={14} className="shrink-0" />,
            'درخواست‌های خرید فوری',
            'خرید فوری',
          )}
          {tabButton(
            'periodic',
            <CalendarClock size={14} className="shrink-0" />,
            'درخواست‌های خرید دوره‌ای',
            'خرید دوره‌ای',
          )}
          {tabButton(
            'sent',
            <Send size={14} className="shrink-0" />,
            'پیشنهادهای من',
            'پیشنهادها',
          )}
          {tabButton(
            'saved',
            <BookMarked size={14} className="shrink-0" />,
            'دفاتر ذخیره شده',
            'دفاتر',
          )}
        </div>
      </div>

      {/* بدنه — ستون همیشگی، فاصلهٔ ثابت زیر تب‌بار */}
      <div className="mx-auto max-w-5xl space-y-4 pt-4">

      {/* جستجو + فیلترها — مشترک دو تب خریداران؛ تب «ارسال شده/دفاتر» فیلتر خودش را دارد.
          موبایل (خواستهٔ مالک ۱۱-۱۱ دور دوم): عین نوار فیلتر دیوار — جستجوی پیل‌گرد
          تمام‌عرض + فیلترهای دسته/استان/شهر به‌صورت چیش‌های افقی کنار هم در یک نوار
          سرخود که در تنگی خودش می‌لغزد (چیپ شهر فقط در تب دوره‌ای — در فوری بی‌معناست)؛
          دسکتاپ: همان گرید چهارستونی همیشگی — با sm:contents ظرف نوار در دسکتاپ
          محو می‌شود و سلکت‌ها مستقیم خانه‌های گرید می‌شوند */}
      {tab !== 'sent' && tab !== 'saved' && (
        <PanelCard>
          <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[1fr_190px_170px_150px]">
            <div className="relative">
              <Search size={16} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  resetPaging();
                }}
                placeholder="جستجو در خریداران (محصول، نوع کالا…)"
                className="rounded-full pe-9 sm:rounded-md"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:contents">
              <Select
                value={rootCat}
                onValueChange={(v) => {
                  setRootCat(v);
                  resetPaging();
                }}
              >
                <SelectTrigger className={chipTriggerCls} aria-label="گروه محصولات">
                  <SlidersHorizontal size={14} className="hidden text-muted-foreground sm:block" />
                  {/* پلیس‌هولدر هرگز دیده نمی‌شود (value همیشه all است) — متن چیپ از
                      خودِ آیتم «همه» می‌آید: موبایل نام کوتاه فیلتر، دسکتاپ متن کامل */}
                  <SelectValue placeholder="همه گروه ها" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="sm:hidden">دسته‌بندی</span>
                    <span className="hidden sm:inline">همه گروه ها</span>
                  </SelectItem>
                  {roots.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.categoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={provinceId ? String(provinceId) : 'all'}
                onValueChange={(v) => {
                  setProvinceId(v === 'all' ? null : Number(v));
                  setCityId(null);
                  resetPaging();
                }}
              >
                <SelectTrigger className={chipTriggerCls} aria-label="استان">
                  <SelectValue placeholder="همه استان‌ها" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="sm:hidden">استان</span>
                    <span className="hidden sm:inline">همه استان‌ها</span>
                  </SelectItem>
                  {provinces.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={cityId ? String(cityId) : 'all'}
                onValueChange={(v) => {
                  setCityId(v === 'all' ? null : Number(v));
                  resetPaging();
                }}
                disabled={!provinceId || tab !== 'periodic'}
              >
                <SelectTrigger
                  className={cn(chipTriggerCls, tab !== 'periodic' && 'hidden sm:flex')}
                  aria-label="شهر"
                >
                  <SelectValue placeholder="همه شهرها" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="sm:hidden">شهر</span>
                    <span className="hidden sm:inline">
                      {tab === 'periodic' && provinceId ? 'همه شهرها' : 'شهر (دوره‌ای)'}
                    </span>
                  </SelectItem>
                  {cities.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </PanelCard>
      )}

      {/* ── تب فوری: کارت خریدار با تماس/چت/نشان ── */}
      {tab === 'requests' && (
        <div role="tabpanel" aria-label="درخواست‌های خرید فوری">
          {reqQuery.isLoading && !reqQuery.data ? (
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-44 animate-pulse rounded-lg border bg-card" />
              ))}
            </div>
          ) : reqItems.length === 0 ? (
            <PanelCard className="py-10 text-center text-sm text-muted-foreground">
              درخواستی مطابق فیلتر شما پیدا نشد.
            </PanelCard>
          ) : (
            <div className="space-y-3">
              {reqVisible.map((r) => {
                const m = matchForBuyRequest(tree ?? [], products, r);
                return (
                  <BuyerCard
                    key={r.id}
                    request={r}
                    matchBadge={m.score > 0 ? { score: m.score, label: 'تطابق' } : undefined}
                    relatedHint={m.relatedProduct ? `مرتبط با آگهی شما: ${m.relatedProduct}` : undefined}
                    contactGate={contactGate}
                  />
                );
              })}
              {reqVisible.length < reqItems.length && (
                <button
                  type="button"
                  onClick={() => setBatch((b) => b + 1)}
                  className="w-full rounded-md border border-dashed bg-card py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/5"
                >
                  درخواست‌های بیشتر
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── تب دوره‌ای: کارت دفتر خرید + پیشنهاد تامین ── */}
      {tab === 'periodic' && (
        <div role="tabpanel" aria-label="درخواست‌های خرید دوره‌ای">
          {/* دکمهٔ پیشنهاد گروهی — بالای لیست مثل صفحهٔ عمومی */}
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={startGroupOffer}
              className="flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-input bg-card px-3.5 py-2.5 text-xs font-bold text-foreground/75 transition-colors hover:border-foreground/30 hover:bg-secondary hover:text-foreground"
            >
              <Users size={14} />
              پیشنهاد تامین گروهی
            </button>
          </div>

          {dirQuery.isLoading && !dirQuery.data ? (
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-36 animate-pulse rounded-lg border bg-card" />
              ))}
            </div>
          ) : dirItems.length === 0 ? (
            <PanelCard className="py-10 text-center text-sm text-muted-foreground">
              خریداری با این فیلترها پیدا نشد.
            </PanelCard>
          ) : (
            <>
              <ul className={cn('space-y-3 transition-opacity', dirQuery.isFetching && 'opacity-60')}>
                {dirItems.map((b) => {
                  const m = matchForDirectoryItem(tree ?? [], products, b);
                  return (
                    <BookEntryCard
                      key={b.id}
                      entry={b}
                      onOffer={() => startOffer(b)}
                      matchBadge={m.score > 0 ? { score: m.score } : undefined}
                    />
                  );
                })}
              </ul>

              {dirPageCount > 1 && (
                <nav className="mt-4 flex items-center justify-center gap-3" aria-label="صفحه‌بندی خریداران دوره‌ای">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-md"
                    disabled={dirPage <= 1}
                    onClick={() => setDirPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronRight size={15} /> قبلی
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    صفحهٔ {toFa(dirPage)} از {toFa(dirPageCount)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-md"
                    disabled={dirPage >= dirPageCount}
                    onClick={() => setDirPage((p) => Math.min(dirPageCount, p + 1))}
                  >
                    بعدی <ChevronLeft size={15} />
                  </Button>
                </nav>
              )}
            </>
          )}
        </div>
      )}

      {/* ── تب سوم (خواسته مالک ۸-۱۱): «پیشنهادهای من» — تایم‌لاین واحد عین
          صفحهٔ خریدارانِ هر کالا؛ دکمهٔ حالت خالی به تب دوره‌ای برمی‌گردد ── */}
      {tab === 'sent' && <SentOffersList onGoBuyers={() => setTab('periodic')} />}

      {/* ── تب چهارم (خواستهٔ مالک ۱۰-۱۱ دور ۵): «دفاتر ذخیره شده» — کارت‌های
          مشتری بالقوه؛ مشاهدهٔ دفتر + گفتگو + حذف ── */}
      {tab === 'saved' && (
        <div role="tabpanel" aria-label="دفاتر ذخیره شده">
          <SavedBuyerBooksList />
        </div>
      )}

      {/* مودال پیشنهاد تکی — عنوان با نام دستهٔ کالا */}
      <SupplyOfferModal
        key={offerTarget?.id ?? 'closed'}
        open={offerTarget !== null}
        onClose={() => setOfferTarget(null)}
        targets={offerTarget ? [offerTarget] : []}
        products={products}
        category={targetCategory(offerTarget)}
      />

      {/* ویزار پیشنهاد گروهی — دستهٔ آخر → خریداران همان دسته → فرم */}
      <GroupOfferWizard open={wizardOpen} onClose={() => setWizardOpen(false)} products={products} />

      {/* بدون کالای ثبت‌شده (خواستهٔ مالک ۷-۱۱) → مودال «ثبت کالا لازم است» */}
      <NeedPackageModal
        open={needProductOpen}
        onClose={() => setNeedProductOpen(false)}
        kind="product"
        message="برای ارسال تامین یا تماس یا پیام، باید کالاهای خود را برای فروش ثبت کنید تا خریداران مرتبط به شما نمایش داده شوند. با ثبت کالا و حداقل سفارش، سیستم تطابق مطابق‌ترین و به‌صرفه‌ترین خریداران را به شما نشان می‌دهد."
      />
      {/* بدون بستهٔ فعال → مودال خرید اشتراک (الگوی همیشگی) */}
      <NeedPackageModal
        open={needPkgOpen}
        onClose={() => setNeedPkgOpen(false)}
        kind="package"
        message="ارسال پیشنهاد تامین به خریداران عمده، ویژهٔ فروشندگان دارندهٔ بستهٔ اشتراک فعال است. با فعال‌سازی یکی از بسته‌های ایمچ، از امروز می‌توانید برای خریداران پیشنهاد بفرستید."
      />
      </div>
    </div>
  );
}
