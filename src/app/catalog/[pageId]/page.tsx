import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BadgeCheck,
  CalendarClock,
  MapPin,
  Package,
  PackageOpen,
  Store,
  Zap,
} from 'lucide-react';
import { apiBase, joinUrl } from '@/lib/api/client';
import { getCatalogByPageIdSSR } from '@/lib/mock/api';
import {
  CatalogContactButtons,
  CatalogMobileBar,
  CatalogSaveButton,
  CatalogShareButton,
  type CatalogSellerIdentity,
} from '@/components/catalog/catalog-actions';
import { CatalogSaversBox } from '@/components/catalog/catalog-savers';
import { CatalogProductCard } from '@/components/catalog/catalog-product-card';
import { SellerReviews } from '@/components/products/seller-reviews';
import { RatingStars } from '@/components/shared/rating-stars';
import { stockFa, toFa } from '@/lib/format';
import { SITE_URL } from '@/lib/site';
import type { Product } from '@/lib/types';

/**
 * صفحهٔ عمومی کاتالوگ محصول — /catalog/{pageId} (خواسته مالک ۱۰-۱۱).
 *
 * صفحهٔ شخصی و مستقلِ فروشنده برای فرستادن به مشتری‌های خودش:
 *  • بدون هدر/فوتر/نوار پایین ایمچ — تنها امضای «ساخته شده با iMach» در
 *    پایین (ابزار بازاریابی ایمچ)؛
 *  • تم لحظه‌ای با «رنگ برند» فروشنده: توکن‌های CSS روی همین درخت override
 *    می‌شوند (سبک روشن ثابت — کاتالوگ برند است، از تم تیرهٔ ایمچ جدا)؛
 *  • امکانات: جلد برند + هویت، دکمه‌های تماس/چت/واتساپ/اینستاگرام، آمار
 *    (محصولات/موجودی/امتیاز/ذخیره‌کنندگان)، محصولات با قیمت مستقیم و مودال
 *    جزئیات، نظرات و ستاره‌ها، ذخیره و اشتراک‌گذاری.
 */

interface Props {
  params: Promise<{ pageId: string }>;
}

interface CatalogSellerData {
  user: {
    id: string;
    userName: string;
    firstName: string;
    lastName: string;
    isVerified: boolean;
    avatarUrl: string | null;
    businessDesc: string | null;
    createdAt: string;
    daysInImach?: number;
    provinceName?: string | null;
    cityName?: string | null;
    reviewSummary?: { avg: number; count: number } | null;
    productCount?: number;
    totalStock?: number;
  };
  products: Product[];
}

/** دیتای فروشنده از همان سرویس پروفایل (getSeller) — کش ۶۰ ثانیه */
async function getSellerForCatalog(userName: string): Promise<CatalogSellerData | null> {
  try {
    const res = await fetch(joinUrl(apiBase(), '/products/getSeller'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName }),
      next: { revalidate: 60 },
    });
    const json = (await res.json()) as { status: boolean; data: CatalogSellerData | null };
    if (!json?.status || !json.data?.user) return null;
    const u = json.data.user;
    return {
      user: {
        ...u,
        daysInImach: Math.max(
          1,
          Math.round((Date.now() - new Date(u.createdAt || Date.now()).getTime()) / 86_400_000),
        ),
      },
      products: (json.data.products ?? []).map((p) => ({
        ...p,
        isElevated: false,
        photoThumbs: p.photoThumbs ?? p.photos,
      })) as Product[],
    };
  } catch {
    return null;
  }
}

async function getCatalogPageData(pageId: string) {
  const byPage = await getCatalogByPageIdSSR(pageId);
  if (!byPage) return null;
  const seller = await getSellerForCatalog(byPage.userName);
  if (!seller) return null;
  return { ...byPage, seller };
}

/** سابقهٔ فعالیت — بدون ذکر ایمچ (کاتالوگ صفحهٔ مستقل است) */
function seniorityLabel(days: number): string {
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years > 0 && months > 0) return `${toFa(years)} سال و ${toFa(months)} ماه فعالیت`;
  if (years > 0) return `${toFa(years)} سال فعالیت`;
  if (months > 0) return `${toFa(months)} ماه فعالیت`;
  return `${toFa(Math.max(days, 1))} روز فعالیت`;
}

