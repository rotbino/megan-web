/**
 * بک‌اند ماک موقت برای تست «بازار عمده شهری» (/city/*) در سندباکس
 * (پس از تست سرور را ببندید). فقط اندپوینت‌های لازم برای صفحهٔ اول +
 * دایرکتوری شهرها + صفحهٔ بازار شهری را جواب می‌دهد؛ بقیه با
 * {status:true,data:{}} — الگوی scripts/mock-backend-pricing.mjs.
 *
 * اجرا:  node scripts/mock-backend-city.mjs   → http://127.0.0.1:4000
 *
 * سناریوهای تست پوشش‌داده‌شده:
 *  · شهر پرمخاطب (تهران): ۱۰ آگهی + چندشهری با شهریار/ورامین (تیک استان)؛
 *  · شهر با آگهی ولی بدون ویژه (مشهد/شیراز/تبریز/رشت) → بدون ریل VIP؛
 *  · شهر خالی (ملایر) → حالت خالی + تیک شهرهای دیگر استان (تویسرکان/همدان)؛
 *  · شهرهای غیر بزرگ با URL فارسی (/city/ملایر)؛
 *  · سورت related = نردبان ← ویژه ← آپدیت (مثل توضیح getRelatedProducts)؛
 *  · سرویس جداگانۀ بازار شهری /cityMarket/getProducts — چندشهری با Set
 *    (سرویس اصلی /products/getProductList دست‌نخورده می‌ماند — خواستهٔ مالک).
 */
import http from 'node:http';

const ok = (data) => ({ status: true, data });

// ─── لوکیشن‌ها — استان‌ها و شهرها (شامل شهرهای بزرگ + غیر بزرگ) ─────────────
const PROVINCES = [
  { id: 1, province_name: 'تهران' },
  { id: 2, province_name: 'البرز' },
  { id: 3, province_name: 'اصفهان' },
  { id: 4, province_name: 'خراسان رضوی' },
  { id: 5, province_name: 'فارس' },
  { id: 6, province_name: 'آذربایجان شرقی' },
  { id: 7, province_name: 'همدان' },
  { id: 8, province_name: 'خوزستان' },
  { id: 9, province_name: 'کرمانشاه' },
  { id: 10, province_name: 'گیلان' },
  { id: 11, province_name: 'یزد' },
  { id: 12, province_name: 'کرمان' },
];

const CITIES = [
  { id: 101, province_id: 1, city_name: 'تهران' },
  { id: 102, province_id: 1, city_name: 'شهریار' },
  { id: 103, province_id: 1, city_name: 'ورامین' },
  { id: 104, province_id: 2, city_name: 'کرج' },
  { id: 105, province_id: 2, city_name: 'نظرآباد' },
  { id: 106, province_id: 3, city_name: 'اصفهان' },
  { id: 107, province_id: 3, city_name: 'کاشان' },
  { id: 108, province_id: 3, city_name: 'نجف آباد' },
  { id: 109, province_id: 4, city_name: 'مشهد' },
  { id: 110, province_id: 4, city_name: 'سبزوار' },
  { id: 111, province_id: 5, city_name: 'شیراز' },
  { id: 112, province_id: 5, city_name: 'جهرم' },
  { id: 113, province_id: 6, city_name: 'تبریز' },
  { id: 114, province_id: 6, city_name: 'مراغه' },
  { id: 115, province_id: 7, city_name: 'همدان' },
  { id: 116, province_id: 7, city_name: 'ملایر' },
  { id: 117, province_id: 7, city_name: 'تویسرکان' },
  { id: 118, province_id: 8, city_name: 'اهواز' },
  { id: 119, province_id: 8, city_name: 'آبادان' },
  { id: 120, province_id: 9, city_name: 'کرمانشاه' },
  { id: 121, province_id: 9, city_name: 'اسلام آباد غرب' },
  { id: 122, province_id: 10, city_name: 'رشت' },
  { id: 123, province_id: 10, city_name: 'بندر انزلی' },
  { id: 124, province_id: 11, city_name: 'یزد' },
  { id: 125, province_id: 11, city_name: 'میبد' },
  { id: 126, province_id: 12, city_name: 'کرمان' },
  { id: 127, province_id: 12, city_name: 'رفسنجان' },
];

