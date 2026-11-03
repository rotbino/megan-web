'use client';

/**
 * خریداران این کالا (خواسته مالک ۴-۱۱) — از دکمهٔ «خریداران» هر ردیف
 * «محصولات من»: مدیریت بر اساس کالا؛
 *  • خریدهای دوره‌ای همین دسته (دفتر خرید خریداران) → ارسال پیشنهاد تامین
 *    (تکی/گروهی) برای فروشندهٔ دارندهٔ بستهٔ فعال و شارژ
 *  • درخواست‌های فوری همین کالا → تماس/چت با خریدار (عین پنل خریداران)
 *  • پیشنهادهای تامین ارسالی من برای همین کالا — روی همین صفحه دیده می‌شود
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
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
} from '@/lib/mock/hooks';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PanelCard } from '@/components/panel/panel-parts';
import { BuyerCard } from '@/components/panel/buyer-card';
import { BookEntryCard } from '@/components/buyers/book-entry-card';
import { SupplyOfferModal } from '@/components/buyers/supply-offer-modal';
import { GroupOfferWizard } from '@/components/buyers/group-offer-wizard';
import { NeedPackageModal } from '@/components/shared/need-package-modal';
import { MarkUserSheet, type MarkTarget } from '@/components/shared/mark-user-sheet';
import { findCategoryPathById } from '@/lib/categories';
import { dateFa, priceFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BuyerDirectoryItem, Category } from '@/lib/types';

export default function ProductBuyersPage() {
  const params = useParams<{ id: string }>();
  const productId = Number(params?.id);

  const { data: detail, isLoading: loadingDetail } = useMyProductDetail(
    Number.isFinite(productId) && productId > 0 ? productId : null,
  );
  const { data: tree } = useCategoryTree();
  const { data: myProducts } = useMyProducts();
  const products = myProducts?.items;
  const quotaQuery = useMyOfferQuota();
  const quota = quotaQuery.data ?? null;
  const isFeatured = quota?.isFeatured ?? false;
  // گیت بسته — مثل پنل خریداران (خواسته مالک)
  const { data: myPackage, isLoading: pkgLoading } = useMyPackage();

  const [offerTarget, setOfferTarget] = useState<BuyerDirectoryItem | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [needPkgOpen, setNeedPkgOpen] = useState(false);
  const [markTarget, setMarkTarget] = useState<MarkTarget | null>(null);

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

  // پیشنهادهای ارسالی من برای همین کالا
  const offersQuery = useMySentOffers({ categoryId: leafId ?? undefined });
  const myOffers = offersQuery.data?.items ?? [];

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

  const sectionTitle = (icon: React.ReactNode, title: string, count: number) => (
    <div className="mb-3 flex items-baseline justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-extrabold">
        {icon} {title}
      </h2>
      <span className="text-[11px] text-muted-foreground">{toFa(count)} مورد</span>
    </div>
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
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            آگهی «{product.productName}» — خریدهای دوره‌ای و درخواست‌های فوری همین کالا + پیشنهادهای ارسالی شما.
          </p>
        </div>
      </div>

      {/* ── خریدهای دوره‌ای همین کالا — ارسال پیشنهاد تامین ── */}
      <section>
        {sectionTitle(
          <span className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
            <CalendarDays size={14} />
          </span>,
          'خریدهای دوره‌ای',
          dirItems.length,
        )}

        {dirItems.length > 0 && (
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() => passOfferGates() && setWizardOpen(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-input bg-card px-3.5 py-2 text-xs font-bold text-foreground/75 transition-colors hover:border-foreground/30 hover:bg-secondary hover:text-foreground"
            >
              <Users size={14} />
              پیشنهاد تامین گروهی این کالا
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
      </section>

      {/* ── درخواست‌های فوری همین کالا — تماس/چت ── */}
      <section>
        {sectionTitle(
          <span className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
            <ClipboardList size={14} />
          </span>,
          'درخواست‌های خرید فوری',
          reqItems.length,
        )}
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
              <BuyerCard
                key={r.id}
                request={r}
                onToggleSave={() =>
                  setMarkTarget({
                    targetUserId: r.myuserId,
                    targetName: `${r.firstName} ${r.lastName}`.trim(),
                    isVerified: r.isVerified,
                    defaultListName: r.subcategoryName,
                  })
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* ── پیشنهادهای ارسالی من برای این کالا ── */}
      <section>
        {sectionTitle(
          <span className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
            <Package size={14} />
          </span>,
          'پیشنهادهای تامین ارسالی شما',
          myOffers.length,
        )}
        {offersQuery.isLoading && !offersQuery.data ? (
          <div className="h-28 animate-pulse rounded-lg border bg-card" />
        ) : myOffers.length === 0 ? (
          <PanelCard className="py-8 text-center text-sm text-muted-foreground">
            برای «{leafName}» هنوز پیشنهاد تامین نفرستاده‌اید.
          </PanelCard>
        ) : (
          <ul className="space-y-2.5">
            {myOffers.map((o) => (
              <li key={o.id} className="rounded-lg border bg-card p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-extrabold">{o.buyerName}</span>
                  {o.productType && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                      {o.productType}
                    </span>
                  )}
                  <span
                    className={cn(
                      'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
                      o.isGroup ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-600',
                    )}
                  >
                    {o.isGroup ? <Users size={12} /> : <CheckCircle2 size={12} />}
                    {o.isGroup ? 'گروهی' : 'تکی'}
                  </span>
                  {o.fee > 0 && <span className="font-num text-[11px] text-muted-foreground">{priceFa(o.fee)} تومان</span>}
                  <span className="ms-auto text-[11px] text-muted-foreground">{dateFa(o.createdAt)}</span>
                </div>
                {o.lastMessage ? (
                  <p className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] leading-5">
                    <MessageSquare size={13} className={o.lastMessage.mine ? 'text-muted-foreground' : 'text-primary'} />
                    <span className="text-muted-foreground">آخرین پیام:</span>
                    <span className={cn('truncate', !o.lastMessage.mine && 'font-bold text-foreground')}>
                      {o.lastMessage.text.length > 80 ? `${o.lastMessage.text.slice(0, 80)}…` : o.lastMessage.text}
                    </span>
                  </p>
                ) : (
                  <p className="mt-1.5 line-clamp-1 text-[11px] leading-5 text-muted-foreground">{o.message}</p>
                )}
                {o.threadId && (
                  <Button asChild size="sm" variant="outline" className="mt-2.5 rounded-md text-xs">
                    <Link href={`/panel/messages?thread=${o.threadId}`}>
                      <MessageSquare size={13} /> گفتگو
                    </Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* مودال پیشنهاد تکی — عنوان با نام کالا */}
      <SupplyOfferModal
        key={offerTarget?.id ?? 'closed'}
        open={offerTarget !== null}
        onClose={() => setOfferTarget(null)}
        targets={offerTarget ? [offerTarget] : []}
        quota={quota}
        products={products}
        category={targetCategory(offerTarget) ?? leafCategory}
      />

      {/* ویزار گروهی — دستهٔ همین کالا از قبل معلوم است */}
      <GroupOfferWizard open={wizardOpen} onClose={() => setWizardOpen(false)} quota={quota} products={products} />

      {/* بدون بستهٔ فعال → مودال خرید اشتراک */}
      <NeedPackageModal
        open={needPkgOpen}
        onClose={() => setNeedPkgOpen(false)}
        kind="package"
        message={`ارسال پیشنهاد تامین ${leafName}، ویژهٔ فروشندگان دارندهٔ بستهٔ اشتراک فعال است — بستهٔ خود را فعال کنید تا برای خریداران این کالا پیشنهاد بفرستید.`}
      />

      {/* مودال CRM نشان‌کردن */}
      {markTarget && <MarkUserSheet open={!!markTarget} onClose={() => setMarkTarget(null)} target={markTarget} />}
    </div>
  );
}