/** آدرس مطلق عکس برای OG — عکس‌های نسبی به دامنهٔ سایت وصل می‌شوند */
function absoluteUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pageId } = await params;
  const data = await getCatalogPageData(decodeURIComponent(pageId));
  if (!data) return { title: 'کاتالوگ یافت نشد' };
  const name = `${data.seller.user.firstName} ${data.seller.user.lastName}`.trim();
  const ogImage = data.seller.products[0]?.photos?.[0];
  return {
    // absolute: بدون پسوند «| ایمچ» — کاتالوگ صفحهٔ مستقل فروشنده است
    title: { absolute: `کاتالوگ محصولات ${name}` },
    description:
      `کاتالوگ آنلاین محصولات ${name}` +
      `${data.seller.user.cityName ? ` — ${data.seller.user.cityName}` : ''}؛ ` +
      `${toFa(data.seller.user.productCount ?? data.seller.products.length)} محصول با قیمت و موجودی روز، تماس مستقیم و گفتگو.`,
    alternates: { canonical: `/catalog/${data.catalog.pageId}` },
    openGraph: {
      title: `کاتالوگ محصولات ${name}`,
      description: 'کاتالوگ آنلاین محصولات با قیمت و موجودی روز — تماس مستقیم با فروشنده',
      ...(ogImage ? { images: [{ url: absoluteUrl(ogImage) }] } : {}),
    },
  };
}