// ─── دسته‌ها — درخت دو ریشه با برگ‌های واقعی بازار عمده ─────────────────────
const CATEGORIES = [
  {
    id: 76, category_name: 'خواربار و مواد غذایی', slug: 'food', unit: 'کیلوگرم', min: 100,
    example: null, parent_id: null, score: 17000,
    children: [
      { id: 1, category_name: 'برنج', slug: 'berenge', unit: 'کیلوگرم', min: 100, example: 'هاشمی', parent_id: 76, score: 16000 },
      { id: 2, category_name: 'روغن', slug: 'roghan', unit: 'عدد', min: 24, example: 'سرخ کردنی', parent_id: 76, score: 9000 },
      { id: 3, category_name: 'خرما', slug: 'khorma', unit: 'کیلوگرم', min: 50, example: 'مضافتی', parent_id: 76, score: 8000 },
    ],
  },
  {
    id: 77, category_name: 'میوه و سبزیجات', slug: 'agriculture', unit: 'کیلوگرم', min: 100,
    example: null, parent_id: null, score: 12000,
    children: [
      { id: 4, category_name: 'سیب', slug: 'sib', unit: 'کیلوگرم', min: 100, example: 'قرمز', parent_id: 77, score: 11000 },
      { id: 5, category_name: 'سیب زمینی', slug: 'sib-zamini', unit: 'کیلوگرم', min: 500, example: 'آگریا', parent_id: 77, score: 9500 },
      { id: 6, category_name: 'پیاز', slug: 'piyaz', unit: 'کیلوگرم', min: 500, example: 'زرد', parent_id: 77, score: 9000 },
    ],
  },
];

const LEAVES = CATEGORIES.flatMap((r) => r.children.map((c) => ({ ...c, root: r })));

// ─── فروشندگان — ترکیب ویژه/رایگان در شهرهای مختلف ─────────────────────────
const SELLERS = {
  'reza-mohammadi': { id: 'u1', userName: 'reza-mohammadi', firstName: 'رضا', lastName: 'محمدی', activePakageType: 3, isVerified: true },
  'akbar-hassani': { id: 'u2', userName: 'akbar-hassani', firstName: 'اکبر', lastName: 'حسنی', activePakageType: 2, isVerified: true },
  'parviz-karimi': { id: 'u3', userName: 'parviz-karimi', firstName: 'پرویز', lastName: 'کریمی', activePakageType: 0, isVerified: false },
  'maryam-ahmadi': { id: 'u4', userName: 'maryam-ahmadi', firstName: 'مریم', lastName: 'احمدی', activePakageType: 1, isVerified: true },
  'hosein-razavi': { id: 'u5', userName: 'hosein-razavi', firstName: 'حسین', lastName: 'رضوی', activePakageType: 0, isVerified: true },
  'ali-esfahani': { id: 'u6', userName: 'ali-esfahani', firstName: 'علی', lastName: 'اصفهانی', activePakageType: 2, isVerified: true },
  'sadegh-shirazi': { id: 'u7', userName: 'sadegh-shirazi', firstName: 'صادق', lastName: 'شیرازی', activePakageType: 0, isVerified: false },
  'javad-hamedani': { id: 'u8', userName: 'javad-hamedani', firstName: 'جواد', lastName: 'همدانی', activePakageType: 1, isVerified: true },
  'kaveh-tabrizi': { id: 'u9', userName: 'kaveh-tabrizi', firstName: 'کاوه', lastName: 'تبریزی', activePakageType: 0, isVerified: true },
  'mahmud-ahvazi': { id: 'u10', userName: 'mahmud-ahvazi', firstName: 'محمود', lastName: 'اهوازی', activePakageType: 3, isVerified: true },
  'naser-rashti': { id: 'u11', userName: 'naser-rashti', firstName: 'ناصر', lastName: 'رشتی', activePakageType: 0, isVerified: false },
  'yaser-yazdi': { id: 'u12', userName: 'yaser-yazdi', firstName: 'یاسر', lastName: 'یزدی', activePakageType: 2, isVerified: true },
};

