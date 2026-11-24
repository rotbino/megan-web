'use client';

/**
 * خریداران این کالا (خواسته مالک ۴-۱۱) — از دکمهٔ «خریداران» هر ردیف
 * «محصولات من»: مدیریت بر اساس کالا؛ سه بخش در تب‌ویو کنار هم
 * (خواسته مالک ۱۱-۱۱ — تمیزتر و خواناتر از چیدمان زیر هم):
 *  • تب دوره‌ای: خریدهای دوره‌ای همین دسته (دفتر خرید خریداران) → ارسال
 *    پیشنهاد تامین (تکی/گروهی) برای فروشندهٔ دارندهٔ بستهٔ فعال و شارژ
 *  • تب فوری: درخواست‌های فوری همین کالا → تماس/چت با خریدار
 *  • تب پیشنهادهای من (خواسته مالک ۷-۱۱ و ۸-۱۱): تایم‌لاین واحد
 *    «پیشنهادهای تامین ارسالی + گفتگوهای خرید فوری» همین کالا — با همان
 *    کارت‌های مشترک پنل خریداران (متن و مشخصات پیشنهاد روی کارت؛ بدون بج
 *    تکی/گروهی) تا دو صفحه عین هم باشند
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Crown,
  Lock,
  MessageSquare,
  Package,
  Users,
} from 'lucide-react';
import {
  useBuyerDirectory,
  useBuyRequests,
  useCategoryTree,
  useMyOfferQuota,
  useMyPackage,
  useMyProductDetail,
  useMyProducts,
  useMySentOffers,
  useMyUrgentChats,
} from '@/lib/mock/hooks';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PanelCard } from '@/components/panel/panel-parts';
import { BuyerCard } from '@/components/panel/buyer-card';
import { BookEntryCard } from '@/components/buyers/book-entry-card';
import { SupplyOfferModal } from '@/components/buyers/supply-offer-modal';
import { GroupOfferWizard } from '@/components/buyers/group-offer-wizard';
import { NeedPackageModal } from '@/components/shared/need-package-modal';
import { SupplyOfferCard, UrgentChatCard } from '@/components/panel/outreach-cards';
import { findCategoryPathById } from '@/lib/categories';
import { parseServerDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BuyerDirectoryItem, Category, SentOffer, UrgentChat } from '@/lib/types';

type ProductBuyersTab = 'periodic' | 'urgent' | 'offers';

/** آیتم تایم‌لاین «پیشنهادهای من» — پیشنهاد تامین یا گفتگوی خرید فوری */
type OutreachItem =
  | { kind: 'offer'; at: string; offer: SentOffer }
  | { kind: 'urgent'; at: string; chat: UrgentChat };

