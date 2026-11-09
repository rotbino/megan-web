/**
 * رجیستری بازارهای شهری ایمچ — /city/{slug} (خواستهٔ مالک ۹-۱۱ دور جدید).
 *
 * هر شهر بزرگ ایران یک «بازار عمده» اختصاصی دارد (مثل باسکول/دیوار):
 *   imach.ir/city/tehran → بازار عمده تهران (نتایج واقعاً فیلترشده با city_id)
 *
 * اصول:
 *  · اسلاگ لاتین فقط برای شهرهای بزرگ (تمیز و سئو-پسند — خواستهٔ مالک:
 *    «شهرهای بزرگتر و مهمتر اول لیست»)؛ ترتیب = اهمیت/جمعیت؛
 *  · بقیهٔ شهرهای دیتابیس هم صفحه دارند — با نام فارسیِ کدشده در URL؛
 *  · هیچ شهری خارج از دیتابیس بک‌اند صفحه ندارد (resolve → 404) —
 *    «همه چیز باید از دیتابیس بیاد» (خواستهٔ مالک)؛ نام نمایشی همیشه
 *    نام رسمی دیتابیس است، نه املاای این رجیستری؛
 *  · رزولوشن از طریق city-resolver (نرمال‌سازی نیم‌فاصله/ی عربی/…) —
 *    «بندرعباس» و «بندر عباس» یکی‌اند.
 */

import { resolveCityByName, type ResolvedCity } from './city-resolver';

/** یک شهر بزرگ رجیستری — slug لاتین + نام فارسی مرجع */
export interface MajorCity {
  slug: string;
  name: string;
}

/** شهرهای بزرگ به ترتیب اهمیت (جمعیت/حجم مبادله عمده) — الگوی «شهرهای پربازدید» دیوار */
export const MAJOR_CITIES: readonly MajorCity[] = [
  { slug: 'tehran', name: 'تهران' },
  { slug: 'mashhad', name: 'مشهد' },
  { slug: 'isfahan', name: 'اصفهان' },
  { slug: 'karaj', name: 'کرج' },
  { slug: 'shiraz', name: 'شیراز' },
  { slug: 'tabriz', name: 'تبریز' },
  { slug: 'qom', name: 'قم' },
  { slug: 'ahvaz', name: 'اهواز' },
  { slug: 'kermanshah', name: 'کرمانشاه' },
  { slug: 'urmia', name: 'ارومیه' },
  { slug: 'rasht', name: 'رشت' },
  { slug: 'zahedan', name: 'زاهدان' },
  { slug: 'hamedan', name: 'همدان' },
  { slug: 'kerman', name: 'کرمان' },
  { slug: 'yazd', name: 'یزد' },
  { slug: 'ardabil', name: 'اردبیل' },
  { slug: 'bandarabbas', name: 'بندرعباس' },
  { slug: 'arak', name: 'اراک' },
  { slug: 'sari', name: 'ساری' },
  { slug: 'sanandaj', name: 'سنندج' },
  { slug: 'bushehr', name: 'بوشهر' },
  { slug: 'gorgan', name: 'گرگان' },
  { slug: 'khorramabad', name: 'خرم آباد' },
  { slug: 'zanjan', name: 'زنجان' },
  { slug: 'qazvin', name: 'قزوین' },
  { slug: 'semnan', name: 'سمنان' },
  { slug: 'birjand', name: 'بیرجند' },
  { slug: 'ilam', name: 'ایلام' },
  { slug: 'yasuj', name: 'یاسوج' },
  { slug: 'bojnord', name: 'بجنورد' },
  { slug: 'shahrekord', name: 'شهرکرد' },
];

