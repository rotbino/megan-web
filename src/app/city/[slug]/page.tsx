import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CityMarketView, marketCanonical, parseCitiesParam } from '@/components/city/city-market-view';
import { resolveMarketCity } from '@/lib/city-markets';

/**
 * بازار عمده شهری — /city/{slug} (خواستهٔ مالک ۹-۱۱ دور جدید).
 *
 * هر شهر یک بازار اختصاصی دارد که ساختارش عین صفحهٔ فیلتر لیست ملی است،
 * فقط برای همان شهر اختصاصی شده:
 *  · فیلتر استان/شهر حذف شده — شهرِ صفحه ثابت و غیرقابل‌حذف است؛
 *  · به‌جایش «شهرهای استان» است: تیک چندشهری (پیش‌فرض فقط شهر خود صفحه)
 *    که در ?cities= پایدار می‌ماند — جستجو/دسته/صفحه‌بندی بعدی همان
 *    تیک‌ها را نگه می‌دارد تا خود کاربر بردارد؛
 *  · دیتا از سرویس جداگانهٔ /cityMarket/getProducts می‌آید (چندشهری،
 *    سریع) — سرویس عمومی سایت دست‌نخورده است؛
 *  · اسلاگ لاتین شهرهای بزرگ (/city/tehran) + نام فارسی کدشدهٔ بقیه؛
 *    شهر خارج از دیتابیس → 404؛
 *  · جایگاه تبلیغاتی/ریل ویژه نیست — کاربر ویژه و نردبان با سورت
 *    related بالاتر دیده می‌شوند، عین لیست ملی (خواستهٔ مالک)؛
 *  · ISR مثل صفحات فرود (revalidate ۳۰۰ ثانیه) + JSON-LD + شبکهٔ
 *    لینک‌های سئو به بازار بقیهٔ شهرها.
 */
export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cities?: string | string[] }>;
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

export default async function CityMarketPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const city = await resolveMarketCity(slug);
  if (!city) notFound();

  // تیک‌های چندشهری از URL (?cities=102,103) — اعتبارسنجی در ویو
  const sp = await searchParams;
  const raw = Array.isArray(sp.cities) ? sp.cities.join(',') : sp.cities;
  const requestedCityIds = parseCitiesParam(raw);

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* صفحهٔ ۱ — آدرس تمیز بازار؛ صفحه‌های بعدی از [pageno] (۱۴-۱۱) */}
        <CityMarketView city={city} requestedCityIds={requestedCityIds} page={1} />
      </main>
      <Footer />
    </>
  );
}