// ─── محصولات — [نام، slug برگ، cityId، فروشنده، نردبان، قیمت، موجودی] ────────
const PRODUCT_ROWS = [
  ['برنج هاشمی درجه یک', 'berenge', 101, 'reza-mohammadi', true, 148_000, 12_000],
  ['برنج طارم فجر', 'berenge', 101, 'akbar-hassani', false, 132_000, 8_500],
  ['روغن سرخ کردنی ۱.۸ لیتری', 'roghan', 101, 'reza-mohammadi', false, 96_000, 3_200],
  ['روغن مایع پالم', 'roghan', 101, 'parviz-karimi', false, 88_000, 5_600],
  ['خرمای مضافتی بسته ۵ کیلویی', 'khorma', 101, 'akbar-hassani', false, 115_000, 2_100],
  ['سیب قرمز دیماشند', 'sib', 101, 'parviz-karimi', false, 28_000, 9_800],
  ['پیاز زرد ورامین', 'piyaz', 101, 'parviz-karimi', false, 14_500, 45_000],
  ['سیب زمینی آگریا', 'sib-zamini', 101, 'reza-mohammadi', false, 19_000, 32_000],
  ['برنج هاشمی صدری', 'berenge', 101, 'akbar-hassani', false, 155_000, 4_400],
  ['خرمای کبکاب ممتاز', 'khorma', 101, 'parviz-karimi', false, 98_000, 7_700],
  ['سیب گلاب سمنان', 'sib', 101, 'akbar-hassani', true, 35_000, 6_000],
  // چندشهری استان تهران — شهریار/ورامین (تیک‌های «شهرهای استان»)
  ['پیاز قرمز شهریار', 'piyaz', 102, 'parviz-karimi', false, 15_200, 28_000],
  ['سیب زمینی ورامین', 'sib-zamini', 103, 'reza-mohammadi', false, 18_700, 41_000],
  ['روغن کارتنی شهریار', 'roghan', 102, 'akbar-hassani', true, 91_000, 6_400],
  ['روغن سرخ کردنی کارتنی', 'roghan', 104, 'akbar-hassani', false, 94_000, 8_800],
  ['سیب قرمز ارومیه', 'sib', 109, 'hosein-razavi', false, 32_000, 15_000],
  ['سیب زمینی مراکز', 'sib-zamini', 109, 'hosein-razavi', false, 18_500, 60_000],
  ['خرمای مزافی مشهد', 'khorma', 109, 'maryam-ahmadi', false, 120_000, 3_300],
  ['پیاز زرد خراسان', 'piyaz', 109, 'maryam-ahmadi', false, 15_000, 40_000],
  ['برنج هاشمی کاشمر', 'berenge', 109, 'hosein-razavi', false, 140_000, 10_000],
  ['برنج گرده اصفهان', 'berenge', 106, 'ali-esfahani', true, 122_000, 22_000],
  ['سیب زمینی آگریا نجف آباد', 'sib-zamini', 106, 'ali-esfahani', false, 17_800, 55_000],
  ['پیاز سفید اصفهان', 'piyaz', 106, 'ali-esfahani', false, 16_200, 38_000],
  ['خرمای شاهانی جهرم', 'khorma', 111, 'sadegh-shirazi', false, 89_000, 12_400],
  ['سیب قرمز فسا', 'sib', 111, 'sadegh-shirazi', false, 26_500, 18_600],
  ['سیب قرمز ترک', 'sib', 113, 'kaveh-tabrizi', false, 30_000, 25_000],
  ['پیاز زرد آذر', 'piyaz', 113, 'kaveh-tabrizi', true, 14_800, 70_000],
  ['برنج هاشمی اسانلو', 'berenge', 115, 'javad-hamedani', true, 146_000, 9_000],
  ['سیب قرمز همدان', 'sib', 115, 'javad-hamedani', false, 29_000, 14_000],
  // چندشهری استان همدان — ملایر عمداً خالی (حالت خالی + تیک شهرهای استان)
  ['سیب قرمز تویسرکان', 'sib', 117, 'javad-hamedani', false, 27_800, 11_000],
  ['پیاز زرد تویسرکان', 'piyaz', 117, 'javad-hamedani', false, 14_100, 33_000],
  ['خرمای خاص اهواز', 'khorma', 118, 'mahmud-ahvazi', false, 105_000, 5_500],
  ['سیب زمینی دزفول', 'sib-zamini', 118, 'mahmud-ahvazi', true, 16_900, 66_000],
  ['برنج هاشمی رشت', 'berenge', 122, 'naser-rashti', false, 138_000, 7_200],
  ['سیب گلاب گیلان', 'sib', 122, 'naser-rashti', false, 34_000, 5_400],
  ['خرمای مضافتی بم', 'khorma', 124, 'yaser-yazdi', true, 112_000, 8_900],
  ['پیاز زرد کرمان', 'piyaz', 126, 'yaser-yazdi', false, 13_900, 80_000],
];

