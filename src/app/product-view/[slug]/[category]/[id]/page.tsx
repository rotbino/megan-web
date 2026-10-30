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
  Share2,
  ShieldAlert,
  Store,
  User,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { JsonLd } from '@/components/shared/json-ld';
import { ProductImage } from '@/components/shared/product-image';
import { ProductPrice } from '@/components/shared/product-price';
import { PhoneReveal } from '@/components/shared/phone-reveal';
import { LadderBadge, OldAdBadge } from '@/components/shared/badges';
import { SaveProductButton } from '@/components/shared/save-product-button';
import { ProductViewPing } from '@/components/shared/product-view-ping';
import { ChatDialog } from '@/components/products/chat-dialog';
import { RelatedProducts } from '@/components/products/related-products';
import { SellerRatingBadge } from '@/components/products/seller-rating-badge';
import { SellerOnlineBadge } from '@/components/products/seller-online-badge';
import { MobileContactBar } from '@/components/products/mobile-contact-bar';
import { ArrowLeftIcon } from '@/components/shared/buskool-icons';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { stockFa, toFa } from '@/lib/format';
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
      isLadder: boolean; hasVideo: boolean; isOld: boolean; viewCount: number;
      createdAt: string; updatedAt: string; photos: string[]; photoThumbs?: string[];
    };
    return {
      ...p,
      isElevated: false,
      photoThumbs: p.photoThumbs ?? p.photos,
      seller: { ...p.seller, activePakageType: 0 },
    } as Product;
  } catch {
    // بک‌اند در دسترس نیست — دیتای ماک وجود ندارد؛ صفحه ۴۰۴ می‌شود
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, slug } = await params;
  const product = await getProduct(Number(id));
  if (!product) return { title: 'محصول یافت نشد' };
  const title = `خرید و قیمت ${product.productName} عمده | ${product.cityName.trim()} ${product.provinceName}`;
  return {
    title,
    description: `${title} — ${product.seller.firstName} ${product.seller.lastName} | ایمچ. موجودی ${stockFa(product.stock, product.unit)}، حداقل فروش ${stockFa(product.minSaleAmount, product.unit)}.`,
    alternates: { canonical: `/product-view/${slug}/${product.categoryName}/${product.id}` },
    openGraph: { title, type: 'website' },
  };
}

export default async function ProductViewPage({ params }: Props) {
  const { slug, id } = await params;
  const product = await getProduct(Number(id));
  if (!product) notFound();

  const info = [
    { icon: User, label: 'نام فروشنده', value: `${product.seller.firstName} ${product.seller.lastName}` },
    { icon: MapPin, label: 'آدرس', value: `${product.provinceName} — ${product.cityName.trim()}` },
    { icon: Package, label: 'میزان موجودی', value: stockFa(product.stock, product.unit) },
    { icon: BadgeCheck, label: 'حداقل میزان فروش', value: stockFa(product.minSaleAmount, product.unit) },
  ] as const;

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
                  alt={product.productName}
                  className="object-cover"
                  iconSize={96}
                  priority
                  sizes="(max-width: 640px) 100vw, 420px"
                />
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
                <div className="flex flex-wrap items-center gap-2">
                  {product.isLadder && <LadderBadge />}
                  {product.isOld && <OldAdBadge />}
                </div>
                <h1 className="text-xl font-bold leading-8 sm:text-2xl">
                  {product.productName}
                </h1>

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

                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye size={13} /> {toFa(product.viewCount)} بازدید
                  </p>
                  <SaveProductButton productId={product.id} />
                </div>
                <p className="flex items-center justify-end text-xs text-muted-foreground">
                  <Share2 size={13} /> اشتراک‌گذاری آگهی
                </p>
              </div>
            </div>

            {/* توضیحات */}
            <section aria-labelledby="desc" className="rounded-md border bg-card p-5">
              <h2 id="desc" className="mb-3 text-base font-bold">توضیحات محصول</h2>
              <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
                {product.description}
              </p>
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
                  <p className="flex min-w-0 items-center gap-2 font-bold">
                    <span className="truncate">{product.seller.firstName} {product.seller.lastName}</span>
                    <SellerOnlineBadge userName={product.seller.userName} sellerId={product.myuserId} />
                  </p>
                  <div className="mt-1 flex flex-col items-start gap-1">
                    {product.seller.isVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                        <BadgeCheck size={13} /> احراز هویت شده
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">بدون احراز هویت</span>
                    )}
                    <SellerRatingBadge userName={product.seller.userName} />
                  </div>
                </div>
              </div>
              <Separator className="my-4" />
              {/* تماس + چت — افقی کنار هم (مثل باسکول؛ گویاتر از عمودی) */}
              <div className="grid grid-cols-2 gap-2">
                <PhoneReveal
                  sellerName={`${product.seller.firstName} ${product.seller.lastName}`}
                  productId={product.id}
                >
                  <Button className="h-11 w-full rounded-md text-sm font-medium">
                    <Phone size={17} />
                    شماره تماس
                  </Button>
                </PhoneReveal>
                <ChatDialog
                  productId={product.id}
                  sellerUserName={product.seller.userName}
                  sellerId={product.myuserId}
                  sellerName={`${product.seller.firstName} ${product.seller.lastName}`}
                  productName={product.productName}
                  className="h-11 w-full rounded-md text-sm font-medium"
                />
              </div>
              <Button asChild variant="outline" className="mt-2 w-full rounded-md">
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

        <RelatedProducts product={product} />

        {/* جای نوار فیکس موبایل (۷۲px بالای نوار پایین ۵۹px) تا محتوا زیرش نماند */}
        <div className="h-[74px] nav-desktop:hidden" aria-hidden />
      </main>

      {/* نوار فیکس چت/تماس موبایل — عین باسکول (fix-send-message-wrapper) */}
      <MobileContactBar
        productId={product.id}
        sellerUserName={product.seller.userName}
        sellerId={product.myuserId}
        sellerName={`${product.seller.firstName} ${product.seller.lastName}`}
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
              item: `${SITE_URL}/product-view/${product.slug}/${product.categoryName}/${product.id}`,
            },
          ],
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.productName,
          description: product.description.slice(0, 200),
          category: product.subCategoryName,
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'IRT',
            lowPrice: product.minSalePrice ?? undefined,
            offerCount: 1,
            availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            seller: { '@type': 'Organization', name: `${product.seller.firstName} ${product.seller.lastName}` },
          },
        }}
      />
    </>
  );
}
