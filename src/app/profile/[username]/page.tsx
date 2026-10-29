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
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ProfileHero } from '@/components/products/profile-hero';
import { ProfileScrollNav } from '@/components/products/profile-scroll-nav';
import { SellerReviews } from '@/components/products/seller-reviews';
import { ProductCard } from '@/components/products/product-card';
import { ShareBox } from '@/components/shared/share-box';
import { RatingStars } from '@/components/shared/rating-stars';
import { apiBase } from '@/lib/api/client';
import { SITE_URL } from '@/lib/site';
import { stockFa, toFa } from '@/lib/format';
import type { Product } from '@/lib/types';

interface Props {
  params: Promise<{ username: string }>;
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
    publicPhone?: string | null;
    isCompany?: boolean;
    companyName?: string | null;
    gallery?: Array<{ url: string; thumbUrl: string }>;
    certificates?: Array<{ url: string; thumbUrl: string }>;
  };
  products: Product[];
}

/** SSR — فروشنده زنده از بک‌اند (غنی‌شده: مکان/آنلاین/نظرات/پاسخگویی).
 *  فالبک ماک حذف شد — پروفایل فقط با کاربر واقعی دیتابیس می‌آید؛ نبود = ۴۰۴. */
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const seller = await getSeller(decodeURIComponent(username));
  if (!seller) return { title: 'پروفایل یافت نشد' };
  const name = `${seller.user.firstName} ${seller.user.lastName}`.trim();
  const location = [seller.user.provinceName, seller.user.cityName].filter(Boolean).join('، ');
  return {
    title: `فروشگاه ${name} | پروفایل فروشنده ایمچ`,
    description: `${name}${location ? ` — ${location}` : ''} — ${(seller.user.businessDesc ?? '').slice(0, 120)}`,
    alternates: { canonical: `/profile/${seller.user.userName}` },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const seller = await getSeller(decodeURIComponent(username));
  if (!seller) notFound();
  const user = seller.user;
  const name = `${user.firstName} ${user.lastName}`.trim() || 'فروشنده ایمچ';
  const location = [user.provinceName, user.cityName].filter(Boolean).join('، ');
  const products = seller.products;
  const totalStock = user.totalStock ?? products.reduce((a, p) => a + p.stock, 0);
  const unit = products[0]?.unit ?? 'کیلوگرم';

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

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* ─── کارت یکپارچه هدر پروفایل — عین باسکول (cp-header-main-content) ───
            بنر + هویت فروشنده + نوار لینک بخش‌ها همه یک کارت‌اند؛
            بدون خط بالای نوار لینک‌ها و با سایه نرم از محتوای زیرین جدا می‌شود. */}
        <div className="mx-auto max-w-7xl px-4 pt-6 lg:px-6">
          <div className="overflow-hidden rounded-lg border bg-card shadow-[0_6px_20px_rgba(35,38,43,0.09)]">
            <ProfileHero
              user={user as unknown as Parameters<typeof ProfileHero>[0]['user']}
              shareUrl={`${SITE_URL}/profile/${user.userName}`}
            />
            <ProfileScrollNav productCount={user.productCount ?? products.length} />
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pt-6 pb-12 lg:grid-cols-[1fr_320px] lg:px-6">
          {/* ستون اصلی */}
          <div className="min-w-0 space-y-8">
            {/* درباره فروشنده */}
            <section id="about" aria-labelledby="about-title" className="scroll-mt-24">
              <h2 id="about-title" className="mb-3 text-base font-extrabold">درباره فروشنده</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2.5">
                  {stats.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="rounded-md border bg-card p-3 text-center sm:p-4">
                      <Icon size={18} className="mx-auto text-primary" />
                      <p className="mt-1.5 text-sm font-extrabold leading-6 sm:text-base">{value}</p>
                      <p className="mt-0.5 text-[10.5px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-md border bg-card p-5">
                  <h3 className="flex items-center gap-2 text-sm font-bold">
                    <Store size={15} className="text-primary" />
                    توضیحات کسب و کار
                  </h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                    {user.businessDesc?.trim() || 'این فروشنده هنوز توضیحی برای کسب‌وکارش ننوشته است.'}
                  </p>
                  <dl className="mt-4 grid gap-2 border-t pt-4 text-xs sm:grid-cols-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin size={13} className="shrink-0 text-primary/70" />
                      <dt className="shrink-0">شهر:</dt>
                      <dd className="font-bold text-foreground">{location || '—'}</dd>
                    </div>
                    {user.address?.trim() && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin size={13} className="shrink-0 text-primary/70" />
                        <dt className="shrink-0">آدرس:</dt>
                        <dd className="truncate font-bold text-foreground" title={user.address}>{user.address}</dd>
                      </div>
                    )}
                    {companyLabel && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Building2 size={13} className="shrink-0 text-primary/70" />
                        <dt className="shrink-0">شرکت:</dt>
                        <dd className="truncate font-bold text-foreground" title={companyLabel}>{companyLabel}</dd>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Timer size={13} className="shrink-0 text-primary/70" />
                      <dt className="shrink-0">عضویت:</dt>
                      <dd className="font-bold text-foreground">{toFa(user.daysInImach ?? 1)} روز در ایمچ</dd>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Send size={13} className="shrink-0 text-primary/70" />
                      <dt className="shrink-0">احتمال پاسخگویی:</dt>
                      <dd className="font-bold text-foreground">
                        {user.responseRate != null ? `${toFa(user.responseRate)}٪` : '—'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* تصاویر مربوطه — عین باسکول (محصولات | شرکت | کارکنان) */}
                {gallery.length > 0 && (
                  <div className="rounded-md border bg-card p-5">
                    <h3 className="flex items-center gap-2 text-sm font-bold">
                      <Camera size={15} className="text-primary" />
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
                          {/* eslint-disable-next-line @next/next/no-img-element */}
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
                      <FileCheck2 size={15} className="text-primary" />
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
                          {/* eslint-disable-next-line @next/next/no-img-element */}
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

            {/* محصولات */}
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

            {/* نظرات کاربران */}
            <SellerReviews userName={user.userName} sellerName={name} />
          </div>

          {/* سایدبار — کارت فروشنده + اشتراک‌گذاری + توصیه ایمچ */}
          <aside className="space-y-4" aria-label="اطلاعات فروشنده">
            <div className="rounded-md border bg-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <Store size={15} className="text-primary" />
                فروشنده {name}
              </h2>
              {user.reviewSummary && user.reviewSummary.count > 0 && (
                <div className="mt-3 border-b pb-3">
                  <RatingStars value={user.reviewSummary.avg} size={14} showValue count={user.reviewSummary.count} />
                </div>
              )}
              <p className="mt-3 line-clamp-4 text-xs leading-6 text-muted-foreground">
                {user.businessDesc?.trim() || 'فروشنده عمده در بازارگاه ایمچ.'}
              </p>
              <p className="mt-3 border-t pt-3 text-[11px] leading-5 text-muted-foreground">
                عضویت از{' '}
                {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(new Date(user.createdAt))}
              </p>
            </div>

            <ShareBox url={`${SITE_URL}/profile/${user.userName}`} />

            <div className="space-y-2 rounded-md border bg-secondary/50 p-5">
              <p className="flex items-center gap-2 text-sm font-bold">
                <ShieldAlert size={16} />
                توصیه ایمچ
              </p>
              <p className="text-[11px] leading-6 text-muted-foreground">
                همواره به انجام معاملات حضوری است.
              </p>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
