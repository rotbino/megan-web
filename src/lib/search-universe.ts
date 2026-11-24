/**
 * جهان جستجوهای سئو — منبع دادهٔ صفحه /searches و سایت‌مپ (خواستهٔ مالک).
 *
 * هدف: هر نود برگِ دسته‌ها (برنج، سیب زمینی، پنیر، …) با همهٔ ترکیب‌های
 * معنایی جستجوی گوگل ضرب می‌شود:
 *
 *   {خرید|فروش} × {—|عمده} × {—|نوع کالا} × {—|در شهر}
 *
 *   فروش برنج · فروش عمده برنج · فروش برنج در همدان · فروش عمده برنج در همدان
 *   فروش برنج هاشمی · فروش عمده برنج هاشمی · فروش عمده برنج هاشمی در همدان …
 *
 * نتیجه: ده‌ها هزار عبارتِ یکتا با لینک به صفحات فرود کنونیکال
 * (/product-list/search/{کالا}[ {نوع}]) — خزندهٔ گوگل از صفحه /searches
 * (صفحه‌بندی‌شده) همه را ایندکس می‌کند و متن لینک (anchor) همان عبارت
 * جستجوی کاربر است.
 *
 * شمارش پایه (برندینگ): عددی «متناسب» بین ۱۰٬۰۰۰ تا ۱۰۰٬۰۰۰ — متناسب با
 * محبوبیت واقعی دسته (فیلد score در دیتابیس) و با ضریب‌های واقع‌گرایانه:
 * عبارت کلی‌تر بیشتر جستجو می‌شود؛ اضافه‌شدن شهر/نوع کالا آن را کم می‌کند.
 * کاملاً قطعی (deterministic) — بین رندرها و ری‌استارت‌ها ثابت می‌ماند.
 * رویدادهای واقعی (ورودی گوگل / جستجوی داخلی) در زمان نمایش روی آن جمع
 * می‌شوند (جدول‌های واقعی در lib/search-log.ts).
 *
 * ماژول خالص است (فقط وابستگی به popular-searches) تا هم سمت سرور و هم
 * تست‌پذیر باشد؛ fetch دسته‌ها جدا و memo-شده انجام می‌شود.
 */

import { searchPath, stripSearchNoise } from './popular-searches';

/**
 * شهرهای مبادلۀ عمده ایران — مراکز ۳۱ استان (خواستهٔ مالک ۱-۱۱ دور جدید:
 * «تک تک شهرها با تک تک دسته ها» — ضرب‌ها به هزاران هزار می‌رسد و ایمچ
 * مرجع عمده خرید در شهرها می‌شود). هر شهر یک صفحهٔ فرود اختصاصی دارد:
 * /product-list/search/{کالا}/{شهر} که نتایج واقعاً با همان شهر فیلتر می‌شوند.
 */
export const SEED_CITIES: readonly string[] = [
  'تهران',
  'کرج',
  'اصفهان',
  'شیراز',
  'تبریز',
  'ارومیه',
  'زنجان',
  'اردبیل',
  'قزوین',
  'سمنان',
  'مشهد',
  'بجنورد',
  'بیرجند',
  'گرگان',
  'ساری',
  'رشت',
  'همدان',
  'کرمانشاه',
  'خرم آباد',
  'ایلام',
  'یزد',
  'کرمان',
  'زاهدان',
  'اهواز',
  'بندرعباس',
  'قم',
  'اراک',
  'سنندج',
  'شهرکرد',
  'بوشهر',
  'یاسوج',
];

/**
 * انواع پرکاربرد کالاهای شاخص بازار عمده ایران — عمقِ long-tail سئو
 * (خواستهٔ مالک: «فروش برنج هاشمی»، «فروش عمده برنج هاشمی در همدان»).
 * مثالِ خود دسته از دیتابیس هم به همین‌ها اضافه می‌شود؛ انواع هر کالا با
 * قواعد cleanVariety پاکسازی می‌شوند.
 */
