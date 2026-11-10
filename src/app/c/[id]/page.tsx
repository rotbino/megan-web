import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  BadgeCheck,
  Boxes,
  Building2,
  Camera,
  FileCheck2,
  MapPin,
  Send,
  ShieldAlert,
  Store,
  Timer,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { CatalogHeader } from '@/components/products/catalog-header';
import { ProfileHero } from '@/components/products/profile-hero';
import { ProfileScrollNav } from '@/components/products/profile-scroll-nav';
import { SellerReviews } from '@/components/products/seller-reviews';
import { ProductCard } from '@/components/products/product-card';
import { ShareBox } from '@/components/shared/share-box';
import { RatingStars } from '@/components/shared/rating-stars';
import { CatalogSaversBox } from '@/components/products/catalog-savers';
import { apiBase } from '@/lib/api/client';
import { stockFa, toFa } from '@/lib/format';
import type { CatalogSettings, Product } from '@/lib/types';

interface Props {
  params: Promise<{ id: string }>;
}

interface SellerData {
  user: {
    id: string;
    userName: string;
    firstName: string;
    lastName: string;
    activePakageType: number;
    isVerified: boolean;
    businessDesc: string | null;
    avatarUrl: string | null;
    createdAt: string;
    daysInImach?: number;
    online?: boolean;
    lastSeenAt?: string | null;
    provinceName?: string | null;
    cityName?: string | null;
    reviewSummary?: { avg: number; count: number } | null;
    responseRate?: number | null;
    productCount?: number;
    totalStock?: number;
    // فیلدهای کسب‌وکار — از فرم ویرایش پروفایل (embedded myuser_profiles)
    address?: string | null;
    isCompany?: boolean;
    companyName?: string | null;
    // صنف کسب‌وکار (خواسته مالک ۳-۱۱) — سوپرمارکت/قنادی/…
    businessCategory?: string | null;
    gallery?: Array<{ url: string; thumbUrl: string }>;
    certificates?: Array<{ url: string; thumbUrl: string }>;
  };
  products: Product[];
}

/** SSR — فروشنده زنده از بک‌اند (غنی‌شده: مکان/آنلاین/نظرات/پاسخگویی).
 *  فالبک ماک حذف شد — کاتالوگ فقط با کاربر واقعی دیتابیس می‌آید؛ نبود = ۴۰۴. */
async function getSeller(userName: string): Promise<SellerData | null> {
  try {
    const res = await fetch(`${apiBase()}/products/getSeller`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName }),
      // ۳۰s هم‌قدم با کش بک‌اند (getSeller TTL.SHORT + invalidateTag) — ویرایش
      // پروفایل همان لحظه کش را می‌شکند؛ این‌جا هم پنجره کوتاه است
      next: { revalidate: 30 },
    });
    const json = (await res.json()) as { status: boolean; data: SellerData };
    if (!json?.status || !json.data) return null;
    const u = json.data.user;
    return {
      user: {
        ...u,
        daysInImach: Math.max(
          1,
          Math.round((Date.now() - new Date(u.createdAt || Date.now()).getTime()) / 86_400_000),
        ),
      },
      products: json.data.products.map((p) => ({
        ...p,
        isElevated: false,
        photoThumbs: p.photoThumbs ?? p.photos,
      })) as Product[],
    };
  } catch {
    // بک‌اند در دسترس نیست — دیتای ماک وجود ندارد؛ ۴۰۴
    return null;
  }
}

/** رزولو آیدی عمومی کاتالوگ — آیدی سفارشی یا userName فروشنده (خواستهٔ
 *  ۱۰-۱۱ دور ۳)؛ تنظیمات برند (نام/رنگ/آیکون) همراهش می‌آید */
