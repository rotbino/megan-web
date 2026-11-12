'use client';

/**
 * محتوای صفحهٔ عمومی دفتر خرید (/b/{bookId} — دور ۵ + بازطراحی ۱۱-۱۱).
 *
 * پوستهٔ برند (هدر + رنگ/لوگو) SSR و عمومی است؛ مشاهدهٔ خودِ دفتر — کالاها،
 * مشخصات خریدار و نظرات — برای همهٔ اعضای واردشده رایگان است (خواستهٔ مالک
 * ۱۱-۱۱: «برای مشاهده دفتر خرید نیاز به خرید بسته نیست»)؛ مهمان به
 * ورود/ثبت‌نام دعوت می‌شود:
 *  • گیت ارتباط (خواستهٔ مالک ۱۱-۱۱): دکمه‌های «تماس»، «چت» و «پیشنهاد تامین»
 *    فقط برای دارندهٔ بستهٔ فعال (یا خودِ خریدار) کار می‌کنند — بقیه مودال
 *    «برای ارتباط با خریدار باید عضویت خود را ارتقا دهید» + دکمهٔ بسته‌ها
 *    می‌بینند.
 *  • کارت هویت با بنر عنوان‌دار «دفتر خرید» (خواستهٔ مالک ۱۱-۱۱:
 *    عنوان دلخواه از تنظیمات + سمت مسئول خرید کنار نام + گواهی احراز هویت)
 *    + نوار منوی بخش‌ها (عین کاتالوگ — نظرات بعد از کالاها) + آمار +
 *    «شرایط تامین» (متن دلخواه خریدار برای تامین‌کنندگان) + گرید کالاها
 *    با «پیشنهاد تامین» + «درباره خریدار» عین کاتالوگ (توضیحات کسب‌وکار،
 *    مجوزها و تصاویر در یک نوار واحد) + نظراتِ نقش‌جداشده (subject='buyer'
 *    — جدا از امتیاز فروشندگی او) + دکمهٔ «ذخیره دفتر خرید» برای همه حتی
 *    خودِ مالک (خواستهٔ مالک ۱۱-۱۱) + دکمه‌های «چت» و «تماس» (خواستهٔ مالک
 *    ۱۱-۱۱) — چت همیشه؛ تماس فقط وقتی خریدار در تنظیمات دفتر (و پروفایل)
 *    اجازه داده + بج «تایید هویت شده» روی جلد و کنار نام.
 *  • چیدمان دسکتاپ دو ستونه (اصلی + سایدبار دربارهٔ خریدار)؛ موبایل تک‌ستونه
 *    با نوار فیکس ذخیره بالای ناوبری پایین — هم زیبا هم کارآمد.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  BadgeCheck,
  BookOpen,
  Bookmark,
  Building2,
  CalendarClock,
  Camera,
  Check,
  Clock3,
  Loader2,
  MapPin,
  Package,
  PackageOpen,
  Phone,
  ScrollText,
  Send,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatDialog } from '@/components/products/chat-dialog';
import { PhoneReveal } from '@/components/shared/phone-reveal';
import { ProfileScrollNav } from '@/components/products/profile-scroll-nav';
import { useAuth } from '@/lib/mock/auth';
import { fallbackBusinessDesc } from '@/lib/seller-text';
import {
  useBuyerBookPublic,
  useBuyerBookSaved,
  useMyOfferQuota,
  useMyProducts,
  useToggleBuyerBookSave,
} from '@/lib/mock/hooks';
import { useCategoryTree } from '@/lib/mock/hooks';
import { SellerReviews } from '@/components/products/seller-reviews';
import { SupplyOfferModal } from '@/components/buyers/supply-offer-modal';
import { NeedPackageModal } from '@/components/shared/need-package-modal';
import { RootCategoryIcon } from '@/lib/category-icons';
import { findCategoryPathById } from '@/lib/categories';
import { useToast } from '@/hooks/use-toast';
import { stockFa, toFa } from '@/lib/format';
import { PERIOD_LABELS, type BuyerBookItem, type BuyerDirectoryItem, type BuyerBookSettings } from '@/lib/types';
import { getSeller } from '@/lib/mock/api';
import { cn } from '@/lib/utils';

/** کارت قفل مهمان — دعوت به ورود/ثبت‌نام + تیزر عنوان بنر دفتر (مشاهده برای
 *  اعضای واردشده رایگان است — خواستهٔ مالک ۱۱-۱۱) */
