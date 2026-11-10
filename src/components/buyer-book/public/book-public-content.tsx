'use client';

/**
 * محتوای گیت‌دار صفحهٔ عمومی دفتر خرید (/b/{bookId} — خواستهٔ مالک ۱۰-۱۱ دور ۵).
 *
 * پوستهٔ برند (هدر + رنگ/لوگو) SSR و عمومی است؛ اما خودِ دفتر — کالاها،
 * مشخصات خریدار و نظرات — فقط برای خودِ خریدار یا کاربران دارندهٔ بستهٔ
 * فعال ایمچ رندر می‌شود (خواستهٔ مالک: ابزار جذب فروشنده به بسته):
 *  • مهمان → قفل با دعوت به ورود/ثبت‌نام در ایمچ
 *  • بی‌بسته → قفل با دعوت به خرید بسته (+ پاسخ NEED_PACKAGE بک‌اند)
 *  • مجاز → کارت هویت خریدار روی جلد برند + آمار (کالا/ذخیره‌کننده/سابقه) +
 *    گرید کالاها با «پیشنهاد تامین» هر کالا (همان گیت‌های پنل خریداران:
 *    اول ثبت کالا، بعد بستهٔ فعال) + نظرات + دکمهٔ «ذخیره دفتر خرید».
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Bookmark,
  CalendarClock,
  Check,
  Clock3,
  Loader2,
  Lock,
  MapPin,
  Package,
  PackageOpen,
  Send,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/mock/auth';
import {
  useBuyerBookPublic,
  useBuyerBookSaved,
  useMyOfferQuota,
  useMyPackage,
  useMyProducts,
  useToggleBuyerBookSave,
} from '@/lib/mock/hooks';
import { useCategoryTree } from '@/lib/mock/hooks';
import { SellerReviews } from '@/components/products/seller-reviews';
import { SupplyOfferModal } from '@/components/buyers/supply-offer-modal';
import { NeedPackageModal } from '@/components/shared/need-package-modal';
import { RootCategoryIcon } from '@/lib/category-icons';
import { findCategoryPathById } from '@/lib/categories';
import { ApiError } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { stockFa, toFa } from '@/lib/format';
import { PERIOD_LABELS, type BuyerBookItem, type BuyerDirectoryItem, type BuyerBookSettings } from '@/lib/types';
import { cn } from '@/lib/utils';

/** کارت قفل — پیام واحد مهمان/بی‌بسته با CTA مناسب */
function LockedCard({
  variant,
  name,
}: {
  variant: 'guest' | 'package';
  name: string;
}) {
  const { requireAuth } = useAuth();
  return (
    <div className="mx-auto max-w-xl rounded-xl border bg-card p-8 text-center shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-(--catalog-accent)/10 text-(--catalog-accent)">
        {variant === 'guest' ? <ShieldCheck size={28} /> : <Lock size={28} />}
      </span>
      <h2 className="mt-4 text-base font-extrabold">
        {variant === 'guest' ? 'برای دیدن دفترهای خرید وارد ایمچ شوید' : 'دیدن دفتر خرید ویژهٔ دارندگان بسته است'}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-7 text-muted-foreground">
        {variant === 'guest' ? (
          <>
            دفتر خرید {name} — کالاهایی که به‌طور دوره‌ای می‌خرد — ویژهٔ اعضای ایمچ
            است. با شماره موبایل، رایگان عضو شوید یا وارد حساب خود شوید.
          </>
        ) : (
          <>
            دفتر خرید {name} را فروشندگان دارندهٔ بستهٔ اشتراک فعال می‌بینند — لیست
            مشتری بالقوه: کالاها، حجم و دورهٔ خرید هر کالا، همیشه به‌روز.
          </>
        )}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {variant === 'guest' ? (
          <>
            <Button className="h-10 rounded-lg px-6 text-sm font-bold" onClick={() => requireAuth('register')}>
              ورود / ثبت‌نام در ایمچ
            </Button>
            <Button asChild variant="outline" className="h-10 rounded-lg px-6 text-sm font-bold">
              <Link href="/">بازگشت به ایمچ</Link>
            </Button>
          </>
        ) : (
          <>
            <Button asChild className="h-10 rounded-lg px-6 text-sm font-bold">
              <Link href="/panel/pricing">مشاهده و خرید بسته‌ها</Link>
            </Button>
            <Button asChild variant="outline" className="h-10 rounded-lg px-6 text-sm font-bold">
              <Link href="/help/charge-package">راهنمای بسته‌ها</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/** دکمهٔ «ذخیره دفتر خرید» — فروشنده دفتر را در پنلش ذخیره می‌کند؛
 *  مهمان → مودال ورود/ثبت‌نام با نیات ذخیرهٔ دفتر (خواستهٔ مالک). */
function BookSaveButton({ buyerUserName, saversCount }: { buyerUserName: string; saversCount: number }) {
  const { user, requireAuth } = useAuth();
  const { toast } = useToast();
  const { data: saved, isLoading } = useBuyerBookSaved(buyerUserName, !!user);
  const toggle = useToggleBuyerBookSave();
  const isSelf = !!user && user.userName === buyerUserName;

  // خودِ خریدار دفتر خودش را ذخیره نمی‌کند
  if (isSelf) return null;

  const isSaved = saved === true;

  const onClick = () => {
    if (!user) {
      requireAuth('save-book');
      return;
    }
    toggle.mutate(buyerUserName, {
      onSuccess: (now) =>
        toast({
          description: now
            ? 'دفتر خرید در «دفاتر ذخیره شده» پنل شما ذخیره شد.'
            : 'دفتر خرید از لیست ذخیره‌شده‌ها حذف شد.',
        }),
      onError: () =>
        toast({ description: 'ذخیره موقتاً ممکن نشد؛ دوباره تلاش کنید.', variant: 'destructive' }),
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={isSaved ? 'default' : 'outline'}
        onClick={onClick}
        aria-pressed={isSaved}
        className="h-11 rounded-lg px-5 text-sm font-bold"
        style={isSaved ? undefined : { borderColor: 'var(--catalog-accent)', color: 'var(--catalog-accent)' }}
      >
        {toggle.isPending ? (
          <Loader2 size={17} className="animate-spin" />
        ) : isSaved ? (
          <Check size={17} />
        ) : (
          <Bookmark size={17} />
        )}
        {isLoading && user ? '…' : isSaved ? 'ذخیره شد' : 'ذخیره دفتر خرید'}
      </Button>
      {/* تعداد ذخیره‌شده‌ها (خواستهٔ مالک: روی خود دفتر نمایش داده شود) */}
      <span className="inline-flex items-center gap-1 rounded-full bg-(--catalog-accent)/10 px-2.5 py-1.5 text-[11px] font-bold text-(--catalog-accent)">
        <Users size={12} />
        {toFa(saversCount)} فروشنده ذخیره کرده
      </span>
    </div>
  );
}

/** یک کالای دفتر — کارت با حداقل خرید، دوره و «پیشنهاد تامین» */
function BookItemCard({
  item,
  onOffer,
  offering,
}: {
  item: BuyerBookItem;
  onOffer: () => void;
  offering: boolean;
}) {
  return (
    <article className="flex flex-col rounded-xl border bg-card p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md">
      <div className="flex items-start gap-2.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-(--catalog-accent)/10 text-(--catalog-accent)">
          <RootCategoryIcon rootName={item.rootName} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-extrabold">{item.name}</h3>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {item.parentName ? `${item.rootName} / ${item.parentName}` : item.rootName}
          </p>
        </div>
      </div>

      {/* جملهٔ خرید — «۲٬۰۰۰ کیلوگرم سیب از نوع قرمز به‌صورت ماهیانه» */}
      <p className="mt-3 text-[13px] leading-7 text-muted-foreground">
        خرید دوره‌ای <b className="text-foreground">{stockFa(item.minAmount, item.unit)}</b>{' '}
        <b className="text-foreground">{item.name}</b>
        {item.productType ? (
          <>
            {' '}از نوع <b className="text-foreground">{item.productType}</b>
          </>
        ) : null}
        {' '}به‌صورت {PERIOD_LABELS[item.period] ?? 'ماهیانه'}
      </p>

      {/* دوره + اقدام */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[10.5px] font-bold text-muted-foreground">
          <CalendarClock size={12} />
          {PERIOD_LABELS[item.period] ?? 'ماهیانه'}
        </span>
        <button
          type="button"
          onClick={onOffer}
          disabled={offering}
          title={`ارسال پیشنهاد تامین ${item.name}`}
          className="flex items-center gap-1.5 rounded-md border border-input bg-card px-3 py-2 text-xs font-bold text-foreground/75 transition-colors hover:border-foreground/30 hover:bg-secondary hover:text-foreground disabled:opacity-50"
        >
          <Send size={14} />
          پیشنهاد تامین
        </button>
      </div>
    </article>
  );
}

export function BookPublicContent({
  bookId,
  resolvedUserName,
  resolvedName,
  settings,
  sharePath,
}: {
  /** آیدی ورودی URL (bookId سفارشی یا userName) — کلید fetch */
  bookId: string;
  resolvedUserName: string;
  resolvedName: string;
  settings: BuyerBookSettings;
  sharePath: string;
}) {
  const { user } = useAuth();
  const { data: myPackage, isLoading: pkgLoading } = useMyPackage();
  const isOwner = !!user && user.userName === resolvedUserName;
  const hasPackage = !!myPackage && myPackage.isActive && myPackage.pakageType > 0;

  // درخواست دفتر — فقط برای مجازها (مالک یا بسته‌دار) ارسال می‌شود؛ پاسخ
  // NEED_PACKAGE از بک‌اند هم همان قفل را می‌سازد (گیت سرور منبع حقیقت است)
  const canFetch = !!user && (isOwner || hasPackage);
  const query = useBuyerBookPublic(canFetch ? bookId : null);
  const data = query.data;

  // ── اکشن‌های «پیشنهاد تامین» — همان گیت‌های پنل خریداران ──
  const { data: myProducts } = useMyProducts(!!user);
  const products = myProducts?.items;
  const quotaQuery = useMyOfferQuota(!!user);
  const isFeatured = quotaQuery.data?.isFeatured ?? false;
  const { data: tree } = useCategoryTree();
  const [offerTarget, setOfferTarget] = useState<BuyerDirectoryItem | null>(null);
  const [needPkgOpen, setNeedPkgOpen] = useState(false);
  const [needProductOpen, setNeedProductOpen] = useState(false);

  const hasProducts = (products ?? []).some(
    (p) => p.status === 'confirmed' || p.status === 'pending',
  );

  const passOfferGates = (): boolean => {
    if (myProducts === undefined || quotaQuery.isPending) return false;
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

  const needPackageLock =
    query.error instanceof ApiError && query.error.code === 'NEED_PACKAGE';

  /** ساخت آیتم دایرکتوری از کالای دفتر — ورودی مشترک مودال پیشنهاد تامین */
  const synthDirectoryItem = (buyer: NonNullable<typeof data>['buyer'], it: BuyerBookItem): BuyerDirectoryItem => ({
    id: `${buyer.userName}-${it.categoryId}`,
    buyerId: buyer.id,
    buyerName: `${buyer.firstName} ${buyer.lastName}`.trim(),
    role: buyer.role,
    categoryId: it.categoryId,
    categoryName: it.name,
    rootName: it.rootName,
    categoryPath: [it.rootName, it.parentName].filter(Boolean).join(' / '),
    unit: it.unit,
    minAmount: it.minAmount,
    period: it.period,
    productType: it.productType,
    province: buyer.provinceName,
    city: buyer.cityName,
    lastActiveAt: buyer.lastActiveAt ?? '',
    activeRecently: buyer.activeRecently,
    stale: false,
    bookId: settings.bookId,
  });

  const targetCategory = useMemo(() => {
    if (!offerTarget) return null;
    const path = tree ? findCategoryPathById(tree, offerTarget.categoryId) : null;
    if (path?.length) return path[path.length - 1];
    return {
      id: offerTarget.categoryId,
      categoryName: offerTarget.categoryName,
      slug: '',
      unit: offerTarget.unit,
      min: 0,
      parentId: null,
      score: 0,
    };
  }, [offerTarget, tree]);

  /* ── قفل‌ها ── */
  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 lg:px-6">
        <LockedCard variant="guest" name={resolvedName} />
      </div>
    );
  }

  if (needPackageLock) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 lg:px-6">
        <LockedCard variant="package" name={resolvedName} />
      </div>
    );
  }

  if (!canFetch) {
    // بی‌بسته — پاسخ بسته از بک‌اند رسیده؟ else قفل سمت کلاینت
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 lg:px-6">
        {pkgLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : (
          <LockedCard variant="package" name={resolvedName} />
        )}
      </div>
    );
  }

  if (query.isLoading && !data) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8 lg:px-6">
        <Skeleton className="h-44 rounded-xl" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 lg:px-6">
        <div className="rounded-xl border bg-card p-8 text-center">
          <PackageOpen size={30} strokeWidth={1.2} className="mx-auto text-(--catalog-accent)/50" />
          <p className="mt-3 text-sm font-extrabold">این دفتر خرید در دسترس نیست.</p>
          <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
            ممکن است کالاهای دوره‌ای صاحب آن هنوز تایید نشده یا حذف شده باشند.
          </p>
          <Button asChild variant="outline" className="mt-4 h-10 rounded-lg px-6 text-sm font-bold">
            <Link href="/panel/buyers">بازگشت به خریداران</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { buyer, items, saversCount } = data;
  const buyerName = `${buyer.firstName} ${buyer.lastName}`.trim() || resolvedName;
  const location = [buyer.provinceName, buyer.cityName].filter(Boolean).join('، ');
  const accent = settings.brandColor;

  const seniority = (() => {
    const days = buyer.daysInImach ?? 1;
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    if (years > 0 && months > 0) return `${toFa(years)} سال و ${toFa(months)} ماه فعالیت`;
    if (years > 0) return `${toFa(years)} سال فعالیت`;
    if (months > 0) return `${toFa(months)} ماه فعالیت`;
    return `${toFa(Math.max(days, 1))} روز فعالیت`;
  })();

  const stats = [
    { icon: Package, label: 'کالای دوره‌ای', value: toFa(items.length) },
    { icon: Users, label: 'ذخیره‌کنندگان', value: toFa(saversCount) },
    { icon: BadgeCheck, label: 'نوع خریدار', value: buyer.role },
    { icon: Clock3, label: 'سابقه در ایمچ', value: seniority },
  ] as const;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 pb-12 pt-4 lg:px-6 lg:pt-6">
      {/* ─── کارت هویت خریدار — جلد برند + لوگو/آواتار + مشخصات ─── */}
      <section className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_8px_rgba(0,0,0,0.07)]">
        {/* جلد — گرادیان رنگ برند (خریدار بنر عکس ندارد؛ رنگ/لوگو) */}
        <div
          className="relative h-28 sm:h-36"
          style={{
            background: accent
              ? `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 72%, black) 100%)`
              : 'linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 72%, black) 100%)',
          }}
        >
          <div className="absolute -end-12 -top-16 size-48 rounded-full bg-white/10" aria-hidden />
          <div className="absolute -start-14 -bottom-20 size-44 rounded-full bg-white/[0.07]" aria-hidden />
          {buyer.activeRecently && (
            <span className="absolute bottom-3 end-4 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-bold text-white backdrop-blur">
              <span className="size-2 rounded-full bg-emerald-300" aria-hidden />
              فعال در ۷ روز اخیر
            </span>
          )}
        </div>

        <div className="px-4 pb-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
            {/* لوگو (تنظیمات دفتر) یا آواتار — روی جلد افتاده */}
            <div className="relative -mt-12 size-24 shrink-0 sm:-mt-14 sm:size-28">
              {settings.logo ? (
                <img
                  src={settings.logo}
                  alt={`لوگوی ${buyerName}`}
                  className="size-full rounded-2xl border-4 border-card bg-card object-cover shadow-md"
                />
              ) : buyer.avatarUrl ? (
                <img
                  src={buyer.avatarUrl}
                  alt={`تصویر ${buyerName}`}
                  className="size-full rounded-2xl border-4 border-card object-cover shadow-md"
                />
              ) : (
                <span
                  className="grid size-full place-items-center rounded-2xl border-4 border-card text-4xl font-black text-white shadow-md"
                  style={{ backgroundColor: accent ?? 'var(--primary)' }}
                >
                  {buyer.firstName?.[0] ?? 'خ'}
                </span>
              )}
            </div>

            {/* نام + متا */}
            <div className="min-w-0 flex-1 space-y-1.5 pt-1 sm:pb-2">
              <h1 className="flex min-w-0 flex-wrap items-center gap-2 text-xl font-extrabold leading-8 sm:text-2xl">
                <span className="truncate">{buyerName}</span>
                <span
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-(--catalog-accent)/30 bg-(--catalog-accent)/10 px-2.5 py-1 text-[10.5px] font-extrabold text-(--catalog-accent)"
                  title="نوع عضویت خریدار در ایمچ"
                >
                  <BadgeCheck size={13} strokeWidth={2.4} />
                  {buyer.role}
                </span>
              </h1>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:text-[13px]">
                {location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={13} className="text-(--catalog-accent)/80" />
                    {location}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <CalendarClock size={13} className="text-(--catalog-accent)/80" />
                  {seniority}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Package size={13} className="text-(--catalog-accent)/80" />
                  {toFa(items.length)} کالای دوره‌ای
                </span>
              </p>
            </div>

            {/* ذخیرهٔ دفتر + تعداد ذخیره‌شده‌ها (خواستهٔ مالک) */}
            <div className="pt-2 sm:pb-2">
              <BookSaveButton buyerUserName={buyer.userName} saversCount={saversCount} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── آمار ─── */}
      <section aria-label="آمار خریدار" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-lg border bg-card p-3 text-center sm:p-4">
            <Icon size={18} className="mx-auto text-(--catalog-accent)" />
            <p className="mt-1.5 text-sm font-extrabold leading-6 sm:text-[15px]">{value}</p>
            <p className="mt-0.5 text-[10.5px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>

      {/* ─── کالاهای خرید دوره‌ای ─── */}
      <section aria-labelledby="book-items">
        <h2 id="book-items" className="mb-3 flex items-center gap-2 text-base font-extrabold">
          <Package size={17} className="text-(--catalog-accent)" />
          کالاهای خرید دوره‌ای
          <span className="font-num text-xs font-bold text-muted-foreground">({toFa(items.length)})</span>
        </h2>
        {items.length === 0 ? (
          <p className="flex flex-col items-center gap-2 rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
            <PackageOpen size={34} strokeWidth={1.2} className="text-(--catalog-accent)/50" />
            این خریدار هنوز کالای دوره‌ای تاییدشده‌ای در دفترش ندارد.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <BookItemCard
                key={`${it.categoryId}-${it.productType ?? ''}`}
                item={it}
                onOffer={() => {
                  if (!passOfferGates()) return;
                  setOfferTarget(synthDirectoryItem(buyer, it));
                }}
                offering={false}
              />
            ))}
          </div>
        )}
      </section>

      {/* ─── نظرات ─── */}
      <section>
        <SellerReviews userName={buyer.userName} sellerName={buyerName} />
      </section>

      {/* ─── امضای iMach — عین کاتالوگ ─── */}
      <footer className="border-t pt-6 pb-2 text-center">
        <Link
          href="/"
          className="group inline-flex flex-col items-center gap-1.5"
          aria-label="ساخته شده با iMach — ثبت خرید دوره‌ای رایگان"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-xs font-bold shadow-sm transition-colors group-hover:border-primary/40 group-hover:text-primary">
            <Zap size={13} className="text-primary" />
            ساخته شده با iMach
          </span>
          <span className="text-[10.5px] text-muted-foreground">
            دفتر خرید آنلاین رایگان برای خریداران عمده — iMach.ir
          </span>
        </Link>
      </footer>

      {/* مودال پیشنهاد تامین — عنوان با نام کالای دفتر */}
      <SupplyOfferModal
        key={offerTarget?.id ?? 'closed'}
        open={offerTarget !== null}
        onClose={() => setOfferTarget(null)}
        targets={offerTarget ? [offerTarget] : []}
        products={products}
        category={targetCategory}
      />

      {/* گیت‌های پیشنهاد — عین پنل خریداران */}
      <NeedPackageModal
        open={needProductOpen}
        onClose={() => setNeedProductOpen(false)}
        kind="product"
        message="برای ارسال پیشنهاد تامین، باید کالاهای خود را برای فروش ثبت کنید تا خریداران مرتبط به شما نمایش داده شوند. با ثبت کالا و حداقل سفارش، سیستم تطابق مطابق‌ترین خریداران را به شما نشان می‌دهد."
      />
      <NeedPackageModal
        open={needPkgOpen}
        onClose={() => setNeedPkgOpen(false)}
        kind="package"
        message="ارسال پیشنهاد تامین به خریداران عمده، ویژهٔ فروشندگان دارندهٔ بستهٔ اشتراک فعال است. با فعال‌سازی یکی از بسته‌های ایمچ، از امروز می‌توانید برای خریداران پیشنهاد بفرستید."
      />
    </div>
  );
}