async function resolveCatalog(id: string): Promise<{ userName: string; settings: CatalogSettings } | null> {
  try {
    const res = await fetch(`${apiBase()}/catalog/resolvePublicId`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
      next: { revalidate: 30 },
    });
    const json = (await res.json()) as {
      status: boolean;
      data: { userName: string; settings: CatalogSettings } | null;
    };
    if (!json?.status || !json.data?.userName || !json.data.settings) return null;
    return json.data;
  } catch {
    return null;
  }
}

/** دیتای کامل صفحهٔ کاتالوگ — رزولو آیدی + فروشنده (یک جا برای متادیتا و رندر).
 *  fallback (خواستهٔ مالک ۱۰-۱۱ دور ۴): بک‌اندی که اندپوینت‌های catalog/*
 *  را هنوز نساخته ۴۰۴ می‌دهد؛ در آن حالت خودِ id را userName فرض می‌کنیم و
 *  با تنظیمات پیش‌فرض رندر می‌کنیم — تا کاتالوگِ مسیر /c/{userName} حتی
 *  پیش از کامل‌شدن بک‌اند هم بالا بیاید. id ناشناخته = همان ۴۰۴ قبلی. */
async function getCatalogPageData(
  id: string,
): Promise<{ seller: SellerData; settings: CatalogSettings } | null> {
  const resolved = await resolveCatalog(id);
  if (resolved) {
    const seller = await getSeller(resolved.userName);
    if (seller) return { seller, settings: resolved.settings };
    return null;
  }
  // بک‌اند بدون اندپوینت کاتالوگ — خود id می‌تواند userName فروشنده باشد
  const seller = await getSeller(id);
  if (!seller) return null;
  return {
    seller,
    settings: { catalogId: id, brandName: null, brandColor: null, brandIcon: 'store' },
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const page = await getCatalogPageData(decodeURIComponent(id));
  if (!page) return { title: 'کاتالوگ یافت نشد' };
  const { seller, settings } = page;
  const sellerName = `${seller.user.firstName} ${seller.user.lastName}`.trim() || 'فروشنده';
  const brandName = settings.brandName?.trim() || sellerName;
  const location = [seller.user.provinceName, seller.user.cityName].filter(Boolean).join('، ');
  return {
    // کاتالوگ کاربر — سند بازاریابی فروشنده برای مشتری‌های خودش؛ عنوان
    // برند او (خواستهٔ ۱۰-۱۱ دور ۳) بدون پسوند «| ایمچ»
    title: { absolute: `کاتالوگ محصولات ${brandName}` },
    description:
      `${brandName}${location ? ` — ${location}` : ''} — کاتالوگ آنلاین محصولات، قیمت و موجودی روز؛ تماس مستقیم و گفتگو با فروشنده.`,
    alternates: { canonical: `/c/${settings.catalogId}` },
  };
}

export default async function CatalogPage({ params }: Props) {
  const { id } = await params;
  const page = await getCatalogPageData(decodeURIComponent(id));
  if (!page) notFound();
  const { seller, settings } = page;
  const user = seller.user;
  const sellerName = `${user.firstName} ${user.lastName}`.trim() || 'فروشنده';
  const brandName = settings.brandName?.trim() || sellerName;
  const location = [user.provinceName, user.cityName].filter(Boolean).join('، ');
  const products = seller.products;
  const totalStock = user.totalStock ?? products.reduce((a, p) => a + p.stock, 0);
  const unit = products[0]?.unit ?? 'کیلوگرم';
  // مسیر عمومی کاتالوگ — نسبی؛ کلاینت‌ها (هدر/ShareBox/هیرو) موقع کپی و
  // اشتراک‌گذاری با window.location.origin مطلقش می‌کنند تا لینک همیشه
  // با میزبانیِ فعلی ساخته شود، نه دامنهٔ کانفیگ (خواستهٔ مالک ۱۰-۱۱ دور ۴)
  const sharePath = `/c/${settings.catalogId}`;

  /** آمار فروشنده — سه جعبه مثل تب «اصلی» باسکول */
  const stats = [
    { icon: Boxes, label: 'آگهی فعال', value: toFa(user.productCount ?? products.length) },
    { icon: Store, label: 'موجودی عرضه', value: stockFa(totalStock, unit) },
    {
      icon: BadgeCheck,
      label: 'امتیاز اعتماد',
      value: user.reviewSummary && user.reviewSummary.count > 0
        ? `${toFa(user.reviewSummary.avg)} از ۵`
        : 'بدون نظر',
    },
  ] as const;
  const gallery = user.gallery ?? [];
  const certificates = user.certificates ?? [];
  const companyLabel = user.isCompany && user.companyName?.trim() ? user.companyName.trim() : null;
  // صنف (خواسته مالک ۳-۱۱) — مستقل از نام شرکت نمایش داده می‌شود
  const categoryLabel = user.businessCategory?.trim() || null;

  return (
    // رنگ برند به‌صورت CSS var به همهٔ فرزندان می‌رسد؛ بدون رنگ دلخواه =
    // همان تم نقره‌ای ایمچ (var پیش‌فرض). لهجه‌ها: آیکون بخش‌ها، نوار
    // ناوبری و دکمه‌های هدر — متن‌ها همیشه توکنی می‌مانند (کنتراست تضمین)
    <div
      style={{ ['--catalog-accent' as string]: settings.brandColor || 'var(--primary)' } as React.CSSProperties}
    >
      {/* هدر اختصاصی کاتالوگ (خواستهٔ ۱۰-۱۱ دور ۳) — به‌جای هدر ایمچ
          (جستجو/لینک‌ها)؛ این صفحه سند شخصی فروشنده است */}
      <CatalogHeader
        brandName={brandName}
        brandIcon={settings.brandIcon}
        brandColor={settings.brandColor}
        sharePath={sharePath}
      />
      <main className="flex-1">
        {/* ─── کارت یکپارچه هدر کاتالوگ — عین باسکول (cp-header-main-container) ───
            بنر + هویت فروشنده + نوار لینک بخش‌ها همه یک کارت‌اند؛ سایه نرم
            ۰/۱px/۸px باسکول (بدون بوردر در تم روشن — در تاریک بوردر ظریف). */}
        <div className="mx-auto max-w-7xl px-4 pt-4 lg:px-6 lg:pt-6">
          <div className="overflow-hidden rounded-lg bg-card shadow-[0_1px_8px_rgba(0,0,0,0.1)] dark:border dark:border-border">
            <ProfileHero
              user={user as unknown as Parameters<typeof ProfileHero>[0]['user']}
            />
            <ProfileScrollNav
              productCount={user.productCount ?? products.length}
              hasGallery={gallery.length > 0 || certificates.length > 0}
            />
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pt-6 pb-12 lg:grid-cols-[1fr_320px] lg:px-6">
          {/* ستون اصلی */}
          <div className="min-w-0 space-y-8">
            {/* درباره فروشنده */}
            <section id="about" aria-labelledby="about-title" className="scroll-mt-24">
              <h2 id="about-title" className="mb-3 text-base font-extrabold">درباره فروشنده</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {stats.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="rounded-md border bg-card p-3 text-center sm:p-4">
                      <Icon size={18} className="mx-auto text-(--catalog-accent)" />
                      <p className="mt-1.5 text-sm font-extrabold leading-6 sm:text-base">{value}</p>
                      <p className="mt-0.5 text-[10.5px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                  {/* ذخیره‌کنندگان کاتالوگ (خواسته مالک ۱۰-۱۱ + بازنگری) —
                      آمار کلیک‌پذیر → مودال لیست؛ تماس/چت فقط برای صاحب کاتالوگ */}
                  <CatalogSaversBox sellerUserName={user.userName} />
                </div>

                <div className="rounded-md border bg-card p-5">
                  <h3 className="flex items-center gap-2 text-sm font-bold">
                    <Store size={15} className="text-(--catalog-accent)" />
                    توضیحات کسب و کار
                  </h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                    {user.businessDesc?.trim() || 'این فروشنده هنوز توضیحی برای کسب‌وکارش ننوشته است.'}
                  </p>
                  <dl className="mt-4 grid gap-2 border-t pt-4 text-xs sm:grid-cols-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin size={13} className="shrink-0 text-(--catalog-accent)/70" />
                      <dt className="shrink-0">شهر:</dt>
                      <dd className="font-bold text-foreground">{location || '—'}</dd>
                    </div>
                    {user.address?.trim() && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin size={13} className="shrink-0 text-(--catalog-accent)/70" />
                        <dt className="shrink-0">آدرس:</dt>
                        <dd className="truncate font-bold text-foreground" title={user.address}>{user.address}</dd>
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
                        <Store size={13} className="shrink-0 text-(--catalog-accent)/70" />
                        <dt className="shrink-0">صنف:</dt>
                        <dd className="truncate font-bold text-foreground" title={categoryLabel}>{categoryLabel}</dd>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Timer size={13} className="shrink-0 text-(--catalog-accent)/70" />
                      <dt className="shrink-0">سابقه فعالیت:</dt>
                      <dd className="font-bold text-foreground">{toFa(user.daysInImach ?? 1)} روز فعالیت</dd>
                    </div>
                    {/* احراز هویت آیمچ (خواستهٔ مالک ۱۰-۱۱ دور ۵) — گواهی اعتماد
                        ایمچ: تایید هویت و مدارک این فروشنده در ایمچ انجام شده؛
                        برندسازی ایمچ به‌عنوان ثبت‌کنندهٔ گواهی اعتماد */}
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <BadgeCheck size={13} className="shrink-0 text-(--catalog-accent)/70" />
                      <dt className="shrink-0">احراز هویت:</dt>
                      <dd className="font-bold text-foreground">
                        {user.isVerified ? 'تایید شده در آیمچ' : 'انجام نشده'}
                      </dd>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Send size={13} className="shrink-0 text-(--catalog-accent)/70" />
                      <dt className="shrink-0">احتمال پاسخگویی:</dt>
                      <dd className="font-bold text-foreground">
                        {user.responseRate != null ? `${toFa(user.responseRate)}٪` : '—'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </section>

            {/* محصولات — مهم‌ترین بخش کاتالوگ؛ لیست کالاها پیش از گالری/گواهی‌ها
                می‌آید (خواستهٔ مالک ۱۰-۱۱ دور ۵) */}
            <section id="products" aria-labelledby="products-title" className="scroll-mt-24">
              <h2 id="products-title" className="mb-3 text-base font-extrabold">
                محصولات ({toFa(user.productCount ?? products.length)})
              </h2>
              {products.length === 0 ? (
                <p className="rounded-md border bg-card p-10 text-center text-sm text-muted-foreground">
                  این فروشنده هنوز آگهی فعالی ثبت نکرده است.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
                  {products.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              )}
            </section>

            {/* ─── تصاویر و گواهی‌های کسب‌وکار — زیر لیست کالاها (خواستهٔ مالک
                ۱۰-۱۱ دور ۵): کالاها مهم‌ترند و اول دیده می‌شوند؛ گالری و
                گواهی‌ها پس از آن اعتبار فروشنده را کامل می‌کنند ─── */}
            {(gallery.length > 0 || certificates.length > 0) && (
              <section id="gallery" aria-labelledby="gallery-title" className="scroll-mt-24">
                <h2 id="gallery-title" className="mb-3 text-base font-extrabold">
                  تصاویر و گواهی‌های کسب و کار
                </h2>
                <div className="space-y-3">
                  {/* تصاویر مربوطه — عین باسکول (محصولات | شرکت | کارکنان) */}
                  {gallery.length > 0 && (
                    <div className="rounded-md border bg-card p-5">
                      <h3 className="flex items-center gap-2 text-sm font-bold">
                        <Camera size={15} className="text-(--catalog-accent)" />
                        تصاویر مربوطه
                      </h3>
                      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {gallery.map((g, i) => (
                          <a
                            key={`${g.url}-${i}`}
                            href={g.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative block aspect-square overflow-hidden rounded-md border bg-secondary"
                            title="مشاهده تصویر کامل"
                          >
                            { }
                            <img
                              src={g.thumbUrl ?? g.url}
                              alt={`تصویر مربوطه ${i + 1}`}
                              className="size-full object-cover transition-transform group-hover:scale-105"
                              loading="lazy"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* گواهی‌های مربوطه — ثبت شرکت | استاندارد محصول */}
                  {certificates.length > 0 && (
                    <div className="rounded-md border bg-card p-5">
                      <h3 className="flex items-center gap-2 text-sm font-bold">
                        <FileCheck2 size={15} className="text-(--catalog-accent)" />
                        گواهی های مربوطه
                      </h3>
                      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {certificates.map((c, i) => (
                          <a
                            key={`${c.url}-${i}`}
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative block aspect-square overflow-hidden rounded-md border bg-secondary"
                            title="مشاهده گواهی کامل"
                          >
                            { }
                            <img
                              src={c.thumbUrl ?? c.url}
                              alt={`گواهی ${i + 1}`}
                              className="size-full object-cover transition-transform group-hover:scale-105"
                              loading="lazy"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* نظرات کاربران */}
            <SellerReviews userName={user.userName} sellerName={sellerName} />
          </div>

          {/* سایدبار — کارت فروشنده + اشتراک‌گذاری + نکتهٔ خرید امن */}
          <aside className="space-y-4" aria-label="اطلاعات فروشنده">
            <div className="rounded-md border bg-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <Store size={15} className="text-(--catalog-accent)" />
                فروشنده {sellerName}
              </h2>
              {user.reviewSummary && user.reviewSummary.count > 0 && (
                <div className="mt-3 border-b pb-3">
                  <RatingStars value={user.reviewSummary.avg} size={14} showValue count={user.reviewSummary.count} />
                </div>
              )}
              <p className="mt-3 line-clamp-4 text-xs leading-6 text-muted-foreground">
                {user.businessDesc?.trim() || 'فروشنده عمده در بازار آنلاین.'}
              </p>
              <p className="mt-3 border-t pt-3 text-[11px] leading-5 text-muted-foreground">
                عضویت از{' '}
                {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(new Date(user.createdAt))}
              </p>
            </div>

            <ShareBox path={sharePath} />

            <div className="space-y-2 rounded-md border bg-secondary/50 p-5">
              <p className="flex items-center gap-2 text-sm font-bold">
                <ShieldAlert size={16} />
                نکتهٔ خرید امن
              </p>
              <p className="text-[11px] leading-6 text-muted-foreground">
                همواره به انجام معاملات حضوری است.
              </p>
            </div>
          </aside>
        </div>
      </main>
      {/* ─── امضای iMach (خواسته مالک ۱۰-۱۱ + بازنگری) — تنها اثر ایمچ در
          صفحهٔ کاتالوگ کاربر: فوتر بزرگ ایمچ حذف شد و فقط «ساخته شده با
          ایمچ» ماند که به صفحهٔ ایمچ لینک می‌شود (جذب کاربر جدید) ─── */}
      <footer className="border-t bg-card/60 py-8 text-center">
        <Link
          href="/"
          className="group inline-flex flex-col items-center gap-1.5"
          aria-label="ساخته شده با iMach — فروشگاه و کاتالوگ آنلاین رایگان"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-xs font-bold shadow-sm transition-colors group-hover:border-primary/40 group-hover:text-primary">
            <Zap size={13} className="text-primary" />
            ساخته شده با iMach
          </span>
          <span className="text-[10.5px] text-muted-foreground">
            کاتالوگ آنلاین رایگان برای کسب‌وکار شما — iMach.ir
          </span>
        </Link>
      </footer>
    </div>
  );
}
