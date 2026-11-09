import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, Store } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ProductListing } from '@/components/products/product-listing';
import { CategoryFilter } from '@/components/products/category-filter';
import { ProductImage } from '@/components/shared/product-image';
import { PremiumSellerBadge } from '@/components/shared/badges';
import { JsonLd } from '@/components/shared/json-ld';
import { getCategoryTreeSSR, getProductsSSR, getProvincesSSR } from '@/lib/mock/api';
import type { Product } from '@/lib/types';
import { listMajorCities, resolveMarketCity } from '@/lib/city-markets';
import { toFa } from '@/lib/format';
import { SITE_URL } from '@/lib/site';

/**
 * بازار عمده شهری — /city/{slug} (خواستهٔ مالک ۹-۱۱ دور جدید).
 *
 * هر شهر یک بازار اختصاصی دارد که از همان دیتای واحد سایت تغذیه می‌شود
 * («لنز شهری»، نه سایت جدا): آگهی‌ها واقعاً با city_id همان شهر فیلتر
 * می‌شوند و همهٔ امکانات لیست کشوری (فیلتر، جستجو، دسته‌ها، صفحه‌بندی)
 * در دسترس است — کاربر هر وقت خواست فیلتر شهر را بردارد (لنز نه قفسه).
 *
 *  · اسلاگ لاتین شهرهای بزرگ (/city/tehran) + نام فارسی بقیهٔ شهرهای
 *    دیتابیس؛ شهر خارج از دیتابیس → 404؛
 *  · «فروشندگان ویژه {شهر}» — جایگاه‌های تبلیغاتی اشتراک‌دارهای همان
 *    شهر (خواستهٔ مالک) از دیتای واقعی آگهی‌ها استخراج می‌شوند؛
 *  · شهر خالی → fallback استان (thin-content نمی‌ماند)؛
 *  · ISR مثل صفحات فرود (revalidate ۳۰۰ ثانیه) + JSON-LD + لینک‌های
 *    داخلی به بازار بقیهٔ شهرها (شبکهٔ سئو بین همهٔ صفحات شهری).
 */
export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

