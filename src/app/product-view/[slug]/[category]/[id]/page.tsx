import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BadgeCheck,
  Eye,
  Home,
  MapPin,
  Package,
  Phone,
  ShieldAlert,
  Store,
  User,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { JsonLd } from '@/components/shared/json-ld';
import { ProductImage } from '@/components/shared/product-image';
import { GlassWatermark } from '@/components/shared/glass-watermark';
import { ProductPrice } from '@/components/shared/product-price';
import { PhoneReveal } from '@/components/shared/phone-reveal';
import { LadderBadge, OldAdBadge, PremiumSellerBadge } from '@/components/shared/badges';
import { MarkUserButton } from '@/components/shared/mark-user-sheet';
import { ProductViewPing } from '@/components/shared/product-view-ping';
import { ChatDialog } from '@/components/products/chat-dialog';
import { ShareButton } from '@/components/products/share-button';
import { ProductReviews } from '@/components/products/product-reviews';
import { SellerProductsRail } from '@/components/products/seller-products-rail';
import { SellerCtaBox } from '@/components/products/seller-cta-box';
import { SimilarProducts } from '@/components/products/similar-products';
import { RelatedSearches } from '@/components/products/related-searches';
import { SellerOnlineBadge } from '@/components/products/seller-online-badge';
import { SellerRatingBadge } from '@/components/products/seller-rating-badge';
import { MobileContactBar } from '@/components/products/mobile-contact-bar';
import { ArrowLeftIcon } from '@/components/shared/buskool-icons';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { stockFa, toFa, priceFa } from '@/lib/format';
import { apiBase, joinUrl } from '@/lib/api/client';
import { SITE_URL } from '@/lib/site';
import type { Product } from '@/lib/types';

interface Props {
  params: Promise<{ slug: string; category: string; id: string }>;
}

/** SSR — دیتای زنده از بک‌اند مگان (عمومی، بدون توکن).
 *  فالبک ماک حذف شد — آگهی فقط از دیتابیس واقعی می‌آید؛ نبود = ۴۰۴. */
async function getProduct(id: number): Promise<Product | null> {
  try {
    const res = await fetch(joinUrl(apiBase(), '/products/getProductById'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
      // ISR سبک: صفحه هر ۶۰ ثانیه بازتولید می‌شود (سرعت + تازگی)
      next: { revalidate: 60 },
    });
    const json = (await res.json()) as { status: boolean; data: Record<string, unknown> };
    if (!json?.status || !json.data) return null;
    const p = json.data as unknown as {
      id: number; productName: string; slug: string; description: string;
      stock: number; minSalePrice: number; minSaleAmount: number; unit: string;
      categoryId: number; categoryName: string; subCategoryId: number; subCategoryName: string;
      provinceId: number; provinceName: string; cityId: number; cityName: string;
      myuserId: string; seller: { id: string; userName: string; firstName: string; lastName: string; activePakageType: number; isVerified: boolean };
      isLadder: boolean; isElevated?: boolean; hasVideo: boolean; isOld: boolean; viewCount: number;
      createdAt: string; updatedAt: string; photos: string[]; photoThumbs?: string[];
    };
    return {
      ...p,
      isElevated: p.isElevated ?? false,
      photoThumbs: p.photoThumbs ?? p.photos,
      seller: { ...p.seller, activePakageType: p.seller.activePakageType ?? 0 },
    } as Product;
  } catch {
    // بک‌اند در دسترس نیست — دیتای ماک وجود ندارد؛ صفحه ۴۰۴ می‌شود
    return null;
  }
}