/** کلید یکتای مقایسه — عین cityKey رزولور (بدون فاصله/نیم‌فاصله) */
function nameKey(name: string): string {
  return name
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/\u200c/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/** نام (با هر املا) → اسلاگ لاتین شهرهای بزرگ — Map یک‌بار در هر پروسه */
const slugIndex: Map<string, string> = new Map(
  MAJOR_CITIES.map((c) => [nameKey(c.name), c.slug]),
);

/** اسلاگ لاتین → نام رسمی رجیستری — برای رزولوشن /city/tehran */
const slugToName: Map<string, string> = new Map(
  MAJOR_CITIES.map((c) => [c.slug, c.name]),
);

/** آدرس صفحهٔ بازار یک شهر — بزرگ‌ها با اسلاگ لاتین، بقیه با نام فارسی کدشده */
export function cityMarketHref(cityName: string): string {
  const slug = slugIndex.get(nameKey(cityName));
  return slug ? `/city/${slug}` : `/city/${encodeURIComponent(cityName)}`;
}

/** اسلاگ لاتین یک شهر (اگر بزرگ باشد) — برای canonical و لینک‌دهی */
export function majorSlugOf(cityName: string): string | null {
  return slugIndex.get(nameKey(cityName)) ?? null;
}

/** بازار شهری رزولوشده — شهر واقعی دیتابیس + اسلاگ لاتین (اگر بزرگ باشد) */
export interface MarketCity extends ResolvedCity {
  /** اسلاگ لاتین — فقط شهرهای بزرگ رجیستری؛ بقیه null (URL فارسی) */
  slug: string | null;
}

/** پارامتر مسیر ممکن است کدشده یا پیش‌تر دیکدشده برسد — هر دو پشتیبانی می‌شود */
function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

/**
 * رزولوشن slug مسیر → بازار شهری دیتابیس.
 *  · «tehran» → اسلاگ رجیستری → نام → id دیتابیس؛
 *  · «%D9%87%D9%85%D8%AF%D8%A7%D9%86» (همدان) → هر شهر دیتابیس؛
 *  · خارج از دیتابیس → null (فراخواننده notFound می‌کند).
 */
export async function resolveMarketCity(rawSlug: string): Promise<MarketCity | null> {
  const decoded = safeDecode(rawSlug).trim();
  if (!decoded) return null;
  // اسلاگ لاتین شهر بزرگ؟ (به حروف کوچک نرمال — /city/Tehran هم رزولو می‌شود)
  const majorName = slugToName.get(decoded.toLowerCase()) ?? null;
  // شهر بزرگ → نام رسمی رجیستری وارد رزولور؛ بقیه → خودِ نام کدشده
  const city = await resolveCityByName(majorName ?? decoded);
  if (!city) return null;
  // اسلاگ برمی‌گردد از روی نام دیتابیس (نه مسیر) تا کنونیکال همیشه یکتا باشد
  return { ...city, slug: majorSlugOf(city.name) };
}

/** شهر بزرگِ رزولوشده — برای باکس صفحه اول، دایرکتوری و لینک‌های سئو */
export interface ResolvedMajorCity {
  slug: string;
  name: string; // نام رسمی دیتابیس (نمایش)
  id: number;
  provinceId: number;
}

/**
 * شهرهای بزرگِ موجود در دیتابیس — به ترتیب اهمیت رجیستری.
 * رزولور کل شهرها را یک‌بار در هر پروسه memo می‌کند؛ این حلقه فقط Map.get است.
 * بک‌اند در دسترس نیست → [] (باکس/دایرکتوری مخفی می‌شود، صفحه سالم می‌ماند).
 */
export async function listMajorCities(): Promise<ResolvedMajorCity[]> {
  const out: ResolvedMajorCity[] = [];
  for (const c of MAJOR_CITIES) {
    const city = await resolveCityByName(c.name);
    if (city) out.push({ slug: c.slug, name: city.name, id: city.id, provinceId: city.provinceId });
  }
  return out;
}

// ─── دایرکتوری همهٔ شهرها (/city) — گروه‌بندی استانی از دیتابیس ─────────────

import { serverPost } from './api/client';

/** یک استان با شهرهایش — برای صفحهٔ دایرکتوری */
export interface ProvinceCities {
  provinceId: number;
  provinceName: string;
  cities: Array<{ id: number; name: string; href: string; major: boolean }>;
}

/** اولویت شهر بزرگ در رجیستری — بزرگ‌ترین = 0؛ غیر بزرگ = Infinity */
function majorRank(name: string): number {
  const idx = MAJOR_CITIES.findIndex((c) => nameKey(c.name) === nameKey(name));
  return idx === -1 ? Number.POSITIVE_INFINITY : idx;
}

/**
 * مقایسه‌گر شهرهای یک استان برای فهرست «شهرهای استان» بازار شهری —
 * شهرهای بزرگ اول (به ترتیب اهمیت رجیستری)، بعد بقیه الفبایی فارسی.
 */
export function compareProvinceCities(
  a: { name: string },
  b: { name: string },
): number {
  return majorRank(a.name) - majorRank(b.name) || a.name.localeCompare(b.name, 'fa');
}

/**
 * همهٔ استان‌ها و شهرهای دیتابیس، گروه‌بندی‌شده برای دایرکتوری «همه شهرها».
 *  · ترتیب استان‌ها: استانِ شهرِ مهم‌تر اول (استان تهران اول، بعد البرز و…)؛
 *  · ترتیب شهرها: شهرهای بزرگ اول (اهمیت)، بعد بقیه الفبایی؛
 *  · هر شهر (حتی غیر بزرگ) لینک صفحهٔ بازار خودش را دارد — نام فارسی کدشده.
 * بک‌اند در دسترس نیست → [] (صفحه با پیام خالی رندر می‌شود).
 */
export async function listProvincesWithCities(revalidate = 3600): Promise<ProvinceCities[]> {
  try {
    const [provinces, cities] = await Promise.all([
      serverPost<Array<{ id: number; province_name: string }>>(
        '/locations/getAllProvinces',
        {},
        revalidate,
      ),
      serverPost<Array<{ id: number; province_id: number | null; city_name: string }>>(
        '/locations/getCitiesByProvince',
        {},
        revalidate,
      ),
    ]);
    if (!Array.isArray(provinces) || !Array.isArray(cities)) return [];

    const majorSet = new Map(MAJOR_CITIES.map((c) => [nameKey(c.name), c.slug]));
    const groups = new Map<number, ProvinceCities>();
    for (const p of provinces) {
      if (!p || !p.id || !p.province_name) continue;
      groups.set(p.id, { provinceId: p.id, provinceName: p.province_name, cities: [] });
    }
    for (const c of cities) {
      if (!c || !c.id || !c.city_name || c.province_id == null) continue;
      const g = groups.get(c.province_id);
      if (!g) continue;
      const slug = majorSet.get(nameKey(c.city_name));
      g.cities.push({
        id: c.id,
        name: c.city_name,
        href: slug ? `/city/${slug}` : `/city/${encodeURIComponent(c.city_name)}`,
        major: slug != null,
      });
    }

    const out = [...groups.values()].filter((g) => g.cities.length > 0);
    for (const g of out) {
      g.cities.sort((a, b) => majorRank(a.name) - majorRank(b.name) || a.name.localeCompare(b.name, 'fa'));
    }
    // استانِ مهم‌ترین شهرش اول — تهران (۰) قبل از البرز (کرج = ۳) و…
    out.sort(
      (a, b) =>
        Math.min(...a.cities.map((c) => majorRank(c.name))) -
        Math.min(...b.cities.map((c) => majorRank(c.name))),
    );
    return out;
  } catch {
    return [];
  }
}
