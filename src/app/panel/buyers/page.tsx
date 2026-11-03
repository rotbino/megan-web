'use client';

/**
 * خریداران پنل (بازطراحی مالک ۴-۱۱) — عین صفحهٔ عمومی خریداران (/buyers)
 * با دو تب «درخواست‌های خرید فوری» و «درخواست‌های خرید دوره‌ای»، با این
 * تفاوت که اینجا نتایج بر اساس امتیاز تطابق با آگهی‌های خودِ فروشنده
 * سورت می‌شوند — سیستم با تطابق گروه‌های محصولی و نوع محصول فروشنده با
 * گروه کالاهای دفتر خرید/درخواست‌های خریداران، مطابق‌ترین‌ها را بالاتر
 * می‌آورد (بج «دقت تطابق» روی کارت‌ها).
 *  • فوری: کارت خریدار با تماس/چت/نشان (عین پنل قبلی)
 *  • دوره‌ای: کارت دفتر خرید با «ارسال پیشنهاد تامین» + ویزار گروهی
 *  • جستجو و فیلتر دسته‌های محصول + استان/شهر همچنان در دسترس است
 *  • گیت بسته (خواسته مالک): بستهٔ رایگان خریداران را نمی‌بیند
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Crown,
  Lock,
  Search,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import {
  useBuyerDirectory,
  useBuyRequests,
  useCities,
  useCategoryTree,
  useMyOfferQuota,
  useMyPackage,
  useMyProducts,
  useProvinces,
} from '@/lib/mock/hooks';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PanelCard } from '@/components/panel/panel-parts';
import { BuyerCard } from '@/components/panel/buyer-card';
import { BookEntryCard } from '@/components/buyers/book-entry-card';
import { SupplyOfferModal } from '@/components/buyers/supply-offer-modal';
import { GroupOfferWizard } from '@/components/buyers/group-offer-wizard';
import { NeedPackageModal } from '@/components/shared/need-package-modal';
import { MarkUserSheet, type MarkTarget } from '@/components/shared/mark-user-sheet';
import { matchForBuyRequest, matchForDirectoryItem, sortByMatch } from '@/lib/buyer-match';
import { findCategoryPathById } from '@/lib/categories';
import { toFa } from '@/lib/format';
import { priceFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BuyerDirectoryItem, Category, PurchasePeriod } from '@/lib/types';

type PanelBuyersTab = 'requests' | 'periodic';
const REQ_BATCH = 10;

export default function PanelBuyersPage() {
  const { data: tree } = useCategoryTree();
  const { data: provinces = [] } = useProvinces();

  // گیت بسته (خواسته مالک): بسته رایگان خریداران را نمی‌بیند
  const { data: myPackage, isLoading: pkgLoading } = useMyPackage();

  const [tab, setTab] = useState<PanelBuyersTab>('requests');
  const [q, setQ] = useState('');
  const [rootCat, setRootCat] = useState('all');
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const [batch, setBatch] = useState(1);
  const [dirPage, setDirPage] = useState(1);

  // نشان کردن خریدار — مودال CRM
  const [markTarget, setMarkTarget] = useState<MarkTarget | null>(null);
  // پیشنهاد تکی/گروهی + مودال نیاز به بسته
  const [offerTarget, setOfferTarget] = useState<BuyerDirectoryItem | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [needPkgOpen, setNeedPkgOpen] = useState(false);

  const roots: Category[] = useMemo(() => tree ?? [], [tree]);
  const rootId = rootCat !== 'all' ? Number(rootCat) : null;

  const { data: cities = [] } = useCities(provinceId ?? undefined);

  // آگهی‌های خودم + سهمیه — پایهٔ امتیاز تطابق و پیشنهاد تامین
  const { data: myProducts } = useMyProducts();
  const products = myProducts?.items;
  const quotaQuery = useMyOfferQuota();
  const quota = quotaQuery.data ?? null;
  const isFeatured = quota?.isFeatured ?? false;

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

  /** دروازهٔ پیشنهاد تامین — فروشندهٔ واردشده؛ بدون بسته → مودال خرید اشتراک */
  const passOfferGates = (): boolean => {
    if (quotaQuery.isPending) return false;
    if (!isFeatured) {
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

  // ── گیت بسته: رایگان = قفل؛ در حال بارگذاری = اسکلتون ──
  if (pkgLoading || !myPackage) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }
  if (!myPackage.features.canSeeBuyers) {
    return (
      <div className="mx-auto max-w-xl">
        <PanelCard className="text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-amber-50 text-amber-500">
            <Lock size={28} />
          </span>
          <h1 className="mt-4 flex items-center justify-center gap-2 text-base font-extrabold">
            <Users size={18} className="text-primary" /> دسترسی به خریداران ویژه بسته فعال است
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            با بسته رایگان می‌توانید تا ۱۰ محصول ثبت کنید و هر تعداد درخواست خرید بفرستید؛ اما برای دیدن
            شماره تماس خریداران و ارسال پیشنهاد تامین، یکی از بسته‌های اشتراک ایمچ را فعال کنید.
          </p>
          <div className="mt-4 grid gap-2 text-start text-xs sm:grid-cols-3">
            {['دو ماهه — ۱۹۹ هزار تومان', 'شش ماهه — ۴۹۹ هزار تومان', 'یک‌ساله — ۷۹۹ هزار تومان'].map((t) => (
              <span key={t} className="flex items-center gap-1.5 rounded-md border bg-secondary/50 px-3 py-2">
                <Crown size={13} className="shrink-0 text-amber-500" /> {t}
              </span>
            ))}
          </div>
          <Button asChild className="mt-5 rounded-md">
            <Link href="/panel/pricing">مشاهده و خرید بسته‌ها</Link>
          </Button>
        </PanelCard>
      </div>
    );
  }

  const openMark = (r: (typeof reqItems)[number]) => {
    setMarkTarget({
      targetUserId: r.myuserId,
      targetName: `${r.firstName} ${r.lastName}`.trim(),
      isVerified: r.isVerified,
      defaultListName: r.subcategoryName,
    });
  };

  const tabButton = (key: PanelBuyersTab, icon: React.ReactNode, label: string, count: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === key}
      onClick={() => setTab(key)}
      className={cn(
        '-mb-px flex items-center gap-1.5 border-b-2 px-1 pb-2.5 pt-1 text-sm font-bold transition-colors',
        tab === key
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {label}
      <span className={cn('font-num text-[11px]', tab === key ? 'text-primary/70' : 'text-muted-foreground/70')}>
        {count}
      </span>
    </button>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* تب‌ها — عین صفحهٔ عمومی خریداران (خط زیرین) */}
      <div className="border-b border-border" role="tablist" aria-label="بخش‌های خریداران">
        {tabButton(
          'requests',
          <ClipboardList size={15} className="shrink-0" />,
          'درخواست‌های خرید فوری',
          reqQuery.isLoading && !reqQuery.data ? 0 : reqItems.length,
        )}
        {tabButton(
          'periodic',
          <CalendarClock size={15} className="shrink-0" />,
          'درخواست‌های خرید دوره‌ای',
          dirQuery.isLoading && !dirQuery.data ? 0 : dirTotal,
        )}
      </div>

      {/* جستجو + فیلترها — مشترک هر دو تب */}
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

        {/* توضیح سورت تطابق + سهمیهٔ پیشنهاد */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] leading-5 text-muted-foreground">
          <span>
            مطابق‌ترین خریداران با آگهی‌های شما ({toFa(products?.filter((p) => p.status === 'confirmed' || p.status === 'pending').length ?? 0)} آگهی فعال) بالاتر
            نمایش داده می‌شوند.
          </span>
          {quota && (
            <span className="font-num">
              سهمیهٔ پیشنهاد امروز: <b>{toFa(quota.left)}</b> از <b>{toFa(quota.dailyLimit)}</b> · ارسال گروهی{' '}
              {priceFa(quota.groupSend.perRecipientPrice)} به‌ازای هر خریدار
            </span>
          )}
        </div>
      </PanelCard>

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
                    onToggleSave={() => openMark(r)}
                    matchBadge={m.score > 0 ? { score: m.score, label: 'تطابق' } : undefined}
                    relatedHint={m.relatedProduct ? `مرتبط با آگهی شما: ${m.relatedProduct}` : undefined}
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

      {/* مودال CRM نشان‌کردن خریدار */}
      {markTarget && <MarkUserSheet open={!!markTarget} onClose={() => setMarkTarget(null)} target={markTarget} />}

      {/* مودال پیشنهاد تکی — عنوان با نام دستهٔ کالا */}
      <SupplyOfferModal
        key={offerTarget?.id ?? 'closed'}
        open={offerTarget !== null}
        onClose={() => setOfferTarget(null)}
        targets={offerTarget ? [offerTarget] : []}
        quota={quota}
        products={products}
        category={targetCategory(offerTarget)}
      />

      {/* ویزار پیشنهاد گروهی — دستهٔ آخر → خریداران همان دسته + هزینه → فرم */}
      <GroupOfferWizard open={wizardOpen} onClose={() => setWizardOpen(false)} quota={quota} products={products} />

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