function LockedCard({
  name,
  bannerTitle,
}: {
  name: string;
  /** عنوان بنر دفتر (تنظیمات) — به مهمان نشان می‌دهد این دفتر چه می‌خرد */
  bannerTitle?: string | null;
}) {
  const { requireAuth } = useAuth();
  return (
    <div className="mx-auto max-w-xl rounded-xl border bg-card p-8 text-center shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
      {bannerTitle?.trim() && (
        <p className="mx-auto mb-4 max-w-md whitespace-pre-line rounded-lg bg-(--catalog-accent)/10 px-4 py-3 text-[13px] font-bold leading-6 text-(--catalog-accent)">
          {bannerTitle.trim()}
        </p>
      )}
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-(--catalog-accent)/10 text-(--catalog-accent)">
        <ShieldCheck size={28} />
      </span>
      <h2 className="mt-4 text-base font-extrabold">برای دیدن دفترهای خرید وارد ایمچ شوید</h2>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-7 text-muted-foreground">
        دفتر خرید {name} — کالاهایی که به‌طور دوره‌ای می‌خرد — ویژهٔ اعضای ایمچ
        است. با شماره موبایل، رایگان عضو شوید یا وارد حساب خود شوید.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button className="h-10 rounded-lg px-6 text-sm font-bold" onClick={() => requireAuth('register')}>
          ورود / ثبت‌نام در ایمچ
        </Button>
        <Button asChild variant="outline" className="h-10 rounded-lg px-6 text-sm font-bold">
          <Link href="/">بازگشت به ایمچ</Link>
        </Button>
      </div>
    </div>
  );
}

/** دکمهٔ «ذخیره دفتر خرید» — همه آن را می‌بینند؛ خودِ خریدار هم می‌تواند
 *  دفتر خودش را ذخیره کند (خواستهٔ مالک ۱۱-۱۱). تعداد ذخیره‌کننده‌ها در
 *  ردیف آمار هست — کنار دکمه چیپ تکراری نمی‌خواهد.
 *  مهمان → مودال ورود/ثبت‌نام با نیات ذخیرهٔ دفتر. */
