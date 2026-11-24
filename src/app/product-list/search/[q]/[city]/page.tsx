import type { Metadata } from 'next';
import { CitySearchScreen } from '@/components/products/search-screen';
import { searchPath, stripSearchNoise } from '@/lib/popular-searches';
import { normalizeQuery } from '@/lib/search-log';
import { resolveCityByName } from '@/lib/city-resolver';

/**
 * صفحهٔ فرود شهری سئو — /product-list/search/{کالا}/{شهر}
 *
 * خواستهٔ مالک ۱-۱۱ (دور جدید): «تک تک شهرها با تک تک دسته ها … اینطوری ما
 * می‌تونیم به مرجع عمده خرید در شهرها تبدیل بشیم». هر عبارت شهریِ جهان
 * جستجو (خرید عمده برنج در تهران) به همین‌جا لینک می‌شود:
 *
 *  · نتایج واقعاً با city_id همان شهر فیلتر می‌شوند (SSR) — محتوای متفاوت؛
 *  · h1/عنوان/توضیحات اختصاصی با نام کالا + شهر — کلیدواژهٔ کامل؛
 *  · کنونیکال خودارجاع (آدرس شهر مستقل از صفحهٔ کشوری ایندکس می‌شود)؛
 *  · ISR مثل صفحهٔ کشوری (revalidate ۳۰۰ ثانیه) — مسیر-محور، بدون searchParams
 *    تا رندر ایستا و کرال‌پذیری حفظ شود؛
 *  · صفحه‌های ۲ به بعد از [pageno] (خواستهٔ مالک ۱۴-۱۱ — ایندکس هر پیج جدا).
 *
 * شهر ناشناخته → 404 (جلوگیری از URL های جعلی)؛ عبارت شنی → ریدایرکت ۳۰۸
 * به آدرس هسته‌ای همان شهر.
 */
export const revalidate = 300;

interface Props {
  params: Promise<{ q: string; city: string }>;
}

/** پارامتر مسیر ممکن است کدشده یا پیش‌تر دیکدشده برسد — هر دو پشتیبانی می‌شود */
function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { q: rawQ, city: rawCity } = await params;
  const clean = normalizeQuery(safeDecode(rawQ));
  const cityName = safeDecode(rawCity);
  const city = await resolveCityByName(cityName);
  if (!clean || !city) return { title: 'جستجو در ایمچ' };
  const title = `خرید عمده ${clean} در ${city.name} | قیمت روز فروش عمده — ایمچ`;
  return {
    title,
    description: `خرید عمده و فروش عمده ${clean} در ${city.name} با قیمت روز از تولیدکنندگان و فروشندگان ${city.name}؛ لیست آگهی‌ها، مقایسه قیمت و ارتباط مستقیم با تامین‌کننده در بازار عمده ایمچ.`,
    alternates: { canonical: `${searchPath(clean)}/${encodeURIComponent(city.name)}` },
    openGraph: {
      title,
      description: `آگهی‌های فروش عمده ${clean} در ${city.name}`,
      type: 'website',
    },
  };
}

export default async function CitySearchPage({ params }: Props) {
  const { q, city } = await params;
  return <CitySearchScreen rawQ={q} rawCity={city} page={1} />;
}