const EXTRA_VARIETIES: Record<string, readonly string[]> = {
  برنج: ['طارم', 'هاشمی', 'فجر', 'شلیل'],
  خرما: ['مضافتی', 'کبکاب', 'زاهدی', 'پیارم'],
  پسته: ['فندقی', 'اکبری', 'کله‌قوچی', 'احمدآقایی'],
  سیب: ['قرمز', 'سبز', 'گلاب'],
  زعفران: ['سرگل', 'نگین', 'پوشال'],
  کشمش: ['سبز', 'تیزابی', 'آفتابی'],
  بادام: ['منقا', 'ربی', 'مامایی', 'کاغذی'],
  گردو: ['کاغذی', 'چاندلر', 'جمال'],
  'سیب زمینی': ['آگریا', 'مارفونا', 'سانته'],
  پیاز: ['زرد', 'قرمز', 'سفید'],
  'گوجه فرنگی': ['گلخانه‌ای', 'دشتی'],
  پرتقال: ['تامسون', 'والنسیا'],
  لوبیا: ['چیتی', 'سرخ', 'صیفی', 'گلبری'],
  زرشک: ['پاکوته', 'دامغانی', 'قائنات'],
  انار: ['ملس', 'ترش', 'شیرین'],
  انگور: ['بی‌دانه', 'عسکری', 'شاهرودی'],
  هندوانه: ['بی‌دانه', 'یک‌کیلویی'],
};

export type SearchIntent = 'خرید' | 'فروش';

/** یک عبارت جستجوی ساخته‌شده از جهان سئو */
export interface SearchPhrase {
  /** متن کامل عبارت — همان چیزی که کاربر گوگل تایپ می‌کند (anchor text) */
  phrase: string;
  /** عبارت هسته‌ای مقصد لینک — «برنج» یا «برنج هاشمی» */
  core: string;
  intent: SearchIntent;
  /** نوع کالا (مثالِ همان دسته) — null یعنی بدون نوع */
  variety: string | null;
  /** شهر — null یعنی بدون شهر (صفحهٔ فرود کشوری) */
  city: string | null;
  /** نام دستهٔ ریشه (برای فیلتر دسته‌بندی) */
  rootCategory: string;
  /** نام نود برگ (کالا) */
  leaf: string;
  /** شمارش پایهٔ برندینگ [۱۰k..۱۰۰k] — بدون رویدادهای واقعی */
  count: number;
}

/**
 * مقصد لینک یک عبارت — عبارت‌های شهری به صفحهٔ فرود اختصاصی همان شهر
 * می‌روند (نتایج واقعاً فیلترشده؛ کنونیکال مستقل) و بقیه به صفحهٔ هسته‌ای.
 */
export function phraseUrl(p: Pick<SearchPhrase, 'core' | 'city'>): string {
  const base = searchPath(p.core);
  return p.city ? `${base}/${encodeURIComponent(p.city)}` : base;
}

/** نود برگ دسته — ورودی ساخت جهان (از API بک‌اند flatten می‌شود) */
export interface LeafCategory {
  id: number;
  name: string;
  /** مثال/نوع کالای همان دسته — مثل «هاشمی» برای برنج */
  example?: string;
  /** محبوبیت واقعی دسته در دیتابیس (0..~17k) */
  score: number;
  /** نام دستهٔ ریشه */
  root: string;
}

/** فیلترهای صفحه /searches — همه اختیاری */
export interface UniverseFilters {
  /** دستهٔ ریشه */
  root?: string;
  /** شهر مشخص */
  city?: string;
  /** نوع خرید/فروش */
  intent?: SearchIntent;
  /** جستجوی آزاد در نوع کالا / نام کالا / خود عبارت */
  q?: string;
}

// ─── شمارش قطعی (deterministic) ──────────────────────────────────────────────

/** مرجع نرمال‌سازی امتیاز — بالای بیشینهٔ فعلی دیتابیس (~۱۷.۳k) */
const SCORE_REF = 18_000;