function BookSaveButton({
  buyerUserName,
  compact = false,
}: {
  buyerUserName: string;
  compact?: boolean;
}) {
  const { user, requireAuth } = useAuth();
  const { toast } = useToast();
  const { data: saved, isLoading } = useBuyerBookSaved(buyerUserName, !!user);
  const toggle = useToggleBuyerBookSave();

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
    <Button
      type="button"
      variant={isSaved ? 'default' : 'outline'}
      onClick={onClick}
      aria-pressed={isSaved}
      className={cn(
        'rounded-lg font-bold',
        compact ? 'h-10 px-4 text-xs' : 'h-11 px-5 text-sm',
      )}
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
    <article className="group flex flex-col rounded-xl border bg-card p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-[shadow,transform] hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-2.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-(--catalog-accent)/10 text-(--catalog-accent) ring-1 ring-(--catalog-accent)/15">
          <RootCategoryIcon rootName={item.rootName} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-extrabold">{item.name}</h3>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {item.parentName ? `${item.rootName} / ${item.parentName}` : item.rootName}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-(--catalog-accent)/10 px-2.5 py-1 text-[10.5px] font-bold text-(--catalog-accent)">
          <CalendarClock size={12} />
          {PERIOD_LABELS[item.period] ?? 'ماهیانه'}
        </span>
      </div>

      {/* جملهٔ خرید — «۲٬۰۰۰ کیلوگرم سیب از نوع قرمز به‌صورت ماهیانه» */}
      <p className="mt-3 rounded-lg bg-secondary/60 px-3 py-2.5 text-[13px] leading-7 text-muted-foreground">
        خرید دوره‌ای <b className="text-foreground">{stockFa(item.minAmount, item.unit)}</b>{' '}
        <b className="text-foreground">{item.name}</b>
        {item.productType ? (
          <>
            {' '}از نوع <b className="text-foreground">{item.productType}</b>
          </>
        ) : null}
        {' '}به‌صورت {PERIOD_LABELS[item.period] ?? 'ماهیانه'}
      </p>

      {/* اقدام */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <span className="text-[10.5px] font-medium text-muted-foreground">
          حداقل خرید هر دوره: <b className="text-foreground">{stockFa(item.minAmount, item.unit)}</b>
        </span>
        <button
          type="button"
          onClick={onOffer}
          disabled={offering}
          title={`ارسال پیشنهاد تامین ${item.name}`}
          className="flex items-center gap-1.5 rounded-md border border-input bg-card px-3 py-2 text-xs font-bold text-foreground/75 transition-colors hover:border-(--catalog-accent)/50 hover:bg-(--catalog-accent)/5 hover:text-(--catalog-accent) disabled:opacity-50"
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
  const isOwner = !!user && user.userName === resolvedUserName;

  // مشاهدهٔ دفتر رایگان است (خواستهٔ مالک ۱۱-۱۱) — فقط ورود کافی است؛
  // گیت بسته روی دکمه‌های تماس/چت/پیشنهاد تامین می‌نشیند (مودال ارتقا)
  const canFetch = !!user;
  const query = useBuyerBookPublic(canFetch ? bookId : null);
  const data = query.data;

  // عنوان بنر (خواستهٔ مالک ۱۱-۱۱) — پیش‌فرض جدید: «دفتر خرید + نام کسب‌وکار»؛
  // اگر نام کسب‌وکار نبود «دفتر خرید + نام کاربر» (مثل «دفتر خرید میر علی سید زاده»)
  const fallbackBannerTitle = `دفتر خرید ${resolvedName}`;
  const bannerTitle = settings.bannerTitle?.trim() || fallbackBannerTitle;

  // ── غنی‌سازی مشخصات کسب‌وکار از products/getSeller (خواستهٔ مالک ۱۱-۱۱:
  //    تصاویر/مجوزها و هر اطلاعاتی از خریدار که برای فروشنده مهم است) — فقط
  //    وقتی دفتر خودش گالری/مجوز ندارد؛ همان اندپوینت عمومی کاتالوگ، بدون توکن ──
  const buyerUserName = data?.buyer.userName ?? null;
  const needBizFallback =
    !!data && !(data.buyer.gallery?.length ?? 0) && !(data.buyer.certificates?.length ?? 0);
  const sellerFallbackQuery = useQuery({
    queryKey: ['seller', buyerUserName ?? ''],
    queryFn: () => getSeller(buyerUserName!),
    enabled: needBizFallback,
    staleTime: 300_000,
    retry: false,
  });

  // ── اکشن‌های «پیشنهاد تامین» + گیت ارتباط (خواستهٔ مالک ۱۱-۱۱) ──
  const { data: myProducts } = useMyProducts(!!user);
  const products = myProducts?.items;
  const quotaQuery = useMyOfferQuota(!!user);
  const isFeatured = quotaQuery.data?.isFeatured ?? false;
  const { data: tree } = useCategoryTree();
  const [offerTarget, setOfferTarget] = useState<BuyerDirectoryItem | null>(null);
  const [needProductOpen, setNeedProductOpen] = useState(false);
  /** مودال ارتقای عضویت — پیام واحد تماس/چت/پیشنهاد تامین (خواستهٔ مالک ۱۱-۱۱) */
  const [contactPkgOpen, setContactPkgOpen] = useState(false);

  const hasProducts = (products ?? []).some(
    (p) => p.status === 'confirmed' || p.status === 'pending',
  );

  /** گیت ارتباط: تماس/چت/پیشنهاد تامین فقط با بستهٔ فعال (یا خودِ خریدار) —
   *  بقیه مودال «برای ارتباط با خریدار باید عضویت خود را ارتقا دهید» */
  const canContact = isOwner || isFeatured;
  const requireContact = (): boolean => {
    if (quotaQuery.isPending) return false;
    if (canContact) return true;
    setContactPkgOpen(true);
    return false;
  };

  const passOfferGates = (): boolean => {
    if (myProducts === undefined || quotaQuery.isPending) return false;
    if (!hasProducts) {
      setNeedProductOpen(true);
      return false;
    }
    if (!canContact) {
      setContactPkgOpen(true);
      return false;
    }
    return true;
  };

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

  /* ── قفل مهمان — مشاهدهٔ دفتر فقط با ورود؛ اعضا رایگان می‌بینند ── */
  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 lg:px-6">
        <LockedCard name={resolvedName} bannerTitle={bannerTitle} />
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
  // تنظیمات زنده (خواستهٔ مالک ۱۱-۱۱): دفتر عمومی تازه‌ترین تنظیمات را از
  // buyerBook/getPublic می‌آورد؛ فیلدهای SSR (resolvePublicId) فقط فالبک‌اند —
  // با این ادغام، ویرایش عنوان/شرایط بدون انتظار برای SSR جدید دیده می‌شود
  const effSettings: BuyerBookSettings = { ...settings, ...(data.settings ?? {}) };
  const buyerName = `${buyer.firstName} ${buyer.lastName}`.trim() || resolvedName;
  // مشخصات کسب‌وکار — عین دفتر، و در نبودِ فیلدها از پروفایل عمومی (getSeller)
  const bizFallback = needBizFallback ? sellerFallbackQuery.data?.user : null;
  const companyName =
    buyer.companyName?.trim() || bizFallback?.companyName?.trim() || null;
  const businessDesc =
    buyer.businessDesc?.trim() || bizFallback?.businessDesc?.trim() || null;
  const businessCategory =
    buyer.businessCategory?.trim() || bizFallback?.businessCategory?.trim() || null;
  const address = buyer.address?.trim() || bizFallback?.address?.trim() || null;
  const gallery = buyer.gallery?.length ? buyer.gallery : (bizFallback?.gallery ?? []);
  const certificates = buyer.certificates?.length
    ? buyer.certificates
    : (bizFallback?.certificates ?? []);
  // عنوان بنر نهایی — متن خودِ خریدار یا پیش‌فرض «دفتر خرید + نام کسب‌وکار/کاربر»
  const effectiveBannerTitle =
    effSettings.bannerTitle?.trim() || `دفتر خرید ${companyName ?? buyerName}`;
  const location = [buyer.provinceName, buyer.cityName].filter(Boolean).join('، ');
  const accent = effSettings.brandColor;
  const supplyTerms = effSettings.supplyTerms?.trim() || null;
  // دکمهٔ تماس (خواستهٔ مالک ۱۱-۱۱) — دو کلید کنار هم: سوییچ مخصوص همین
  // دفتر (تنظیمات دفتر خرید) و سوییچ سراسری «امکان تماس» پروفایل؛ هر کدام
  // خاموش باشد دکمهٔ تماس مخفی می‌شود و فقط چت می‌ماند
  const callAllowed =
    effSettings.allowCalls !== false && buyer.allowCalls !== false;
  const companyLabel = buyer.isCompany && buyer.companyName?.trim() ? buyer.companyName.trim() : null;
  const categoryLabel = businessCategory;

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
    <div className="mx-auto max-w-6xl px-4 pb-36 pt-4 lg:px-6 lg:pb-12 lg:pt-6">
      {/* ─── کارت هویت خریدار — بنر عنوان‌دار + لوگو + سمت + مشخصات ─── */}
      <section className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_8px_rgba(0,0,0,0.07)]">
        {/* بنر — گرادیان رنگ برند؛ بج «دفتر خرید» + عنوان بزرگ (خواستهٔ مالک ۱۱-۱۱).
            ارتفاع و فاصلهٔ پایین عنوان طوری است که متن هرگز زیر آواتاری که عمداً
            روی لبهٔ پایین بنر می‌نشیند پنهان نشود (موبایل ۴۸px / دسکتاپ ۵۶px) */}
        <div
          className="relative flex h-52 flex-col justify-between overflow-hidden px-4 pb-4 pt-4 sm:h-56 sm:px-6"
          style={{
            background: accent
              ? `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 72%, black) 100%)`
              : 'linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 72%, black) 100%)',
          }}
        >
          <div className="absolute -end-12 -top-16 size-48 rounded-full bg-white/10" aria-hidden />
          <div className="absolute -start-14 -bottom-20 size-44 rounded-full bg-white/[0.07]" aria-hidden />
          <div className="absolute end-6 top-1/2 size-24 -translate-y-1/2 rounded-full bg-white/[0.06] sm:size-32" aria-hidden />

          {/* ردیف بالا — لوگوی کسب‌وکار (تنظیمات) به‌جای بج «دفتر خرید»
              (خواستهٔ مالک ۱۱-۱۱)؛ بدون لوگو = همان بج متنی. بج «تایید هویت
              شده» (خواستهٔ مالک ۱۱-۱۱) هم همین بالا می‌نشیند — اولین چیزی
              که تامین‌کننده روی جلد می‌بیند اعتماد است */}
          <div className="relative flex items-start justify-between gap-2">
            {effSettings.logo ? (
              <img
                src={effSettings.logo}
                alt="لوگوی کسب‌وکار"
                className="size-11 rounded-xl border-2 border-white/50 bg-white/90 object-cover shadow-sm backdrop-blur sm:size-12"
              />
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-extrabold text-white backdrop-blur">
                <BookOpen size={13} strokeWidth={2.4} />
                دفتر خرید
              </span>
            )}
            <span className="flex flex-wrap items-center justify-end gap-1.5">
              {buyer.isVerified && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1.5 text-[10.5px] font-bold text-white backdrop-blur"
                  title="هویت و مدارک این خریدار در آیمچ تایید شده است"
                >
                  <BadgeCheck size={12} strokeWidth={2.4} />
                  تایید هویت شده
                </span>
              )}
              {buyer.activeRecently && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1.5 text-[10.5px] font-bold text-white backdrop-blur">
                  <span className="size-2 rounded-full bg-emerald-300" aria-hidden />
                  فعال در ۷ روز اخیر
                </span>
              )}
            </span>
          </div>

          {/* عنوان بنر — از تنظیمات دفتر (خواستهٔ مالک ۱۱-۱۱)؛ فاصلهٔ پایینش
              از لبه، بالای ناحیهٔ آواتار می‌ماند تا متن کامل دیده شود.
              whitespace-pre-line: Enterهای فیلد چندخطی تنظیمات، همین‌جا خطِ جدید می‌شوند */}
          <h2 className="relative mb-12 max-w-2xl whitespace-pre-line text-start text-[15px] font-extrabold leading-7 text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.25)] sm:mb-14 sm:text-lg sm:leading-8 lg:text-xl">
            {effectiveBannerTitle}
          </h2>
        </div>

        <div className="px-4 pb-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
            {/* تصویر پروفایل کاربر — روی جلد افتاده (خواستهٔ مالک ۱۱-۱۱:
                به‌جای لوگو، تصویر خود کاربر؛ لوگو رفته بالا روی بنر) */}
            <div className="relative -mt-12 size-24 shrink-0 sm:-mt-14 sm:size-28">
              {buyer.avatarUrl ? (
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

            {/* سمت + نام + متا — «مسوول خرید: نام» در یک خط (خواستهٔ مالک ۱۱-۱۱) */}
            <div className="min-w-0 flex-1 space-y-1.5 pt-1 sm:pb-2">
              <h1 className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xl font-extrabold leading-8 sm:text-2xl">
                <span className="shrink-0 text-[13px] font-bold text-(--catalog-accent) sm:text-[15px]">
                  مسوول خرید:
                </span>
                <span className="truncate">{buyerName}</span>
                {buyer.isVerified && (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-(--catalog-accent)/30 bg-(--catalog-accent)/10 px-2.5 py-1 text-[10.5px] font-extrabold text-(--catalog-accent)"
                    title="هویت و مدارک این خریدار در آیمچ تایید شده است"
                  >
                    <BadgeCheck size={13} strokeWidth={2.4} />
                    تایید هویت شده
                  </span>
                )}
                <span
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[10.5px] font-extrabold text-secondary-foreground"
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

            {/* اقدام‌های تماس (خواستهٔ مالک ۱۱-۱۱) — برچسب کوتاه «تماس»/«چت»؛
                موبایلِ PhoneReveal مستقیم تماس می‌گیرد، دسکتاپ شماره را نشان
                می‌دهد. گیت ارتباط: بی‌بسته مودال ارتقا. تماس فقط وقتی خریدار
                اجازه داده (سوییچ دفتر + سوییچ پروفایل). ذخیرهٔ دفتر برای همه */}
            <div className="flex shrink-0 flex-wrap items-center gap-2 pt-2 sm:pb-2">
              {callAllowed &&
                (canContact ? (
                  <PhoneReveal
                    sellerName={buyerName}
                    userName={buyer.userName}
                    description="برای گفتگو درباره شرایط تامین و هماهنگی خرید دوره‌ای تماس بگیرید."
                  >
                    <Button className="h-11 rounded-lg px-5 text-sm font-bold">
                      <Phone size={17} />
                      تماس
                    </Button>
                  </PhoneReveal>
                ) : (
                  <Button
                    className="h-11 rounded-lg px-5 text-sm font-bold"
                    onClick={requireContact}
                    title="تماس با خریدار"
                  >
                    <Phone size={17} />
                    تماس
                  </Button>
                ))}
              <ChatDialog
                sellerUserName={buyer.userName}
                sellerId={buyer.id}
                sellerName={buyerName}
                sellerAvatarUrl={buyer.avatarUrl}
                buttonLabel="چت"
                directSubtitle="گفتگوی مستقیم با مسئول خرید"
                buttonVariant="outline"
                className="h-11 rounded-lg px-5 text-sm font-bold"
                beforeOpen={requireContact}
              />
              <BookSaveButton buyerUserName={buyer.userName} />
            </div>
          </div>
        </div>

        {/* نوار منوی بخش‌ها — عین کاتالوگ (خواستهٔ مالک ۱۱-۱۱): نظرات بعد از
            کالاها؛ مجوزها آخر — تا نظرات زیر اسکرول قایم نشود */}
        <ProfileScrollNav
          activeDefault="about"
          sections={[
            { id: 'about', label: 'درباره خریدار' },
            { id: 'book-items', label: 'کالاهای دوره‌ای', count: items.length },
            { id: 'reviews', label: 'نظرات' },
            {
              id: 'buyer-gallery',
              label: 'مجوزها و گواهی‌نامه‌ها',
              visible: gallery.length > 0 || certificates.length > 0,
            },
          ]}
        />
      </section>

      {/* ─── آمار ─── */}
      <section aria-label="آمار خریدار" className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl border bg-card p-3 text-center sm:p-4">
            <span className="mx-auto grid size-9 place-items-center rounded-full bg-(--catalog-accent)/10 text-(--catalog-accent)">
              <Icon size={17} />
            </span>
            <p className="mt-2 text-sm font-extrabold leading-6 sm:text-[15px]">{value}</p>
            <p className="mt-0.5 text-[10.5px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>

      {/* ─── دو ستونه دسکتاپ: اصلی (شرایط + کالاها) + سایدبار (درباره خریدار) ─── */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {/* ─── شرایط تامین (خواستهٔ مالک ۱۱-۱۱) — متن دلخواه خریدار برای
                  تامین‌کنندگان؛ اختیاری است، نبود = بخش نمایش داده نمی‌شود ─── */}
          {supplyTerms && (
            <section
              aria-labelledby="supply-terms"
              className="rounded-xl border-2 border-(--catalog-accent)/30 bg-(--catalog-accent)/5 p-4 sm:p-5"
            >
              <div className="flex items-center gap-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-(--catalog-accent)/15 text-(--catalog-accent)">
                  <ScrollText size={16} />
                </span>
                <div className="min-w-0">
                  <h2 id="supply-terms" className="text-[15px] font-extrabold">
                    شرایط تامین
                  </h2>
                  <p className="text-[10.5px] text-muted-foreground">
                    شرایط اعلامی {buyerName} به تامین‌کنندگان
                  </p>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line border-t border-(--catalog-accent)/15 pt-3 text-[13px] leading-7 text-foreground/90">
                {supplyTerms}
              </p>
            </section>
          )}

          {/* ─── کالاهای خرید دوره‌ای ─── */}
          <section aria-labelledby="book-items">
            <h2 id="book-items" className="mb-3 flex items-center gap-2 text-base font-extrabold">
              <span className="grid size-7 place-items-center rounded-lg bg-(--catalog-accent)/10 text-(--catalog-accent)">
                <Package size={15} />
              </span>
              کالاهای خرید دوره‌ای
              <span className="font-num text-xs font-bold text-muted-foreground">({toFa(items.length)})</span>
            </h2>
            {items.length === 0 ? (
              <p className="flex flex-col items-center gap-2 rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
                <PackageOpen size={34} strokeWidth={1.2} className="text-(--catalog-accent)/50" />
                این خریدار هنوز کالای دوره‌ای تاییدشده‌ای در دفترش ندارد.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        </div>

        {/* ─── سایدبار — درباره خریدار (لنگر نوار منو)؛ تصاویر/مجوزها در
                نوار واحد آخر صفحه (خواستهٔ مالک ۱۱-۱۱: هر اطلاعاتی از خریدار
                که برای فروشنده مهم است) ─── */}
        <aside id="about" className="min-w-0 space-y-4 scroll-mt-24" aria-label="مشخصات خریدار">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <span className="grid size-7 place-items-center rounded-lg bg-(--catalog-accent)/10 text-(--catalog-accent)">
                <Building2 size={15} />
              </span>
              درباره خریدار
            </h2>
            {/* متن پیش‌فرض پارامتریک آیمچ (خواستهٔ مالک ۱۳-۱۱) — نمایشی و
                ساخته‌شده از دادهٔ همین صفحه؛ در دیتابیس ذخیره نمی‌شود */}
            <p className="mt-3 whitespace-pre-line text-[13px] leading-7 text-muted-foreground">
              {businessDesc ||
                fallbackBusinessDesc({
                  name: buyerName,
                  city: buyer.cityName ?? buyer.provinceName,
                  kind: 'buyer',
                })}
            </p>
            <dl className="mt-4 space-y-2.5 border-t pt-4 text-xs">
              {location && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin size={13} className="shrink-0 text-(--catalog-accent)/70" />
                  <dt className="shrink-0">شهر:</dt>
                  <dd className="font-bold text-foreground">{location}</dd>
                </div>
              )}
              {address && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin size={13} className="shrink-0 text-(--catalog-accent)/70" />
                  <dt className="shrink-0">آدرس:</dt>
                  <dd className="truncate font-bold text-foreground" title={address}>{address}</dd>
                </div>
              )}
              {companyLabel && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 size={13} className="shrink-0 text-(--catalog-accent)/70" />
                  <dt className="shrink-0">شرکت:</dt>
                  <dd className="truncate font-bold text-foreground" title={companyLabel}>{companyLabel}</dd>
                </div>
              )}
              {categoryLabel && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 size={13} className="shrink-0 text-(--catalog-accent)/70" />
                  <dt className="shrink-0">صنف:</dt>
                  <dd className="truncate font-bold text-foreground" title={categoryLabel}>{categoryLabel}</dd>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <BadgeCheck size={13} className="shrink-0 text-(--catalog-accent)/70" />
                <dt className="shrink-0">نوع خریدار:</dt>
                <dd className="font-bold text-foreground">{buyer.role}</dd>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock3 size={13} className="shrink-0 text-(--catalog-accent)/70" />
                <dt className="shrink-0">سابقه فعالیت:</dt>
                <dd className="font-bold text-foreground">{seniority}</dd>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <ShieldCheck size={13} className="shrink-0 text-(--catalog-accent)/70" />
                <dt className="shrink-0">احراز هویت:</dt>
                <dd className="font-bold text-foreground">
                  {buyer.isVerified ? 'تایید شده در آیمچ' : 'انجام نشده'}
                </dd>
              </div>
            </dl>
          </div>

        </aside>
      </div>

      {/* ─── نظرات — نقش‌جداشده (خواستهٔ مالک ۱۱-۱۱): فقط نظرات درباره این
              کاربر «به‌عنوان خریدار»؛ امتیاز فروشندگی او در کاتالوگش جدا است ─── */}
      <section className="mt-8">
        <SellerReviews userName={buyer.userName} sellerName={buyerName} subject="buyer" />
      </section>

      {/* ─── مجوزها، گواهی‌نامه‌ها و جوایز — نوار واحد (خواستهٔ مالک ۱۱-۱۱):
              عکس‌های «تصاویر کسب‌وکار» و مجوزها همه در همین یک بخش می‌آیند
              (دو نوار جدا حذف شد)؛ در انتهای دفتر، تمام‌عرض — در نبودِ فیلدهای
              دفتر، از پروفایل عمومی getSeller می‌آید ─── */}
      {(gallery.length > 0 || certificates.length > 0) && (
        <section id="buyer-gallery" aria-labelledby="buyer-gallery-title" className="mt-8 scroll-mt-24">
          <h2 id="buyer-gallery-title" className="mb-3 flex items-center gap-2 text-base font-extrabold">
            <span className="grid size-7 place-items-center rounded-lg bg-(--catalog-accent)/10 text-(--catalog-accent)">
              <Camera size={15} />
            </span>
            مجوزها، گواهی‌نامه‌ها و جوایز
          </h2>
          <div className="rounded-xl border bg-card p-4 sm:p-5">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {[...gallery, ...certificates].map((g, i) => (
                <a
                  key={`${g.url}-${i}`}
                  href={g.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block aspect-square overflow-hidden rounded-lg border bg-secondary"
                  title="مشاهده تصویر کامل"
                >
                  <img
                    src={g.thumbUrl ?? g.url}
                    alt={`مجوز و تصویر کسب‌وکار ${i + 1}`}
                    className="size-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── امضای iMach — عین کاتالوگ ─── */}
      <footer className="mt-8 border-t pt-6 pb-2 text-center">
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

      {/* ─── نوار فیکس موبایل — چت/تماس + ذخیره (خواستهٔ مالک ۱۱-۱۱):
              تامین‌کننده از هر جای صفحه می‌تواند تماس بگیرد یا چت کند؛
              تماس فقط وقتی خریدار اجازه داده. بالای ناوبری پایین می‌نشیند ─── */}
      <div
        role="toolbar"
        aria-label="تماس، چت و ذخیره دفتر خرید"
        className="fixed inset-x-0 bottom-[58px] z-40 flex h-16 items-center gap-2 border-t bg-card/95 px-4 shadow-[0_-1px_8px_rgba(0,0,0,0.08)] backdrop-blur nav-desktop:hidden"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-extrabold">دفتر خرید {buyerName}</p>
          <p className="truncate text-[10.5px] text-muted-foreground">
            {toFa(items.length)} کالای دوره‌ای
            {saversCount > 0 ? ` — ${toFa(saversCount)} فروشنده ذخیره کرده` : ''}
          </p>
        </div>
        {callAllowed &&
          (canContact ? (
            <PhoneReveal
              sellerName={buyerName}
              userName={buyer.userName}
              description="برای گفتگو درباره شرایط تامین و هماهنگی خرید دوره‌ای تماس بگیرید."
            >
              <button
                type="button"
                title="تماس با خریدار"
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-4 text-xs font-bold text-white shadow-sm"
                style={{ backgroundColor: accent ?? 'var(--primary)' }}
              >
                <Phone size={16} />
                تماس
              </button>
            </PhoneReveal>
          ) : (
            <button
              type="button"
              title="تماس با خریدار"
              onClick={requireContact}
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-4 text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: accent ?? 'var(--primary)' }}
            >
              <Phone size={16} />
              تماس
            </button>
          ))}
        <ChatDialog
          sellerUserName={buyer.userName}
          sellerId={buyer.id}
          sellerName={buyerName}
          sellerAvatarUrl={buyer.avatarUrl}
          buttonLabel="چت"
          directSubtitle="گفتگوی مستقیم با مسئول خرید"
          buttonVariant="outline"
          className="h-10 shrink-0 rounded-lg px-4 text-xs font-bold"
          beforeOpen={requireContact}
        />
        <BookSaveButton buyerUserName={buyer.userName} compact />
      </div>

      {/* مودال پیشنهاد تامین — عنوان با نام کالای دفتر */}
      <SupplyOfferModal
        key={offerTarget?.id ?? 'closed'}
        open={offerTarget !== null}
        onClose={() => setOfferTarget(null)}
        targets={offerTarget ? [offerTarget] : []}
        products={products}
        category={targetCategory}
      />

      {/* گیت‌های پیشنهاد/ارتباط — ثبت کالا و ارتقای عضویت (پیام واحد تماس/
          چت/پیشنهاد — خواستهٔ مالک ۱۱-۱۱) */}
      <NeedPackageModal
        open={needProductOpen}
        onClose={() => setNeedProductOpen(false)}
        kind="product"
        message="برای ارسال پیشنهاد تامین، باید کالاهای خود را برای فروش ثبت کنید تا خریداران مرتبط به شما نمایش داده شوند. با ثبت کالا و حداقل سفارش، سیستم تطابق مطابق‌ترین خریداران را به شما نشان می‌دهد."
      />
      <NeedPackageModal
        open={contactPkgOpen}
        onClose={() => setContactPkgOpen(false)}
        kind="package"
        message="برای ارتباط با خریدار باید عضویت خود را ارتقا دهید. با فعال‌سازی یکی از بسته‌های ایمچ می‌توانید با خریداران تماس بگیرید، چت کنید و پیشنهاد تامین بفرستید."
        ctaLabel="مشاهده بسته‌ها"
      />
    </div>
  );
}
