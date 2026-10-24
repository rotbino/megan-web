import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BadgeCheck,
  Eye,
  MapPin,
  Package,
  Share2,
  ShieldAlert,
  Store,
  User,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Breadcrumb } from '@/components/shared/breadcrumb';
import { JsonLd } from '@/components/shared/json-ld';
import { ProductImage } from '@/components/shared/product-image';
import { PriceReveal } from '@/components/shared/price-reveal';
import { LadderBadge, OldAdBadge } from '@/components/shared/badges';
import { ChatWidget } from '@/components/products/chat-widget';
import { RelatedProducts } from '@/components/products/related-products';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { products } from '@/lib/mock/data';
import { stockFa, toFa } from '@/lib/format';

interface Props {
  params: Promise<{ slug: string; category: string; id: string }>;
}

async function getProduct(id: number) {
  return products.find((p) => p.id === id) ?? null;
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
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 pt-6 lg:px-6">
          <Breadcrumb
            items={[
              { label: 'خانه', href: '/' },
              { label: product.categoryName, href: `/product-list/category/${product.categoryName}` },
              { label: product.subCategoryName, href: `/product-list/category/${product.subCategoryName}` },
              { label: product.productName },
            ]}
          />
        </div>

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-6 lg:grid-cols-[1fr_360px] lg:px-6">
          {/* ستون اصلی */}
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-[minmax(0,420px)_1fr]">
              <div className="space-y-3">
                <ProductImage
                  photos={product.photos}
                  alt={product.productName}
                  className="aspect-square w-full rounded-md border"
                  iconSize={96}
                />
                {product.photos.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {product.photos.slice(0, 4).map((ph, i) => (
                      <ProductImage
                        key={i}
                        photos={[ph]}
                        alt={`${product.productName} — عکس ${toFa(i + 1)}`}
                        className="aspect-square w-full rounded-md border"
                        iconSize={20}
                      />
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

                <PriceReveal product={product}>
                  <Button size="lg" className="w-full rounded-md text-base">
                    مشاهده قیمت
                  </Button>
                </PriceReveal>

                <p className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Eye size={13} /> {toFa(product.viewCount)} بازدید</span>
                  <span className="inline-flex items-center gap-1"><Share2 size={13} /> اشتراک‌گذاری آگهی</span>
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

            {/* چت با فروشنده */}
            <ChatWidget
              sellerName={`${product.seller.firstName} ${product.seller.lastName}`}
              productName={product.productName}
            />
          </div>

          {/* سایدبار فروشنده */}
          <aside className="space-y-4" aria-label="اطلاعات فروشنده">
            <div className="rounded-md border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-md bg-primary/10 text-primary">
                  <Store size={22} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-bold">{product.seller.firstName} {product.seller.lastName}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {product.seller.isVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                        <BadgeCheck size={13} /> احراز هویت شده
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">بدون احراز هویت</span>
                    )}
                  </div>
                </div>
              </div>
              <Separator className="my-4" />
              <Button asChild variant="outline" className="w-full rounded-md">
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
      </main>
      <Footer />
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