/** هش FNV-1a ۳۲ بیتی — پایدار بین پروسه‌ها (بر خلاف Math.random) */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** ضریب واقع‌گرایانهٔ جستجو — عبارت خاص‌تر = جستجوی کمتر (عمده همیشه هست) */
function modifier(variety: boolean, city: boolean): number {
  return (variety ? 0.5 : 1) * (city ? 0.38 : 1);
}

/**
 * شمارش پایهٔ برندینگ یک عبارت — همیشه در [۱۰٬۰۰۰ .. ۱۰۰٬۰۰۰]:
 *  امتیاز بالای دسته → عدد بزرگ‌تر (متناسب با بازار واقعی کالا)؛
 *  نوع/شهر عدد را به‌صورت نسبی کم می‌کنند؛ جیترِ قطعی ±۱۰٪ از یکنواخت
 *  شدن جلوگیری می‌کند. گرد به ۱۰۰ تا «طبیعی» دیده شود.
 */
export function baseCountFor(
  phrase: string,
  score: number,
  variety: boolean,
  city: boolean,
): number {
  const t = Math.min(1, Math.max(0, score / SCORE_REF));
  const head = 10_000 + 90_000 * Math.sqrt(t); // [۱۰k..۱۰۰k]
  const jitter = 0.9 + 0.2 * (fnv1a(phrase) / 0xffff_ffff);
  const value = 10_000 + (head - 10_000) * modifier(variety, city) * jitter;
  return Math.round(Math.min(100_000, Math.max(10_000, value)) / 100) * 100;
}

// ─── ساخت عبارت‌ها ────────────────────────────────────────────────────────────

/**
 * نوع کالای پاک‌شده برای ساخت عبارت — null یعنی این دسته عبارتِ «با نوع»
 * ندارد. قواعد: مثال باید بعد از stripSearchNoise دست‌نخورده بماند (مثل
 * «درجه یک» که واژه‌های عمومی دارد رد می‌شود)، با نام خود کالا تکرار نشود و
 * بیش از یک حرف باشد. اگر مثال خودش نام کالا را دربردارد («کشک گاوی» برای
 * کشک) همان جایگزین نام کالا می‌شود تا «کشک کشک گاوی» ساخته نشود.
 */
function cleanVariety(leafName: string, example?: string): { variety: string; core: string } | null {
  if (!example) return null;
  // نیم‌فاصله → فاصله (مثل stripSearchNoise) تا مقایسه برابر باشد
  const norm = example.replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim();
  if (norm.length < 2 || norm === leafName) return null;
  const stripped = stripSearchNoise(norm);
  // واژه‌های تجاری/مکانی در مثال بود → نوع کالای معتبری برای سئو نیست
  if (!stripped || stripped !== norm) return null;
  // «کشک گاوی» شامل «کشک» است → هسته همان مثال است
  if (norm.includes(leafName)) return { variety: norm, core: norm };
  return { variety: norm, core: `${leafName} ${norm}` };
}

/** ترکیب متن عبارت: {نیت} عمده {کالا/نوع} [در {شهر}] — «عمده» همیشه هست (خواستهٔ مالک) */
function composePhrase(
  intent: SearchIntent,
  productName: string,
  city: string | null,
): string {
  const parts = [intent, 'عمده', productName, city ? `در ${city}` : ''];
  return parts.filter(Boolean).join(' ');
}

/**
 * ساخت کل جهان جستجو از نودهای برگ — خروجی مرتب‌شده بر اساس شمارش پایه
 * (نزولی) و سپس الفبایی؛ قطعی و پایدار برای صفحه‌بندی.
 * همهٔ عبارت‌ها «عمده» دارند — «خرید برنج» بدون عمده اصلاً ساخته نمی‌شود
 * (خواستهٔ مالک: «تمام اینها باید کلمه عمده رو داشته باشند»).
 */