const ROOT_IMG = { 76: '/images/categories/food.webp', 77: '/images/categories/agriculture.webp' };
const now = Date.now();
const iso = (msAgo) => new Date(now - msAgo).toISOString();

const PRODUCTS = PRODUCT_ROWS.map((r, i) => {
  const [name, slug, cityId, sellerKey, isLadder, price, stock] = r;
  const leaf = LEAVES.find((l) => l.slug === slug);
  const city = CITIES.find((c) => c.id === cityId);
  const province = PROVINCES.find((p) => p.id === city.province_id);
  const img = ROOT_IMG[leaf.root.id];
  return {
    id: i + 1,
    productName: name,
    slug,
    description: `${name} — فروش عمده مستقیم از ${city.city_name}؛ قیمت هر ${leaf.unit}.`,
    stock,
    minSalePrice: price,
    minSaleAmount: leaf.min,
    unit: leaf.unit,
    categoryId: leaf.root.id,
    categoryName: leaf.root.category_name,
    subCategoryId: leaf.id,
    subCategoryName: leaf.category_name,
    provinceId: province.id,
    provinceName: province.province_name,
    cityId: city.id,
    cityName: city.city_name,
    myuserId: SELLERS[sellerKey].id,
    seller: { ...SELLERS[sellerKey] },
    isLadder,
    isElevated: isLadder,
    hasVideo: false,
    isOld: false,
    viewCount: 120 + i * 37,
    priceValidityDays: 7,
    priceUpdatedAt: iso((i % 5) * 3_600_000),
    priceExpired: false,
    createdAt: iso((32 - i) * 86_400_000),
    updatedAt: iso((i % 6) * 43_200_000),
    photos: [img],
    photoThumbs: [img],
  };
});

// ─── هندلرها ────────────────────────────────────────────────────────────────

/** سورت related = نردبان ← ویژه ← آپدیت (عین توضیح بک‌اند برای محصولات مرتبط) */
function sortRelated(a, b) {
  if (a.isLadder !== b.isLadder) return a.isLadder ? -1 : 1;
  const vip = (p) => p.seller.activePakageType ?? 0;
  if (vip(a) !== vip(b)) return vip(b) - vip(a);
  return b.updatedAt.localeCompare(a.updatedAt);
}
function sortNewest(a, b) {
  return b.createdAt.localeCompare(a.createdAt);
}

