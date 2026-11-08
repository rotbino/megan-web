'use client';

/**
 * خریداران پنل (بازطراحی مالک ۴-۱۱؛ ۶-۱۱) — عین صفحهٔ عمومی خریداران (/buyers)
 * با سه تب «درخواست‌های خرید فوری»، «درخواست‌های خرید دوره‌ای» و «پیشنهادات
 * ارسال شده»، با این تفاوت که اینجا نتایج بر اساس امتیاز تطابق با آگهی‌های
 * خودِ فروشنده سورت می‌شوند — سیستم با تطابق گروه‌های محصولی و نوع محصول
 * فروشنده با گروه کالاهای دفتر خرید/درخواست‌های خریداران، مطابق‌ترین‌ها را
 * بالاتر می‌آورد (بج «دقت تطابق» روی کارت‌ها).
 *  • فوری: کارت خریدار با تماس/چت/نشان (عین پنل قبلی)
 *  • دوره‌ای: کارت دفتر خرید با «ارسال پیشنهاد تامین» + ویزار گروهی
 *  • ارسال‌شده → «پیشنهادهای من» (خواسته مالک ۸-۱۱): تایم‌لاین واحدِ عین
 *    صفحهٔ خریدارانِ هر کالا — پیشنهادهای تامین ارسالی به درخواست‌های دوره‌ای
 *    (متن و مشخصات روی کارت) + گفتگوهای خرید فوری؛ تب‌ها همیشه در یک ردیف
 *    کنار هم (موبایل و دسکتاپ)
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
  useMySentOffers,
  useMyUrgentChats,
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
import { NeedPackageModal } from '@/components/shared/need-package-modal';
import { matchForBuyRequest, matchForDirectoryItem, sortByMatch } from '@/lib/buyer-match';
import { findCategoryPathById } from '@/lib/categories';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BuyerDirectoryItem, Category } from '@/lib/types';

type PanelBuyersTab = 'requests' | 'periodic' | 'sent';
const REQ_BATCH = 10;

export default function PanelBuyersPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-lg border bg-card" />}>
      <PanelBuyersInner />
    </Suspense>
  );
}

function PanelBuyersInner() {
  // تب از URL می‌آید (?tab=requests|periodic|sent — دور ۲۸): کلیک روی سکشن‌های
  // «درخواست‌های خرید فوری/دوره‌ای» صفحهٔ اول، تبِ متناسب را باز می‌کند
  const tabParam = useSearchParams().get('tab');
  const initialTab: PanelBuyersTab =
    tabParam === 'periodic' ? 'periodic' : tabParam === 'sent' ? 'sent' : 'requests';
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

  // ── تب سوم (خواسته مالک ۶-۱۱؛ ۸-۱۱): «پیشنهادهای من» — تایم‌لاین واحدِ
  //    پیشنهادهای تامین + گفتگوهای خرید فوری؛ فقط شمارِ بج، لیست خودش داخل
  //    تب با فیلتر خودش لود می‌شود ──
  const sentQuery = useMySentOffers({ perPage: 1 });
  const urgentBadgeQuery = useMyUrgentChats(undefined);
  const sentCount = (sentQuery.data?.total ?? 0) + (urgentBadgeQuery.data?.items.length ?? 0);

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

  const tabButton = (
    key: PanelBuyersTab,
    icon: React.ReactNode,
    label: string,
    /** برچسب کوتاه موبایل — سه تب در یک ردیف ۳۹۰px جا شوند (خواسته مالک:
     *  تب‌ها همیشه کنار هم، نه روی هم و نه نیازمند اسکرول) */
    shortLabel: string,
    count: number,
  ) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === key}
      onClick={() => setTab(key)}
      className={cn(
        // سگمنت‌بار: دکمه‌های هم‌عرض دسکتاپ؛ موبایل سه تب کوتاه کنار هم
        'flex flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 py-2 text-[11px] font-bold transition-all sm:px-2 sm:text-xs',
        // تب فعال = کارت روشنِ برآمده از زمینهٔ سگمنت — سایهٔ مشخص تا در موبایل
        // هم چشم بدون تلاش سه تب را ببیند
        tab === key
          ? 'bg-card text-primary shadow-[0_1px_4px_rgba(0,0,0,0.14)] font-extrabold'
          : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
      )}
    >
      {icon}
      {/* دسکتاپ: عنوان کامل · موبایل: عنوان کوتاه — هر سه تب همیشه هم‌ردیف */}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{shortLabel}</span>
      <span
        className={cn(
          'rounded-full px-1.5 py-px font-num text-[10.5px] tabular-nums',
          tab === key ? 'bg-primary/10 text-primary' : 'bg-foreground/[0.06] text-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* تب‌ویوی سگمنتی (خواسته مالک ۷-۱۱): زمینهٔ متفاوت از محتوا + دکمهٔ فعال
          برآمده — دیگر «جزئی از محتوا» به نظر نمی‌رسد؛ سه تب همیشه یک ردیف کنار هم
          در موبایل (برچسب کوتاه) و دسکتاپ (هم‌عرض، عنوان کامل). دور هفدهم (۷-۱۱):
          نوار تب اسکرول افقی خودش را دارد — اگر روی گوشی‌های باریک جا نشود، خود
          نوار می‌لغزد نه اینکه صفحه را به‌هم بریزد (خواستهٔ مالک: موبایل بی‌نقص) */}
      <div
        className="flex items-stretch gap-1 overflow-x-auto rounded-lg border border-border bg-secondary/70 p-1"
        role="tablist"
        aria-label="بخش‌های خریداران"
      >
        {tabButton(
          'requests',
          <ClipboardList size={14} className="shrink-0" />,
          'درخواست‌های خرید فوری',
          'خرید فوری',
          reqQuery.isLoading && !reqQuery.data ? 0 : reqItems.length,
        )}
        {tabButton(
          'periodic',
          <CalendarClock size={14} className="shrink-0" />,
          'درخواست‌های خرید دوره‌ای',
          'خرید دوره‌ای',
          dirQuery.isLoading && !dirQuery.data ? 0 : dirTotal,
        )}
        {tabButton(
          'sent',
          <Send size={14} className="shrink-0" />,
          'پیشنهادهای من',
          'پیشنهادها',
          sentQuery.isLoading || urgentBadgeQuery.isLoading ? 0 : sentCount,
        )}
      </div>

      {/* جستجو + فیلترها — مشترک دو تب خریداران؛ تب «ارسال شده» فیلتر خودش را دارد */}
      {tab !== 'sent' && (
        <PanelCard>
          <div className="grid gap-2 sm:grid-cols-[1fr_190px_170px_150px]">
            <div className="relative">
              <Search size={16} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  resetPaging();
                }}
                placeholder="جستجو در خریداران (محصول، نوع کالا…)"
                className="rounded-md pe-9"
              />
            </div>
            <Select
              value={rootCat}
              onValueChange={(v) => {
                setRootCat(v);
                resetPaging();
              }}
            >
              <SelectTrigger className="w-full rounded-md" aria-label="گروه محصولات">
                <SlidersHorizontal size={14} className="text-muted-foreground" />
                <SelectValue placeholder="همه گروه ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه گروه ها</SelectItem>
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
              <SelectTrigger className="w-full rounded-md" aria-label="استان">
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
              onValueChange={(v) => {
                setCityId(v === 'all' ? null : Number(v));
                resetPaging();
              }}
              disabled={!provinceId || tab !== 'periodic'}
            >
              <SelectTrigger className="w-full rounded-md" aria-label="شهر">
                <SelectValue placeholder={tab === 'periodic' && provinceId ? 'همه شهرها' : 'شهر (دوره‌ای)'} />
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
  );
}