export default function ProductBuyersPage() {
  const params = useParams<{ id: string }>();
  const productId = Number(params?.id);

  const { data: detail, isLoading: loadingDetail } = useMyProductDetail(
    Number.isFinite(productId) && productId > 0 ? productId : null,
  );
  const { data: tree } = useCategoryTree();
  const { data: myProducts } = useMyProducts();
  const products = myProducts?.items;
  // گیت بستهٔ فعال (خواسته مالک ۶-۱۱: سهمیه حذف شد — فقط isFeatured می‌ماند)
  const quotaQuery = useMyOfferQuota();
  const isFeatured = quotaQuery.data?.isFeatured ?? false;
  // گیت بسته — مثل پنل خریداران (خواسته مالک)
  const { data: myPackage, isLoading: pkgLoading } = useMyPackage();

  const [tab, setTab] = useState<ProductBuyersTab>('periodic');
  const [offerTarget, setOfferTarget] = useState<BuyerDirectoryItem | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [needPkgOpen, setNeedPkgOpen] = useState(false);

  const product = detail?.product;
  const leafId = product?.subCategoryId ?? null;
  const leafName = product?.subCategoryName ?? '';

  // دستهٔ کامل کالا از درخت — واحد/مثال/عنوان مودال پیشنهاد
  const leafCategory = useMemo<Category | null>(() => {
    if (leafId == null || !tree?.length) return null;
    const path = findCategoryPathById(tree, leafId);
    return path?.[path.length - 1] ?? null;
  }, [tree, leafId]);

  // خریدهای دوره‌ای همین دسته
  const dirQuery = useBuyerDirectory({ categoryId: leafId ?? undefined, perPage: 48 });
  const dirItems = dirQuery.data?.items ?? [];

  // درخواست‌های فوری همین کالا — فیلتر نام زیردسته (سرویس subtree می‌آورد)
  const reqQuery = useBuyRequests({ categoryId: leafId ?? undefined, perPage: 50 });
  const reqItems = useMemo(
    () => (reqQuery.data?.items ?? []).filter((r) => r.subcategoryName === leafName),
    [reqQuery.data, leafName],
  );

  // پیشنهادهای ارسالی من برای همین کالا + گفتگوهای خرید فوری همین دسته
  // (خواسته مالک ۷-۱۱) — تایم‌لاین واحد «تاریخچه و نتیجه»
  const offersQuery = useMySentOffers({ categoryId: leafId ?? undefined });
  const myOffers = offersQuery.data?.items ?? [];
  const urgentQuery = useMyUrgentChats(leafId);
  const urgentItems = urgentQuery.data?.items ?? [];

  /** تایم‌لاین «پیشنهادهای من» — پیشنهادهای تامین + گفتگوهای خرید فوری،
   *  مرتب بر اساس آخرین فعالیت (جدیدترین بالا) — تاریخچه و نتیجه */
  const outreach = useMemo<OutreachItem[]>(() => {
    const ts = (s: string) => new Date(parseServerDate(s)).getTime();
    const offers: OutreachItem[] = myOffers.map((o) => ({
      kind: 'offer',
      at: o.lastMessage?.at ?? o.createdAt,
      offer: o,
    }));
    const chats: OutreachItem[] = urgentItems.map((c) => ({
      kind: 'urgent',
      at: c.lastMessage?.at ?? c.updatedAt,
      chat: c,
    }));
    return [...offers, ...chats].sort((a, b) => ts(b.at) - ts(a.at));
  }, [myOffers, urgentItems]);
  const outreachPending =
    (offersQuery.isLoading && !offersQuery.data) || (urgentQuery.isLoading && !urgentQuery.data);
  const outreachTotal = myOffers.length + urgentItems.length;

  /** دروازهٔ پیشنهاد تامین — بدون بستهٔ فعال → مودال خرید اشتراک */
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

  if (loadingDetail || !product || pkgLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  // آگهی خودم نیست / حذف شده
  if (!leafId) {
    return (
      <div className="mx-auto max-w-xl">
        <PanelCard className="text-center">
          <h1 className="text-base font-extrabold">آگهی یافت نشد</h1>
          <Button asChild className="mt-4 rounded-md">
            <Link href="/panel/products">بازگشت به محصولات من</Link>
          </Button>
        </PanelCard>
      </div>
    );
  }

  // گیت بسته: رایگان = قفل
  if (myPackage && !myPackage.features.canSeeBuyers) {
    return (
      <div className="mx-auto max-w-xl">
        <PanelCard className="text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-amber-50 text-amber-500">
            <Lock size={28} />
          </span>
          <h1 className="mt-4 flex items-center justify-center gap-2 text-base font-extrabold">
            <Users size={18} className="text-primary" /> خریداران ویژه بسته فعال است
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            برای دیدن شماره تماس خریداران «{leafName}» و ارسال پیشنهاد تامین، یکی از بسته‌های اشتراک ایمچ را فعال کنید.
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

  const targetCategory = (b: BuyerDirectoryItem | null): Category | null => {
    if (!b) return null;
    const path = tree ? findCategoryPathById(tree, b.categoryId) : null;
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

  /** دکمهٔ تب — عین پنل خریداران (خط زیرین + شمارنده)؛ موبایل: برچسب کوتاه */
  const tabButton = (
    key: ProductBuyersTab,
    icon: React.ReactNode,
    mobileLabel: string,
    label: string,
    count: number,
  ) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === key}
      onClick={() => setTab(key)}
      className={cn(
        '-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-1 pb-2.5 pt-1 text-sm font-bold transition-colors',
        tab === key
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      <span className="sm:hidden">{mobileLabel}</span>
      <span className="hidden sm:inline">{label}</span>
      <span
        className={cn('font-num text-[11px]', tab === key ? 'text-primary/70' : 'text-muted-foreground/70')}
      >
        {count}
      </span>
    </button>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* سربرگ */}
      <div className="flex items-center gap-3">
        <Button
          asChild
          variant="outline"
          size="icon"
          className="size-10 shrink-0 rounded-full"
          aria-label="بازگشت به محصولات من"
          title="بازگشت"
        >
          <Link href="/panel/products">
            <ArrowRight size={17} />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-extrabold sm:text-lg">خریداران «{leafName}»</h1>
        </div>
      </div>

      {/* تب‌ها — عین پنل خریداران (خط زیرین)؛ سه بخش کنار هم به‌جای زیر هم */}
      <div
        className="no-scrollbar -mx-1 flex items-center gap-3.5 overflow-x-auto border-b border-border px-1"
        role="tablist"
        aria-label="بخش‌های خریداران این کالا"
      >
        {tabButton(
          'periodic',
          <CalendarClock size={15} className="shrink-0" />,
          'دوره‌ای',
          'درخواست‌های دوره‌ای',
          dirQuery.isLoading && !dirQuery.data ? 0 : dirItems.length,
        )}
        {tabButton(
          'urgent',
          <ClipboardList size={15} className="shrink-0" />,
          'فوری',
          'درخواست‌های فوری',
          reqQuery.isLoading && !reqQuery.data ? 0 : reqItems.length,
        )}
        {tabButton(
          'offers',
          <Package size={15} className="shrink-0" />,
          'پیشنهادها',
          'پیشنهادهای من',
          outreachPending ? 0 : outreachTotal,
        )}
      </div>

      {/* ── تب دوره‌ای: خریدهای دوره‌ای همین کالا — ارسال پیشنهاد تامین ── */}
      {tab === 'periodic' && (
        <div role="tabpanel" aria-label="خریدهای دوره‌ای">
          {dirItems.length > 0 && (
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => passOfferGates() && setWizardOpen(true)}
                className="flex shrink-0 items-center gap-1.5 rounded-md border border-input bg-card px-3.5 py-2 text-xs font-bold text-foreground/75 transition-colors hover:border-foreground/30 hover:bg-secondary hover:text-foreground"
              >
                <Users size={14} />
                پیشنهاد تامین گروهی
              </button>
            </div>
          )}

          {dirQuery.isLoading && !dirQuery.data ? (
            <div className="grid gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-36 animate-pulse rounded-lg border bg-card" />
              ))}
            </div>
          ) : dirItems.length === 0 ? (
            <PanelCard className="py-8 text-center text-sm text-muted-foreground">
              خرید دوره‌ای برای «{leafName}» ثبت نشده است.
            </PanelCard>
          ) : (
            <ul className="space-y-3">
              {dirItems.map((b) => (
                <BookEntryCard key={b.id} entry={b} onOffer={() => startOffer(b)} />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── تب فوری: درخواست‌های فوری همین کالا — تماس/چت ── */}
      {tab === 'urgent' && (
        <div role="tabpanel" aria-label="درخواست‌های فوری">
          {reqQuery.isLoading && !reqQuery.data ? (
            <div className="grid gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-44 animate-pulse rounded-lg border bg-card" />
              ))}
            </div>
          ) : reqItems.length === 0 ? (
            <PanelCard className="py-8 text-center text-sm text-muted-foreground">
              درخواست فوری برای «{leafName}» نیست.
            </PanelCard>
          ) : (
            <div className="space-y-3">
              {reqItems.map((r) => (
                <BuyerCard key={r.id} request={r} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── تب پیشنهادهای من (خواسته مالک ۷-۱۱ و ۸-۱۱): تایم‌لاین واحد «تاریخچه و
          نتیجه» — همان کارت‌های مشترک پنل خریداران؛ متن و مشخصات پیشنهاد
          روی کارت + نتیجهٔ گفتگو؛ مرتب بر اساس آخرین فعالیت ── */}
      {tab === 'offers' && (
        <div role="tabpanel" aria-label="پیشنهادهای من">
          {outreachPending ? (
            <div className="space-y-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-lg border bg-card" />
              ))}
            </div>
          ) : outreach.length === 0 ? (
            <PanelCard className="py-10 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-muted-foreground">
                <MessageSquare size={22} />
              </span>
              <p className="mt-3 text-sm font-extrabold">هنوز پیشنهاد یا گفتگویی ندارید</p>
              <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted-foreground">
                از تب «دوره‌ای» برای خریداران «{leafName}» پیشنهاد تامین بفرستید و با درخواست‌های
                «فوری» گفتگو کنید — تاریخچه و پاسخ همهٔ آن‌ها همین‌جا جمع می‌شود.
              </p>
            </PanelCard>
          ) : (
            <ul className="space-y-2.5">
              {outreach.map((it) =>
                it.kind === 'offer' ? (
                  <SupplyOfferCard key={`o-${it.offer.id}`} offer={it.offer} />
                ) : (
                  <UrgentChatCard key={`u-${it.chat.threadId}`} chat={it.chat} />
                ),
              )}
            </ul>
          )}
        </div>
      )}

      {/* مودال پیشنهاد تکی — عنوان با نام کالا */}
      <SupplyOfferModal
        key={offerTarget?.id ?? 'closed'}
        open={offerTarget !== null}
        onClose={() => setOfferTarget(null)}
        targets={offerTarget ? [offerTarget] : []}
        products={products}
        category={targetCategory(offerTarget) ?? leafCategory}
      />

      {/* ویزار گروهی — کالا مشخص است: گام دسته‌بندی حذف (خواسته مالک ۴-۱۱) */}
      {leafCategory && (
        <GroupOfferWizard
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          products={products}
          category={leafCategory}
        />
      )}

      {/* بدون بستهٔ فعال → مودال خرید اشتراک */}
      <NeedPackageModal
        open={needPkgOpen}
        onClose={() => setNeedPkgOpen(false)}
        kind="package"
        message={`ارسال پیشنهاد تامین ${leafName}، ویژهٔ فروشندگان دارندهٔ بستهٔ اشتراک فعال است — بستهٔ خود را فعال کنید تا برای خریداران این کالا پیشنهاد بفرستید.`}
      />
    </div>
  );
}