const routes = {
  '/api/v1/locations/getAllProvinces': () => ok(PROVINCES),
  '/api/v1/locations/getCitiesByProvince': (body) =>
    ok(body && body.province_id ? CITIES.filter((c) => c.province_id === body.province_id) : CITIES),
  '/api/v1/categories/getAllCategories': () => ok(CATEGORIES),
  '/api/v1/products/getProductList': (body) => {
    const b = body ?? {};
    let items = PRODUCTS.filter(
      (p) =>
        (!b.cityId || p.cityId === b.cityId) &&
        (!b.provinceId || p.provinceId === b.provinceId) &&
        (!b.s || p.productName.includes(b.s) || p.subCategoryName.includes(b.s)),
    );
    if (b.categorySlug) {
      items = items.filter((p) => {
        const leaf = LEAVES.find((l) => l.id === p.subCategoryId);
        return leaf.slug === b.categorySlug || leaf.root.slug === b.categorySlug;
      });
    }
    items = [...items].sort(b.sort === 'newest' ? sortNewest : sortRelated);
    const pageSize = b.pageSize || 20;
    const page = Math.max(1, b.page || 1);
    const total = items.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    return ok({ items: items.slice(start, start + pageSize), total, page, pageCount });
  },
  '/api/v1/products/searchSuggestions': () => ok(['برنج هاشمی', 'خرمای مضافتی']),
  /**
   * سرویس جداگانۀ «بازار عمدهٔ شهری» — چندشهری (خواستهٔ مالک ۹-۱۱):
   *   · cityIds الزامی است (تیک شهر صفحه + شهرهای دیگر استان)؛ بدون آن
   *     نتیجهٔ خالی برمی‌گردد (fail-closed — این سرویس هرگز لیست سراسری نمی‌دهد)؛
   *   · عضویت با Set — O(1) به‌ازای هر آگهی؛ سرعتِ چندشهری عین تک‌شهری
   *     (پیاده‌سازی سرور واقعی: WHERE city_id IN (…) با ایندکس city_id)؛
   *   · بقیهٔ قرارداد (s/categorySlug/sort/page/pageSize و سورت
   *     related = نردبان ← ویژه ← آپدیت) عین سرویس اصلی — کاربر ویژه و
   *     نردبان اینجا هم بالاتر دیده می‌شوند (خواستهٔ مالک).
   */
  '/api/v1/cityMarket/getProducts': (body) => {
    const b = body ?? {};
    const cityIds = Array.isArray(b.cityIds) ? b.cityIds.map(Number).filter((n) => Number.isFinite(n)) : [];
    if (cityIds.length === 0) return ok({ items: [], total: 0, page: 1, pageCount: 0 });
    const citySet = new Set(cityIds); // جستجوی چندشهری — همان سرعت تک‌شهری
    let items = PRODUCTS.filter(
      (p) =>
        citySet.has(p.cityId) &&
        (!b.s || p.productName.includes(b.s) || p.subCategoryName.includes(b.s)),
    );
    if (b.categorySlug) {
      items = items.filter((p) => {
        const leaf = LEAVES.find((l) => l.id === p.subCategoryId);
        return leaf.slug === b.categorySlug || leaf.root.slug === b.categorySlug;
      });
    }
    items = [...items].sort(b.sort === 'newest' ? sortNewest : sortRelated);
    const pageSize = b.pageSize || 20;
    const page = Math.max(1, b.page || 1);
    const total = items.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    return ok({ items: items.slice(start, start + pageSize), total, page, pageCount });
  },
  '/api/v1/products/getProductById': (body) =>
    ok(PRODUCTS.find((p) => p.id === body?.id) ?? PRODUCTS[0]),
  '/api/v1/products/getSeller': (body) => {
    const s = SELLERS[body?.userName] ?? SELLERS['reza-mohammadi'];
    const city = CITIES.find((c) => c.city_name === 'تهران');
    return ok({
      user: {
        ...s,
        sex: 'male',
        businessDesc: 'خرید و فروش عمده خواربار',
        avatarUrl: null,
        createdAt: iso(400 * 86_400_000),
        online: true,
        lastSeenAt: iso(600_000),
        provinceName: 'تهران',
        cityName: 'تهران',
        reviewSummary: { avg: 4.6, count: 12 },
        responseRate: 92,
        productCount: 4,
        totalStock: 40_000,
        _cityId: city.id,
      },
      products: PRODUCTS.filter((p) => p.seller.userName === s.userName),
    });
  },
  '/api/v1/buy-requests/getBuyRequestList': () => ok({ items: [], total: 0, page: 1, pageCount: 0 }),
  '/api/v1/buy-requests/getLatestBuyRequests': () => ok([]),
  '/api/v1/buyers/directory': () => ok({ items: [], total: 0, page: 1, pageCount: 0 }),
  '/api/v1/chat/unreadCount': () => ok({ total: 0, chat: 0, support: 0, admin: 0 }),
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let raw = '';
  req.on('data', (ch) => (raw += ch));
  req.on('end', () => {
    let body = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      /* بدنه خالی */
    }
    const handler = routes[url.pathname];
    const payload = handler ? handler(body) : ok({});
    if (!handler) console.log('[mock-city] catch-all:', req.method, url.pathname);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
  });
});

server.listen(4000, '127.0.0.1', () => {
  console.log(
    `[mock-city] listening on :4000 — ${PROVINCES.length} استان، ${CITIES.length} شهر، ${PRODUCTS.length} محصول`,
  );
});