/** آدرس کنونیکال بازار — اسلاگ لاتین شهرهای بزرگ، نام فارسی کدشدهٔ بقیه */
function marketCanonical(city: { slug: string | null; name: string }): string {
  return city.slug ? `/city/${city.slug}` : `/city/${encodeURIComponent(city.name)}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const city = await resolveMarketCity(slug);
  if (!city) return { title: 'بازار عمده شهر' };
  // قالب layout خودش «| ایمچ» اضافه می‌کند — بدون پسوند اینجا
  const title = `بازار عمده ${city.name} | خرید و فروش عمده در ${city.name}`;
  return {
    title,
    description: `بازار عمده ${city.name} — خرید و فروش عمده مستقیم از فروشندگان، تولیدکنندگان و شرکت‌های پخش ${city.name}؛ لیست آگهی‌ها، قیمت روز و ارتباط بی‌واسطه با تامین‌کننده در ایمچ.`,
    alternates: { canonical: marketCanonical(city) },
    openGraph: {
      title,
      description: `آگهی‌های فروش عمده در ${city.name}`,
      type: 'website',
    },
  };
}

// ─── فروشندگان ویژه — از دیتای واقعی آگهی‌های شهر ──────────────────────────

const VIP_SCAN_LIMIT = 100;
const VIP_RAIL_SIZE = 10;

interface VipSeller {
  userName: string;
  name: string;
  product: Product;
}

/** اشتراک‌دارهای ویژهٔ همان شهر از دل آگهی‌های واقعی — «همه چیز از دیتابیس» */
function extractVipSellers(items: Product[] | undefined, limit = VIP_RAIL_SIZE): VipSeller[] {
  if (!items) return [];
  const seen = new Set<string>();
  const out: VipSeller[] = [];
  for (const p of items) {
    const s = p.seller;
    if (!s?.userName || !(s.activePakageType > 0) || seen.has(s.userName)) continue;
    seen.add(s.userName);
    out.push({
      userName: s.userName,
      name: `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() || s.userName,
      product: p,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export default async function CityMarketPage({ params }: Props) {
  const { slug } = await params;
  const city = await resolveMarketCity(slug);
  if (!city) notFound();

  // دیتای شهر — همهٔ فراخوانی‌ها موازی و مستقل (خرابی یکی بقیه را نمی‌اندازد)
  const [cityList, vipScan, tree, provinces, majors] = await Promise.all([
    getProductsSSR({ cityId: city.id, sort: 'related' }, 300),
    getProductsSSR({ cityId: city.id, sort: 'related', pageSize: VIP_SCAN_LIMIT }, 300),
    getCategoryTreeSSR(3600),
    getProvincesSSR(3600),
    listMajorCities(),
  ]);

  const hasCityListings = !!cityList && cityList.total > 0;
  // شهر خالی → آگهی‌های استان (fallback) تا صفحه thin/خالی نماند
  const provinceList = hasCityListings
    ? null
    : await getProductsSSR({ provinceId: city.provinceId, sort: 'related' }, 300);
  const activeList = hasCityListings ? cityList : provinceList;

  const provinceName =
    provinces?.find((p) => p.id === city.provinceId)?.name ??
    cityList?.items[0]?.provinceName ??
    activeList?.items[0]?.provinceName ??
    '';
  const vips = extractVipSellers(vipScan?.items);
  const others = majors.filter(
    (m) => m.id !== city.id && m.name !== city.name,
  );

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* ---------- هیرو مینیمال: هویت بازار + آمار واقعی ---------- */}
        <div className="mx-auto max-w-7xl px-4 pt-4 lg:px-6 lg:pt-6">
          <div className="rounded-lg border border-border/70 bg-card p-4 shadow-sm lg:p-5">
            <h1 className="text-lg font-extrabold lg:text-2xl">بازار عمده {city.name}</h1>
            <p className="mt-1.5 max-w-3xl text-xs leading-6 text-muted-foreground lg:text-sm">
              خرید و فروش عمده مستقیم از فروشندگان، تولیدکنندگان و شرکت‌های پخش {city.name}؛
              قیمت‌ها را مقایسه کنید و بدون واسطه با تامین‌کنندهٔ همساختان در تماس باشید.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {hasCityListings && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-secondary-foreground">
                  {toFa(cityList.total)} آگهی فعال در {city.name}
                </span>
              )}
              {provinceName && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-secondary-foreground">
                  <MapPin size={12} />
                  استان {provinceName}
                </span>
              )}
              {vips.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-secondary-foreground">
                  {vips.length >= VIP_RAIL_SIZE
                    ? `${toFa(VIP_RAIL_SIZE)}+ فروشنده ویژه`
                    : `${toFa(vips.length)} فروشنده ویژه`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ---------- ریل فروشندگان ویژهٔ شهر (جایگاه‌های تبلیغاتی) ---------- */}
        {vips.length > 0 && (
          <section aria-labelledby="vip-sellers" className="mx-auto max-w-7xl px-4 pt-6 lg:px-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="vip-sellers" className="text-base font-medium leading-7 lg:text-xl">
                فروشندگان ویژه {city.name}
              </h2>
              <Link
                href="/panel/pricing"
                className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80 lg:text-sm"
              >
                <Store size={15} />
                جایگاه ویژه در این بازار
              </Link>
            </div>
            <div className="scroll-row">
              {vips.map((v) => (
                <Link
                  key={v.userName}
                  href={`/profile/${v.userName}`}
                  title={v.name}
                  className="w-[132px] shrink-0 overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md nav-desktop:w-40"
                >
                  <div className="relative aspect-square">
                    <ProductImage
                      photos={v.product.photos}
                      thumbs={v.product.photoThumbs}
                      alt={v.name}
                      className="object-cover"
                      iconSize={32}
                    />
                  </div>
                  <div className="p-2">
                    <h3 className="line-clamp-1 text-xs font-bold leading-5">{v.name}</h3>
                    <div className="mt-1">
                      <PremiumSellerBadge />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ---------- لیست آگهی‌ها — لنز شهری (یا fallback استان) ---------- */}
        {!hasCityListings && (
          <div className="mx-auto max-w-7xl px-4 pt-6 lg:px-6">
            <div className="rounded-lg border border-dashed bg-card p-4 text-xs leading-6 text-muted-foreground lg:text-sm">
              هنوز در {city.name} آگهی عمده‌ای ثبت نشده است — آگهی‌های
              {provinceName ? ` استان ${provinceName}` : ' اطراف'} را می‌بینید. اگر فروشنده یا
              شرکت پخش در {city.name} هستید،{' '}
              <Link href="/panel/pricing" className="font-medium text-primary hover:underline">
                با ثبت آگهی
              </Link>{' '}
              اولین فروشندهٔ این بازار شوید.
            </div>
          </div>
        )}
        <ProductListing
          initialData={activeList ?? undefined}
          sidebar={tree && tree.length > 0 ? <CategoryFilter tree={tree} /> : undefined}
          initialProvinceId={city.provinceId}
          initialCityId={hasCityListings ? city.id : undefined}
        />

        {/* ---------- لینک‌های داخلی سئو: بازار بقیهٔ شهرها ---------- */}
        {others.length > 0 && (
          <section
            aria-label="بازار عمده شهرهای دیگر"
            className="mx-auto max-w-7xl px-4 pb-8 pt-6 lg:px-6"
          >
            <div className="rounded-lg border bg-card p-4 lg:p-5">
              <h2 className="flex items-center gap-1.5 text-sm font-bold">
                <MapPin size={15} className="text-primary" />
                بازار عمده شهرهای دیگر
              </h2>
              <nav aria-label="بازار عمده شهرهای ایران" className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                {others.map((m) => (
                  <Link
                    key={m.slug}
                    href={`/city/${m.slug}`}
                    className="rounded px-1.5 py-1 text-[12.5px] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                  >
                    بازار عمده {m.name}
                  </Link>
                ))}
              </nav>
            </div>
          </section>
        )}
      </main>
      <Footer />
      {activeList && activeList.items.length > 0 && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `آگهی‌های فروش عمده در ${city.name}`,
            numberOfItems: activeList.total,
            itemListElement: activeList.items.slice(0, 20).map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `${SITE_URL}/product-view/${p.slug}/${p.categoryName}/${p.id}`,
              name: p.productName,
            })),
          }}
        />
      )}
    </>
  );
}
