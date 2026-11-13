import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CityMarketView, marketCanonical, parseCitiesParam } from '@/components/city/city-market-view';
import { resolveMarketCity } from '@/lib/city-markets';
import { parsePageNo, pageTitleSuffix } from '@/lib/pagination';

/**
 * صفحات ۲ به بعد بازار عمده شهری — /city/tehran/2 و… (خواستهٔ مالک ۱۴-۱۱):
 * هر پیج URL اختصاصی + کنونیکال/عنوان جدا برای ایندکس جداگانهٔ گوگل؛
 * صفحهٔ ۱ به‌صورت دائمی به آدرس تمیز بازار ریدایرکت می‌شود. تیک‌های چندشهری
 * (?cities=) اگر باشند همراه می‌مانند.
 */
export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string; pageno: string }>;
  searchParams: Promise<{ cities?: string | string[] }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, pageno } = await params;
  const n = parsePageNo(pageno) ?? 1;
  const city = await resolveMarketCity(slug);
  if (!city) return { title: 'بازار عمده شهر' };
  const title = pageTitleSuffix(`بازار عمده ${city.name} | خرید و فروش عمده در ${city.name}`, n);
  return {
    title,
    description: `بازار عمده ${city.name} — خرید و فروش عمده مستقیم از فروشندگان، تولیدکنندگان و شرکت‌های پخش ${city.name}؛ لیست آگهی‌ها، قیمت روز و ارتباط بی‌واسطه با تامین‌کننده در ایمچ.`,
    alternates: { canonical: n > 1 ? `${marketCanonical(city)}/${n}` : marketCanonical(city) },
    openGraph: {
      title,
      description: `آگهی‌های فروش عمده در ${city.name}`,
      type: 'website',
    },
  };
}

export default async function CityMarketPagedPage({ params, searchParams }: Props) {
  const { slug, pageno } = await params;
  const city = await resolveMarketCity(slug);
  if (!city) notFound();

  const n = parsePageNo(pageno);
  if (n === null) notFound();
  if (n === 1) permanentRedirect(marketCanonical(city)); // کنونیکال واحد

  // تیک‌های چندشهری از URL (?cities=102,103) — اعتبارسنجی در ویو
  const sp = await searchParams;
  const raw = Array.isArray(sp.cities) ? sp.cities.join(',') : sp.cities;
  const requestedCityIds = parseCitiesParam(raw);

  return (
    <>
      <Header />
      <main className="flex-1">
        <CityMarketView city={city} requestedCityIds={requestedCityIds} page={n} />
      </main>
      <Footer />
    </>
  );
}