export function buildSearchUniverse(leaves: LeafCategory[]): SearchPhrase[] {
  const out: SearchPhrase[] = [];
  const seen = new Set<string>();

  for (const leaf of leaves) {
    // انواع کالا: مثالِ دیتابیس + انواع شاخصِ برگذاشته‌شده (بدون تکرار)
    const varietySources = new Set<string>();
    if (leaf.example) varietySources.add(leaf.example);
    for (const v of EXTRA_VARIETIES[leaf.name] ?? []) varietySources.add(v);
    const varieties = [...varietySources]
      .map((v) => cleanVariety(leaf.name, v))
      .filter((v): v is { variety: string; core: string } => v !== null);

    // «نام‌های محصول»: تنها (برنج) + هر نوع (برنج هاشمی / کشک گاوی)
    const productNames: Array<{ name: string; variety: string | null; core: string }> = [
      { name: leaf.name, variety: null, core: leaf.name },
    ];
    for (const v of varieties) productNames.push({ name: v.core, variety: v.variety, core: v.core });

    for (const p of productNames) {
      for (const intent of ['خرید', 'فروش'] as const) {
        const cityOptions: Array<string | null> = [null, ...SEED_CITIES];
        for (const city of cityOptions) {
          const phrase = composePhrase(intent, p.name, city);
          if (seen.has(phrase)) continue; // امنیت یکتایی (برگ‌های هم‌نام)
          seen.add(phrase);
          out.push({
            phrase,
            core: p.core,
            intent,
            variety: p.variety,
            city,
            rootCategory: leaf.root,
            leaf: leaf.name,
            count: baseCountFor(phrase, leaf.score, !!p.variety, !!city),
          });
        }
      }
    }
  }

  out.sort((a, b) => b.count - a.count || (a.phrase < b.phrase ? -1 : a.phrase > b.phrase ? 1 : 0));
  return out;
}

/** اعمال فیلترها — خروجی آرایهٔ جدید با همان ترتیب مرتب‌شده */
export function filterUniverse(universe: SearchPhrase[], f: UniverseFilters): SearchPhrase[] {
  const q = f.q?.trim();
  return universe.filter((p) => {
    if (f.root && p.rootCategory !== f.root) return false;
    if (f.city && p.city !== f.city) return false;
    if (f.intent && p.intent !== f.intent) return false;
    if (q && !(p.variety?.includes(q) || p.leaf.includes(q) || p.phrase.includes(q))) return false;
    return true;
  });
}

/** اندازهٔ صفحهٔ پیش‌فرض لیست /searches */
export const SEARCH_PAGE_SIZE = 100;

/** برش صفحه — page از ۱ شروع می‌شود و همیشه داخل محدوده قفل می‌شود */
export function paginate<T>(list: T[], page: number, size = SEARCH_PAGE_SIZE): { items: T[]; page: number; pageCount: number } {
  const pageCount = Math.max(1, Math.ceil(list.length / size));
  const safePage = Math.min(Math.max(1, Math.floor(page || 1)), pageCount);
  return { items: list.slice((safePage - 1) * size, safePage * size), page: safePage, pageCount };
}

// ─── دادهٔ زندهٔ بک‌اند + memo پروسه ─────────────────────────────────────────

import { apiBase, joinUrl } from './api/client';

interface RawCategoryNode {
  id: number;
  category_name: string;
  slug: string;
  score: number;
  example?: string;
  children?: RawCategoryNode[];
}

/** برگ‌های درخت دسته‌ها از بک‌اند (زنده) — با نام دستهٔ ریشه */
export async function getCategoryLeaves(): Promise<LeafCategory[]> {
  try {
    const res = await fetch(joinUrl(apiBase(), '/categories/getAllCategories'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      next: { revalidate: 3600 },
    });
    const json = (await res.json()) as { status: boolean; data?: RawCategoryNode[] };
    if (!json?.status || !Array.isArray(json.data)) return [];

    const leaves: LeafCategory[] = [];
    const walk = (nodes: RawCategoryNode[], root: string) => {
      for (const n of nodes) {
        if (n.children?.length) walk(n.children, root);
        else
          leaves.push({
            id: n.id,
            name: n.category_name.replace(/\s+/g, ' ').trim(),
            example: typeof n.example === 'string' ? n.example : undefined,
            score: Number(n.score) || 0,
            root,
          });
      }
    };
    // نام «دستهٔ ریشه» برای فیلتر دسته‌بندی — خودِ نود سطح یک
    for (const root of json.data) {
      walk([root], root.category_name.replace(/\s+/g, ' ').trim());
    }
    return leaves.filter((l) => l.name.length > 0 && l.root.length > 0);
  } catch {
    return []; // بک‌اند در دسترس نیست — صفحه با لیست خالی رندر می‌شود
  }
}