/** آدرس مطلق برای OG/JSON-LD — عکس‌های نسبی به دامنهٔ سایت وصل می‌شوند */
function absoluteUrl(url: string): string {
  if (url.startsWith('http')) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(Number(id));
  if (!product) return { title: 'محصول یافت نشد' };

  const city = product.cityName.trim();
  const sellerName = `${product.seller.firstName} ${product.seller.lastName}`.trim();
  // کنونیکال همیشه به آدرس رسمی (slug واقعی محصول) — ورودی شنی سیگنال‌ها را
  // روی همان URL جمع می‌کند (قانون سئو RULES.md §۴)
  const canonical = `/product-view/${product.slug}/${product.categoryName}/${product.id}`;
  // عنوان عمده‌محور (RULES.md §۴): فروش عمده {کالا} در {شهر} | قیمت عمده — ایمچ
  // (آگهی ثبت‌شده «فروش» است — خواسته مالک ۲-۱۱: «در عنوان آگهی‌های فروش
  // خرید زدی؛ باید بزنی فروش»؛ «خرید عمده» در توضیحات/کلیدواژه‌ها می‌ماند)
  // (قالب layout خودش « | ایمچ» می‌چسباند — اینجا تکرار نشود)
  const title = `فروش عمده ${product.productName} در ${city} | قیمت عمده ${product.subCategoryName}`;
  const description =
    `خرید عمده ${product.productName} از ${sellerName} در ${city}، ${product.provinceName}؛ ` +
    `موجودی ${stockFa(product.stock, product.unit)}، حداقل فروش ${stockFa(product.minSaleAmount, product.unit)}. ` +
    `قیمت روز ${product.subCategoryName} و تماس مستقیم با فروشنده در بازار عمده ایمچ.`;

  return {
    title,
    description,
    keywords: [
      `خرید عمده ${product.productName}`,
      `قیمت عمده ${product.productName}`,
      `فروش عمده ${product.productName}`,
      `خرید عمده ${product.subCategoryName} در ${city}`,
      `فروش عمده ${product.subCategoryName} در ${product.provinceName}`,
      `خرید عمده ${product.subCategoryName}`,
      `${sellerName}`,
      `${sellerName} ${city}`,
      'بازار عمده',
      'ایمچ',
    ],
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${SITE_URL}${canonical}`,
      siteName: 'ایمچ',
      images: product.photos.slice(0, 3).map((ph) => ({ url: absoluteUrl(ph) })),
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function ProductViewPage({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(Number(id));
  if (!product) notFound();

  const city = product.cityName.trim();
  const sellerName = `${product.seller.firstName} ${product.seller.lastName}`.trim();
  const productUrl = `/product-view/${product.slug}/${product.categoryName}/${product.id}`;

  const info = [
    { icon: User, label: 'نام فروشنده', value: sellerName },
    { icon: MapPin, label: 'آدرس', value: `${product.provinceName} — ${city}` },
    { icon: Package, label: 'میزان موجودی', value: stockFa(product.stock, product.unit) },
    { icon: BadgeCheck, label: 'حداقل میزان فروش', value: stockFa(product.minSaleAmount, product.unit) },
  ] as const;

  // پرسش‌های متداول — فقط از دیتای واقعی همین آگهی (سئو + شفافیت خریدار)
  const faqs = [
    {
      q: `قیمت عمده ${product.productName} چقدر است؟`,
      a: product.minSalePrice
        ? `کف قیمت هر ${product.unit} از ${priceFa(product.minSalePrice)} شروع می‌شود؛ قیمت نهایی توافقی است و برای مذاکرهٔ خرید عمده مستقیم با ${sellerName} تماس بگیرید.`
        : `قیمت توافقی است؛ برای اطلاع از قیمت روز ${product.productName} با ${sellerName} در ${city} تماس بگیرید.`,
    },
    {
      q: `حداقل میزان خرید عمده چقدر است؟`,
      a: `حداقل فروش این فروشنده در هر معامله ${stockFa(product.minSaleAmount, product.unit)} است و در حال حاضر ${stockFa(product.stock, product.unit)} موجودی آمادهٔ فروش دارد.`,
    },
    {
      q: `فروشنده کجاست و چطور با او در تماس شوم؟`,
      a: `${sellerName} در ${city}، استان ${product.provinceName} فعالیت دارد؛ از همین صفحه می‌توانید چت کنید یا با ثبت‌نام/ورود، شماره تماس را دریافت کنید.`,
    },
    {
      q: `چطور خودم آگهی فروش عمده ثبت کنم؟`,
      a: `ثبت آگهی فروش عمده در ایمچ رایگان است؛ با شماره موبایل وارد شوید، دسته و نوع کالا را انتخاب کنید و آگهی شما همان روز در معرض دید خریداران عمده قرار می‌گیرد.`,
    },
  ];

  return (
    <>
      <Header />
      <ProductViewPing productId={product.id} />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 pt-4 lg:px-6">
          {/* ─── نوار ناوبری بالا (بردکرامب) — عین باسکول ─── */}
          <nav aria-label="مسیر صفحه" className="no-scrollbar mb-3 flex h-9 items-center gap-1 overflow-x-auto text-[13px] md:text-sm">
            <Link
              href="/product-list"
              className="flex shrink-0 items-center gap-1 whitespace-nowrap text-muted-foreground hover:text-primary"
            >
              <Home size={15} className="shrink-0" />
              همه دسته ها
            </Link>
            <ArrowLeftIcon size={16} className="shrink-0 text-muted-foreground/60" />
            <Link
              href={`/product-list/category/${encodeURIComponent(product.categoryName)}`}
              className="shrink-0 whitespace-nowrap text-muted-foreground hover:text-primary"
            >
              {product.categoryName}
            </Link>
            <ArrowLeftIcon size={16} className="shrink-0 text-muted-foreground/60" />
            <Link
              href={`/product-list/category/${encodeURIComponent(product.subCategoryName)}`}
              className="shrink-0 whitespace-nowrap text-muted-foreground hover:text-primary"
            >
              {product.subCategoryName}
            </Link>
            <ArrowLeftIcon size={16} className="shrink-0 text-muted-foreground/60" />
            <span className="shrink-0 whitespace-nowrap font-bold text-foreground" aria-current="page">
              {product.productName}
            </span>
          </nav>
        </div>
        <div
          className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 pb-6 lg:grid-cols-[1fr_360px] lg:px-6"
        >
          {/* ستون اصلی */}
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-[minmax(0,420px)_1fr]">
              <div className="space-y-3">
              <div className="relative aspect-square w-full max-w-[420px] overflow-hidden rounded-md border">
                <ProductImage
                  photos={product.photos}
                  alt={`فروش عمده ${product.productName} در ${city}`}
                  className="object-cover"
                  iconSize={96}
                  priority
                  sizes="(max-width: 640px) 100vw, 420px"
                />
                {/* واترمارک شیشه‌ای لوگوی ایمچ (خواسته مالک ۳-۱۱) — ضد دزدی
                    تصویر؛ جایش هر بار کمی تغییر می‌کند و پشتش دیده می‌شود */}
                <GlassWatermark key={product.id} seed={product.id ? String(product.id) : undefined} />
                {/* نردبان روی گوشهٔ عکس (خواسته مالک ۱-۱۱ دور هفتم) — به‌جای
                    «فروشنده ویژه» که فقط کنار نام فروشنده می‌نشیند (بدون تکرار) */}
                {product.isLadder && (
                  <span className="absolute left-0 top-0">
                    <LadderBadge className="rounded-br-[6px] px-2.5 py-1.5 text-xs shadow-sm" />
                  </span>
                )}
                {product.hasVideo && (
                  <span className="absolute bottom-2 end-2 rounded-sm bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                    ویدیو دارد
                  </span>
                )}
              </div>
                {product.photos.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {product.photos.slice(0, 4).map((ph, i) => (
                      <div key={i} className="relative aspect-square overflow-hidden rounded-md border">
                        <ProductImage
                          photos={[ph]}
                          thumbs={product.photoThumbs ? [product.photoThumbs[i] ?? ph] : undefined}
                          alt={`${product.productName} — عکس ${toFa(i + 1)}`}
                          className="object-cover"
                          iconSize={20}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* عنوان آگهی فروش — «فروش عمده …» (خواسته مالک ۲-۱۱: خرید زدی؛
                    آگهی فروش است)؛ آیکون‌های اشتراک/نشان پایین‌تر کنار هم‌اند */}
                <h1 className="text-xl font-bold leading-8 sm:text-2xl">
                  فروش عمده {product.productName}
                </h1>
                {product.isOld && <OldAdBadge />}

                <ul className="grid gap-2.5 rounded-md border bg-card p-4 text-sm">
                  {info.map(({ icon: Icon, label, value }) => (
                    <li key={label} className="flex items-center gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-primary/10 text-primary">
                        <Icon size={15} />
                      </span>
                      <span className="text-muted-foreground">{label}:</span>
                      <span className="font-bold">{value}</span>
                    </li>
                  ))}
                </ul>

                <ProductPrice product={product} variant="page" />

                {/* بازدید + نشان کردن و اشتراک‌گذاری — دو آیکون بزرگ ۴۴px کنار هم
                    (خواسته مالک ۲-۱۱: اشتراک از رو‌به‌روی عنوان آمد کنار نشان؛
                    بزرگ‌تر و واضح‌تر — هدف لمسی RULES.md §۱) */}
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye size={13} /> {toFa(product.viewCount)} بازدید
                  </p>
                  <div className="flex items-center gap-2">
                    <ShareButton url={productUrl} title={`فروش عمده ${product.productName} در ${city}`} />
                    <MarkUserButton
                      variant="icon"
                      target={{
                        targetUserId: product.myuserId,
                        targetName: sellerName,
                        isVerified: product.seller.isVerified,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* توضیحات */}
            <section aria-labelledby="desc" className="rounded-md border bg-card p-5">
              <h2 id="desc" className="mb-3 text-base font-bold">توضیحات محصول</h2>
              <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
                {product.description}
              </p>
            </section>

            {/* پرسش‌های متداول — محتوای واقعی هم‌گام با JSON-LD (سئو) */}
            <section aria-labelledby="faq-title" className="rounded-md border bg-card p-5">
              <h2 id="faq-title" className="mb-3 text-base font-bold">
                پرسش‌های متداول خرید عمده {product.productName}
              </h2>
              <div className="divide-y divide-border/70">
                {faqs.map((f) => (
                  <details key={f.q} className="group py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-bold leading-6 marker:hidden">
                      {f.q}
                      <ArrowLeftIcon size={15} className="shrink-0 text-muted-foreground transition-transform group-open:-rotate-90" />
                    </summary>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>

          {/* سایدبار فروشنده */}
          <aside className="space-y-4" aria-label="اطلاعات فروشنده">
            <div className="rounded-md border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-md bg-primary/10 text-primary">
                  <Store size={22} />
                </span>
                <div className="min-w-0">
                  {/* «فروشنده ویژه» فقط همین‌جا — کنار نام (خواسته مالک: بدون تکرار روی عکس) */}
                  <p className="flex min-w-0 items-center gap-2 font-bold">
                    <span className="truncate">{sellerName}</span>
                    {product.isElevated && <PremiumSellerBadge className="shrink-0" />}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <SellerOnlineBadge userName={product.seller.userName} sellerId={product.myuserId} />
                  </div>
                  <div className="mt-1 flex flex-col items-start gap-1">
                    {product.seller.isVerified && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                        <BadgeCheck size={13} /> احراز هویت شده
                      </span>
                    )}
                    <SellerRatingBadge userName={product.seller.userName} />
                  </div>
                </div>
              </div>
              <Separator className="my-4" />
              {/* تماس + چت — افقی کنار هم؛ ارتفاع هر سه دکمهٔ کارت برابر h-11 (RULES.md §۱) */}
              <div className="grid grid-cols-2 gap-2">
                <PhoneReveal sellerName={sellerName} productId={product.id}>
                  <Button className="h-11 w-full rounded-md text-sm font-medium">
                    <Phone size={17} />
                    {/* موبایل: «تماس» (خواسته مالک) / دسکتاپ: «شماره تماس» */}
                    <span className="nav-desktop:hidden">تماس</span>
                    <span className="hidden nav-desktop:inline">شماره تماس</span>
                  </Button>
                </PhoneReveal>
                <ChatDialog
                  productId={product.id}
                  sellerUserName={product.seller.userName}
                  sellerId={product.myuserId}
                  sellerName={sellerName}
                  productName={product.productName}
                  className="h-11 w-full rounded-md text-sm font-medium"
                />
              </div>
              <Button asChild variant="outline" className="mt-2 h-11 w-full rounded-md">
                <Link href={`/profile/${product.seller.userName}`}>
                  <Store size={16} />
                  مشاهده پروفایل فروشنده
                </Link>
              </Button>
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                عضویت از {new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long' }).format(new Date(product.createdAt))}
              </p>
            </div>

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

        {/* ─── نظرات ۵ نظر آخر (اگر باشد) ─── */}
        <ProductReviews sellerUserName={product.seller.userName} sellerName={sellerName} />

        {/* ─── محصولات دیگر همین فروشنده — ریل خودگردان ─── */}
        <div className="pt-8">
          <SellerProductsRail
            sellerUserName={product.seller.userName}
            sellerName={sellerName}
            excludeId={product.id}
          />
        </div>

        {/* ─── دعوت به ثبت محصول (کاربران گوگل) ─── */}
        <div className="pt-8">
          <SellerCtaBox />
        </div>

        {/* ─── محصولات مشابه — گرید صفحه‌بندی‌شده ─── */}
        <div className="pt-8">
          <SimilarProducts product={product} />
        </div>

        {/* ─── جستجوهای مرتبط (کالا × شهر × فروشنده) ─── */}
        <div className="pt-8">
          <RelatedSearches
            productName={product.productName}
            subCategoryName={product.subCategoryName}
            cityName={city}
            sellerUserName={product.seller.userName}
            sellerName={sellerName}
          />
        </div>

        {/* جای نوار فیکس موبایل (۷۲px بالای نوار پایین ۵۹px) تا محتوا زیرش نماند */}
        <div className="h-[74px] nav-desktop:hidden" aria-hidden />
      </main>

      {/* نوار فیکس چت/تماس موبایل — عین باسکول (fix-send-message-wrapper) */}
      <MobileContactBar
        productId={product.id}
        sellerUserName={product.seller.userName}
        sellerId={product.myuserId}
        sellerName={sellerName}
        productName={product.productName}
      />

      <Footer />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'ایمچ', item: SITE_URL },
            {
              '@type': 'ListItem',
              position: 2,
              name: product.categoryName,
              item: `${SITE_URL}/product-list/category/${encodeURIComponent(product.categoryName)}`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: product.subCategoryName,
              item: `${SITE_URL}/product-list/category/${encodeURIComponent(product.subCategoryName)}`,
            },
            {
              '@type': 'ListItem',
              position: 4,
              name: product.productName,
              item: `${SITE_URL}${productUrl}`,
            },
          ],
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.productName,
          description: product.description.slice(0, 300),
          category: product.subCategoryName,
          image: product.photos.slice(0, 4).map(absoluteUrl),
          url: `${SITE_URL}${productUrl}`,
          sku: String(product.id),
          offers: {
            '@type': 'Offer',
            priceCurrency: 'IRT',
            price: product.minSalePrice ?? undefined,
            availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: `${SITE_URL}${productUrl}`,
            areaServed: `${city}، ${product.provinceName}`,
            seller: {
              '@type': 'Organization',
              name: sellerName,
              url: `${SITE_URL}/profile/${product.seller.userName}`,
            },
          },
        }}
      />
      {/* پرسش‌های متداول — دقیقاً هم‌گام با بخش دیدنی صفحه (قانون سئو) */}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />
    </>
  );
}