export default async function CatalogPage({ params }: Props) {
  const { pageId } = await params;
  const data = await getCatalogPageData(decodeURIComponent(pageId));
  if (!data) notFound();

  const { catalog, saversCount, seller } = data;
  const user = seller.user;
  const products = seller.products;
  const name = `${user.firstName} ${user.lastName}`.trim() || 'فروشنده';
  const brand = catalog.brandColor;
  const productCount = user.productCount ?? products.length;
  const totalStock = user.totalStock ?? products.reduce((a, p) => a + p.stock, 0);
  const unit = products[0]?.unit ?? 'کیلوگرم';
  const city = user.cityName?.trim() || null;
  const catalogUrl = `${SITE_URL}/catalog/${catalog.pageId}`;

  // تم برند — توکن‌ها روی همین درخت override می‌شوند؛ پالت روشن ثابت تا
  // کاتالوگ فارغ از تم تیره/روشن ایمچ، همیشه یکدست و «برندی» دیده شود
  const brandStyle = {
    colorScheme: 'light',
    '--background': '#ffffff',
    '--foreground': '#23262b',
    '--card': '#ffffff',
    '--card-foreground': '#23262b',
    '--popover': '#ffffff',
    '--popover-foreground': '#23262b',
    '--primary': brand,
    '--primary-deep': `color-mix(in srgb, ${brand} 80%, black)`,
    '--primary-foreground': '#ffffff',
    '--primary-soft': `color-mix(in srgb, ${brand} 9%, white)`,
    '--primary-line': `color-mix(in srgb, ${brand} 30%, white)`,
    '--secondary': '#f0f1f4',
    '--secondary-foreground': '#4a505b',
    '--muted': '#f0f1f4',
    '--muted-foreground': '#8b909a',
    '--accent': '#e7e9ed',
    '--accent-foreground': '#23262b',
    '--border': '#e9ebef',
    '--input': '#e2e5ea',
    '--ring': brand,
    '--verified': brand,
  } as React.CSSProperties;

  const identity: CatalogSellerIdentity = {
    userName: user.userName,
    id: user.id,
    name,
    avatarUrl: user.avatarUrl,
  };

  const stats = [
    {
      icon: Package,
      label: 'محصولات',
      value: toFa(productCount),
    },
    {
      icon: Store,
      label: 'موجودی عرضه',
      value: stockFa(totalStock, unit),
    },
  ] as const;

  return (
    <div dir="rtl" style={brandStyle} className="min-h-dvh bg-background text-foreground">
      <main className="mx-auto max-w-5xl px-3 pb-28 pt-4 sm:px-5 lg:pt-8">
        {/* ─── کارت برند — جلد رنگی + هویت فروشنده + راه‌های تماس ─── */}
        <section className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_8px_rgba(0,0,0,0.08)]">
          {/* جلد — گرادیان تخت رنگ برند با دوایر محو برای عمق */}
          <div
            className="relative h-32 sm:h-40"
            style={{
              background: `linear-gradient(135deg, ${brand} 0%, color-mix(in srgb, ${brand} 72%, black) 100%)`,
            }}
          >
            <div className="absolute -end-12 -top-16 size-48 rounded-full bg-white/10" aria-hidden />
            <div className="absolute -start-14 -bottom-20 size-44 rounded-full bg-white/[0.07]" aria-hidden />
            {/* ذخیره + اشتراک‌گذاری — دکمه‌های شیشه‌ای روی جلد */}
            <div className="absolute end-3 top-3 flex items-center gap-2">
              <CatalogShareButton url={catalogUrl} title={`کاتالوگ محصولات ${name}`} />
              <CatalogSaveButton pageId={catalog.pageId} onGlass />
            </div>
          </div>

          {/* هویت — آواتار روی جلد + نام + امتیاز + متا */}
          <div className="px-4 pb-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
              <div className="relative -mt-12 size-24 shrink-0 sm:-mt-14 sm:size-28">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={`تصویر ${name}`}
                    className="size-full rounded-2xl border-4 border-card object-cover shadow-md"
                  />
                ) : (
                  <span className="grid size-full place-items-center rounded-2xl border-4 border-card bg-primary/10 text-4xl font-black text-primary shadow-md">
                    {user.firstName?.[0] ?? '؟'}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1.5 pt-1 sm:pb-2">
                <h1 className="flex min-w-0 items-center gap-2 text-xl font-extrabold leading-8 sm:text-2xl">
                  <span className="truncate">{name}</span>
                  {user.isVerified && (
                    <BadgeCheck className="size-5 shrink-0 text-primary" aria-label="احراز هویت شده" />
                  )}
                </h1>
                {user.reviewSummary && user.reviewSummary.count > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <RatingStars value={user.reviewSummary.avg} size={14} showValue />
                    <span className="text-xs text-muted-foreground">
                      از {toFa(user.reviewSummary.count)} نظر خریداران
                    </span>
                  </div>
                ) : null}
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:text-[13px]">
                  {city && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={13} className="text-primary/80" />
                      {city}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock size={13} className="text-primary/80" />
                    {seniorityLabel(user.daysInImach ?? 1)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Package size={13} className="text-primary/80" />
                    {toFa(productCount)} محصول
                  </span>
                </p>
              </div>
            </div>

            {user.businessDesc?.trim() && (
              <p className="mt-3 whitespace-pre-line rounded-xl bg-secondary/60 p-3.5 text-[13px] leading-6 text-foreground/85">
                {user.businessDesc.trim()}
              </p>
            )}
          </div>

          {/* راه‌های تماس — تماس/چت ایمچ + واتساپ/اینستاگرام اگر تنظیم شده باشد */}
          <div className="border-t border-border/70 p-4 sm:px-6">
            <CatalogContactButtons
              seller={identity}
              instagramId={catalog.instagramId}
              whatsappNumber={catalog.whatsappNumber}
            />
          </div>
        </section>

        {/* ─── آمار — محصولات / موجودی / امتیاز / ذخیره‌کنندگان ─── */}
        <section aria-label="آمار فروشنده" className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-lg border bg-card p-3 text-center sm:p-4">
              <Icon size={18} className="mx-auto text-primary" />
              <p className="mt-1.5 font-num text-sm font-extrabold leading-6 sm:text-base">{value}</p>
              <p className="mt-0.5 text-[10.5px] text-muted-foreground">{label}</p>
            </div>
          ))}
          <div className="rounded-lg border bg-card p-3 text-center sm:p-4">
            <BadgeCheck size={18} className="mx-auto text-primary" />
            <p className="mt-1.5 text-sm font-extrabold leading-6 sm:text-base">
              {user.reviewSummary && user.reviewSummary.count > 0
                ? `${toFa(user.reviewSummary.avg)} از ۵`
                : 'تازه‌وارد'}
            </p>
            <p className="mt-0.5 text-[10.5px] text-muted-foreground">امتیاز اعتماد</p>
          </div>
          <CatalogSaversBox pageId={catalog.pageId} ownerUserName={user.userName} initialCount={saversCount} />
        </section>

        {/* ─── محصولات — همان‌هایی که فروشنده در ایمچ ثبت کرده ─── */}
        <section aria-labelledby="catalog-products" className="mt-8">
          <h2 id="catalog-products" className="mb-3 flex items-center gap-2 text-base font-extrabold">
            <Package size={17} className="text-primary" />
            محصولات
            <span className="font-num text-xs font-bold text-muted-foreground">({toFa(productCount)})</span>
          </h2>
          {products.length === 0 ? (
            <p className="flex flex-col items-center gap-2 rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
              <PackageOpen size={34} strokeWidth={1.2} className="text-primary/50" />
              این فروشنده هنوز محصولی در کاتالوگ خود ثبت نکرده است.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <CatalogProductCard
                  key={p.id}
                  product={p}
                  seller={identity}
                  instagramId={catalog.instagramId}
                  whatsappNumber={catalog.whatsappNumber}
                />
              ))}
            </div>
          )}
        </section>

        {/* ─── نظرات خریداران — همان نظرات پروفایل ایمچ ─── */}
        <section className="mt-8">
          <SellerReviews userName={user.userName} sellerName={name} />
        </section>

        {/* ─── امضای iMach — تنها لینک ایمچ در کاتالوگ (بازاریابی) ─── */}
        <footer className="mt-10 border-t border-border pt-6 pb-2 text-center">
          <Link
            href="/"
            className="group inline-flex flex-col items-center gap-1.5"
            aria-label="ساخته شده با iMach — ساخت کاتالوگ رایگان"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-xs font-bold shadow-sm transition-colors group-hover:border-primary/40 group-hover:text-primary">
              <Zap size={13} className="text-[color:var(--emphasis)]" />
              ساخته شده با iMach
            </span>
            <span className="text-[10.5px] text-muted-foreground">
              کاتالوگ آنلاین رایگان برای کسب‌وکار شما — iMach.ir
            </span>
          </Link>
        </footer>
      </main>

      {/* نوار چسبان تماس موبایل — تماس / چت / ذخیره */}
      <CatalogMobileBar pageId={catalog.pageId} seller={identity} />
    </div>
  );
}