/** Universe cache per process: کلید = تعداد برگ‌ها + جمع idها (تغییر دیتا → بازسازی) */
let universeCache: { key: string; universe: SearchPhrase[] } | null = null;

/** جهان جستجو — fetch زنده + ساخت یک‌بار در هر پروسه (سریع برای هر ریکوئست) */
export async function getSearchUniverse(): Promise<SearchPhrase[]> {
  const leaves = await getCategoryLeaves();
  const key = `${leaves.length}:${leaves.reduce((a, l) => a + l.id, 0)}`;
  if (universeCache?.key === key) return universeCache.universe;
  const universe = buildSearchUniverse(leaves);
  universeCache = { key, universe };
  return universe;
}

// ─── لینک‌های داخلی صفحات فرود (خواستهٔ مالک: «در صفحه برنج لینک‌های برنج») ───

/** یک لینک داخلی سئو — متن anchor + مقصد */
export interface LandingLink {
  phrase: string;
  url: string;
}

export interface LandingLinks {
  /** خرید/فروش عمده {کالا} در {شهر} — صفحات فرود شهری (نتایج فیلترشده) */
  cityLinks: LandingLink[];
  /** خرید/فروش عمده {کالا} {نوع} — صفحات فرود انواع کالا */
  varietyLinks: LandingLink[];
}

/**
 * لینک‌های داخلی صفحهٔ فرود یک کالا — «از این جدول در صفحات مربوطه
 * استفاده کنیم» (خواستهٔ مالک): روی صفحهٔ برنج، لینک‌های برنج×شهرها و
 * برنج×انواع به‌صورت HTML خالص سرور-رندر می‌شوند تا گوگل با اولین کرال
 * شبکهٔ داخلی هزاران صفحهٔ شهری را ببیند و ایندکس کند.
 *
 *  core = «برنج» → شهرهای برنج + انواع برنج (هاشمی، …)
 *  core = «برنج هاشمی» → شهرهای همین نوع + انواع هم‌گروه (برادرهای برنج)
 *  excludeCity = «تهران» (وقتی خودمان روی صفحهٔ تهران هستیم)
 */
export function getLandingLinks(
  universe: SearchPhrase[],
  core: string,
  excludeCity?: string,
): LandingLinks {
  const cityLinks: LandingLink[] = [];
  const varietyLinks: LandingLink[] = [];
  const seenCity = new Set<string>();
  const seenVariety = new Set<string>();

  // برگِ این هسته — «برنج هاشمی» → برنج (برای یافتن انواع هم‌گروه)
  let leaf: string | null = null;
  for (const p of universe) {
    if (p.core === core) {
      leaf = p.leaf;
      break;
    }
  }

  for (const p of universe) {
    // لینک‌های شهری همان هسته — ترتیب طبیعی جهان (بیشترین جستجو اول)
    if (p.core === core && p.city && p.city !== excludeCity) {
      const key = `${p.intent}|${p.city}`;
      if (seenCity.has(key)) continue;
      seenCity.add(key);
      cityLinks.push({ phrase: p.phrase, url: phraseUrl(p) });
    }
    // انواع هم‌گروه (خرید عمده برنج طارم…) — خودِ هسته نمی‌شود
    if (leaf && p.leaf === leaf && p.variety && p.core !== core) {
      const key = `${p.intent}|${p.core}`;
      if (seenVariety.has(key)) continue;
      seenVariety.add(key);
      varietyLinks.push({ phrase: p.phrase, url: phraseUrl(p) });
    }
  }

  return { cityLinks, varietyLinks };
}
