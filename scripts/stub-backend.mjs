// استاب بک‌اند پیش‌نمایش سندباکس (پورت ۴۰۰۰) — فقط برای بازبینی بصری فرانت.
// اجرای خودکار: src/instrumentation.ts در بوت سرور dev آن را بالا می‌آورد،
// فقط وقتی فایل نشانگر «.sandbox-preview» در ریشهٔ پروژه باشد (gitignore —
// روی ماشین مالک وجود ندارد و بک‌اند واقعی مگان روی همان پورت دست‌نخورده است).
// پورت ۴۰۰۰ زنده باشد (بک‌اند واقعی/استاب قبلی) → استاب بالا نمی‌آید.
import { createServer } from 'node:http';

const PROVINCES = [
  { id: 1, province_name: 'تهران' },
  { id: 8, province_name: 'همدان' },
];

const CITIES = [
  { id: 101, province_id: 1, city_name: 'تهران' },
  { id: 108, province_id: 1, city_name: 'شهریار' },
  { id: 109, province_id: 1, city_name: 'اسلامشهر' },
  { id: 102, province_id: 8, city_name: 'همدان' },
  { id: 103, province_id: 8, city_name: 'ملایر' },
  { id: 104, province_id: 8, city_name: 'نهاوند' },
  { id: 105, province_id: 8, city_name: 'تویسرکان' },
  { id: 106, province_id: 8, city_name: 'اسدآباد' },
  { id: 107, province_id: 8, city_name: 'کبودرآهنگ' },
];

const cat = (id, name, slug, parent, extra = {}) => ({
  id,
  category_name: name,
  slug,
  unit: 'کیلوگرم',
  min: 10,
  example: null,
  parent_id: parent,
  score: 1,
  ...extra,
});

// درخت دسته‌ها — ریشهٔ کشاورزی اسلاگ فارسی «کشاورزی» دارد تا URL واقعی مالک
// (/product-list/category/کشاورزی) در پیش‌نمایش هم رزولو شود.
const CATS = [
  cat(77, 'مواد غذایی', 'food', null, {
    example: 'پفک مزمز',
    children: [
      cat(200, 'تنقلات', 'snacks', 77, {
        example: 'چیتوز',
        children: [cat(300, 'پفک و چیپس', 'puffs', 200, { example: 'پفک مزمز تند' })],
      }),
      cat(201, 'تن‌مکانی', 'meat', 77, { example: 'سوسیس' }),
    ],
  }),
  cat(76, 'محصولات کشاورزی', 'کشاورزی', null, {
    example: 'سیب',
    children: [
      cat(400, 'میوه', 'fruits', 76, {
        example: 'سیب قرمز',
        children: [
          cat(500, 'سیب', 'apple', 400, { example: 'سیب قرمز فرقان' }),
          cat(600, 'گردو', 'walnut', 400, { example: 'گردوی تازه تویسرکان' }),
        ],
      }),
    ],
  }),
];

/** همهٔ idهای زیردرختِ یک اسلاگ (خودش + فرزندان) — برای فیلتر دستهٔ لیست */
function subtreeIds(slug) {
  const flat = [];
  const walk = (nodes) => {
    for (const n of nodes) {
      flat.push(n);
      if (n.children) walk(n.children);
    }
  };
  walk(CATS);
  const ids = new Set(flat.filter((n) => n.slug === slug).map((n) => n.id));
  // پخش به پایین تا عمق درخت (درخت کم‌عمق است — چند پاس کافی و ساده است)
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of flat) {
      if (!ids.has(n.id) && n.parent_id != null && ids.has(n.parent_id)) {
        ids.add(n.id);
        grew = true;
      }
    }
  }
  return ids;
}

const p = (i, name, slug, cityId, cityName, over = {}) => ({
  id: 1000 + i,
  productName: name,
  slug,
  description: 'توضیح تستی',
  stock: 1000 + i * 250,
  minSalePrice: 25000 + i * 3000,
  minSaleAmount: 50,
  unit: 'کیلوگرم',
  categoryId: 300,
  categoryName: 'پفک و چیپس',
  subCategoryId: 200,
  subCategoryName: 'تنقلات',
  provinceId: 8,
  provinceName: 'همدان',
  cityId,
  cityName,
  myuserId: String(50 + i),
  seller: {
    id: String(50 + i),
    userName: 'seller' + i,
    firstName: 'کاربر',
    lastName: 'تستی ' + i,
    activePakageType: i % 3 === 0 ? 3 : 1,
    isVerified: i % 2 === 0,
  },
  isLadder: i % 4 === 0,
  isElevated: i % 5 === 0,
  hasVideo: i === 2,
  isOld: false,
  viewCount: 40 + i * 17,
  createdAt: '2026-11-0' + ((i % 8) + 1) + ' 09:00:00',
  updatedAt: '2026-11-0' + ((i % 8) + 1) + ' 10:30:00',
  photos: ['/images/categories/food.webp'],
  photoThumbs: ['/images/categories/food.webp'],
  ...over,
});

const AGRI_PHOTO = {
  photos: ['/images/categories/agriculture.webp'],
  photoThumbs: ['/images/categories/agriculture.webp'],
};

const PRODUCTS = [
  p(0, 'پفک مزمز تند چیتوز', 'pofak-mazmaz', 102, 'همدان'),
  p(1, 'پفک مزمز نمکی چیتوز', 'pofak-mazmaz-namaki', 102, 'همدان'),
  p(2, 'چیپس نمکی زیرو زرتشتی', 'chips-namaki', 102, 'همدان', { minSalePrice: null }),
  p(3, 'پفک پنیری آلپین', 'pofak-paniri', 102, 'همدان'),
  p(4, 'سیب قرمز فرقان درجه یک', 'sib-sorkh', 102, 'همدان', {
    categoryId: 500,
    categoryName: 'سیب',
    subCategoryId: 400,
    subCategoryName: 'میوه',
    ...AGRI_PHOTO,
  }),
  p(5, 'سیب زرد قلتان', 'sib-zard', 102, 'همدان', {
    categoryId: 500,
    categoryName: 'سیب',
    subCategoryId: 400,
    subCategoryName: 'میوه',
    ...AGRI_PHOTO,
  }),
  p(6, 'پفک تند فلیکس', 'pofak-tend', 102, 'همدان'),
  p(7, 'تخمه ژاپنی نمکی', 'tokhme', 102, 'همدان', { unit: 'کیسه' }),
  p(8, 'بسته پفک مینی مزمز', 'pofak-mini', 102, 'همدان'),
  p(9, 'سیب عسلی ملایر', 'sib-asali', 103, 'ملایر', {
    categoryId: 500,
    categoryName: 'سیب',
    subCategoryId: 400,
    subCategoryName: 'میوه',
    ...AGRI_PHOTO,
  }),
  p(10, 'گردوی تازه تویسرکان', 'gerdoo', 105, 'تویسرکان', {
    categoryId: 600,
    categoryName: 'گردو',
    subCategoryId: 400,
    subCategoryName: 'میوه',
    ...AGRI_PHOTO,
  }),
];

/** لیست صفحه‌بندی‌شده — فیلتر شهرها (بازار شهری)، شهر تکی و زیردرختِ دسته */
function paged({ cityIds, cityId, categorySlug } = {}) {
  let items = PRODUCTS;
  if (Array.isArray(cityIds) && cityIds.length) {
    const ids = cityIds.map(Number);
    items = items.filter((x) => ids.includes(x.cityId));
  }
  if (cityId != null) {
    items = items.filter((x) => x.cityId === Number(cityId));
  }
  if (categorySlug) {
    const ids = subtreeIds(String(categorySlug));
    if (ids.size > 0) {
      items = items.filter((x) => ids.has(x.categoryId) || ids.has(x.subCategoryId));
    }
  }
  return { items, total: items.length, page: 1, pageCount: 1 };
}

const PROFILE = {
  id: '50',
  phone: '09120000000',
  user_name: 'seller0',
  first_name: 'کاربر',
  last_name: 'تستی',
  sex: null,
  role: 'buyer',
  has_password: true,
  is_verified: true,
  is_buyer: true,
  is_seller: false,
  wallet_balance: 0,
  avatar_url: null,
  business_desc: null,
  province_id: 8,
  city_id: 102,
};

// ─── فروشنده‌ها/خریدارهای کاتالوگ — از روی لیست محصولات ساخته می‌شوند ───
const SELLERS = new Map();
for (const pr of PRODUCTS) {
  if (!SELLERS.has(pr.seller.userName)) {
    SELLERS.set(pr.seller.userName, {
      id: pr.seller.id,
      userName: pr.seller.userName,
      firstName: pr.seller.firstName,
      lastName: pr.seller.lastName,
      activePakageType: pr.seller.activePakageType,
      isVerified: pr.seller.isVerified,
      businessDesc: 'پخش عمده و سراسری با بهترین قیمت روز؛ ارسال به سراسر کشور.',
      avatarUrl: null,
      createdAt: '2024-06-15 09:00:00',
      online: false,
      lastSeenAt: null,
      provinceName: 'همدان',
      cityName: pr.cityName,
      reviewSummary: { avg: 4.3, count: 3 },
      responseRate: 92,
      productCount: 0,
      totalStock: 0,
      products: [],
    });
  }
  const s = SELLERS.get(pr.seller.userName);
  s.products.push(pr);
  s.productCount += 1;
  s.totalStock += pr.stock;
}

/** خریدارهای نمونه + کاربر نشست استاب — همه با قالب یکسان برای لیست‌ها */
const ME = { id: '50', userName: 'seller0', firstName: 'کاربر', lastName: 'تستی', avatarUrl: null, cityName: 'همدان' };
const BUYER_USERS = [
  { id: '90', userName: 'buyer1', firstName: 'علی', lastName: 'محمدی', avatarUrl: null, cityName: 'تهران' },
  { id: '91', userName: 'buyer2', firstName: 'زهرا', lastName: 'کریمی', avatarUrl: null, cityName: 'ملایر' },
];
const findUser = (userName) =>
  SELLERS.get(userName) ?? BUYER_USERS.find((u) => u.userName === userName) ?? (userName === ME.userName ? ME : null);

// ─── کاتالوگ کاربر (خواسته مالک ۱۰-۱۱ + بازنگری) — کاتالوگ همان پروفایل
// است؛ صفحهٔ جداگانه‌ای ساخته نمی‌شود و فقط ذخیره‌ها دیتای اختصاصی دارند.
// کلید همه‌جا userName فروشنده است: `${buyerUserName}:${sellerUserName}` ───
const CATALOG_SAVES = new Map(); // `${buyerUserName}:${sellerUserName}` -> savedAt
const countSavers = (sellerUserName) => {
  let n = 0;
  for (const key of CATALOG_SAVES.keys()) if (key.endsWith(`:${sellerUserName}`)) n += 1;
  return n;
};

// ذخیره‌شده‌های نمونه: کاربر پنل استاب (seller0) + دو خریدار کاتالوگ (پروفایل)
// seller1 را ذخیره کرده‌اند — تا جعبهٔ «ذخیره کنندگان» و پنل «کاتالوگهای
// ذخیره شده» از اول پُر باشند
for (const u of ['seller0', 'buyer1', 'buyer2']) CATALOG_SAVES.set(`${u}:seller1`, '2026-11-01T10:00:00.000Z');

// ─── تنظیمات شخصی‌سازی کاتالوگ (خواسته مالک ۱۰-۱۱ دور ۳) — هر فروشنده
// می‌تواند آیدی لینک (/catalog/{catalogId})، نام برند، رنگ و آیکون خودش را
// بدهد. مقادیر null = پیش‌فرض (آیدی = userName، برند = نام فروشنده،
// رنگ = رنگ برند ایمچ، آیکون = فروشگاه). کلید Map همان userName است ───
const CATALOG_SETTINGS = new Map(); // userName -> { catalogId?, brandName?, brandColor?, brandIcon? }
// نمونهٔ seed (فروشندهٔ دیتای تست) تا شخصی‌سازی از اول در بازبینی بصری دیده شود
CATALOG_SETTINGS.set('seller1', { brandName: 'هایپر زرین', brandColor: '#0e9f6e', brandIcon: 'shopping-basket' });

/** تنظیمات رزولو‌شدهٔ یک فروشنده — پیش‌فرض‌ها با مقادیر ذخیره‌شده پر می‌شوند */
const resolvedSettings = (userName) => {
  const saved = CATALOG_SETTINGS.get(userName) ?? {};
  const u = findUser(userName);
  return {
    catalogId: saved.catalogId ?? userName,
    brandName: saved.brandName ?? (u ? `${u.firstName} ${u.lastName}`.trim() : null),
    brandColor: saved.brandColor ?? null,
    brandIcon: saved.brandIcon ?? 'store',
  };
};

/** آیدی عمومی آزاد است؟ — تداخل با userName هیچ کاربری (جز خودِ مالک) و
 *  آیدی سفارشی دیگران ممنوع. خروجی: null (آزاد) یا userName تصاحب‌کننده */
const catalogIdOwner = (id, exceptUserName) => {
  for (const [owner, s] of CATALOG_SETTINGS) {
    if (owner !== exceptUserName && s.catalogId && s.catalogId === id) return owner;
  }
  const u = findUser(id);
  if (u && u.userName !== exceptUserName) return u.userName;
  return null;
};

// ─── نظرات نمونه — تا ستاره/توزیع/کارت‌های نظر در کاتالوگ دیده شود ───
const REVIEWS = {
  summary: {
    avg: 4.3,
    count: 3,
    distribution: [
      { rating: 5, count: 2 },
      { rating: 4, count: 0 },
      { rating: 3, count: 1 },
      { rating: 2, count: 0 },
      { rating: 1, count: 0 },
    ],
  },
  items: [
    {
      id: 'r1',
      rating: 5,
      text: 'کیفیت عالی و ارسال سریع؛ تقریباً یک ساله هر ماه از این فروشنده می‌خرم و همیشه همون چیزی می‌رسه که توافق کردیم.',
      createdAt: '2026-10-12 10:00:00',
      status: 'approved',
      author: { id: '90', userName: 'buyer1', firstName: 'علی', lastName: 'محمدی', avatarUrl: null },
    },
    {
      id: 'r2',
      rating: 5,
      text: 'قیمت مناسب و بسته‌بندی مرتب. برای سوپرمارکت ما عالی بود.',
      createdAt: '2026-10-05 12:30:00',
      status: 'approved',
      author: { id: '91', userName: 'buyer2', firstName: 'زهرا', lastName: 'کریمی', avatarUrl: null },
    },
    {
      id: 'r3',
      rating: 3,
      text: 'کالا خوب بود ولی ارسال یک روز دیرتر شد.',
      createdAt: '2026-09-18 09:15:00',
      status: 'approved',
      author: { ...ME },
    },
  ],
};

/** پاسخ خطای قراردادی — { status:false, message } مثل بک‌اند واقعی */
class Fail {
  constructor(message) {
    this.message = message;
  }
}

// ─── چت و صفحهٔ کالا — برای بازبینی بصری ویجت/پیام‌ها در سندباکس ───
const nowIso = () => new Date().toISOString();
const CHAT = {
  thread: {
    id: 't1',
    productId: 1000,
    productName: 'پفک مزمز تند چیتوز',
    myId: '50',
    myRole: 'buyer',
    counterpart: { id: '51', firstName: 'کاربر', lastName: 'تستی 1', userName: 'seller1' },
    lastMessage: null,
    unreadCount: 0,
    updatedAt: nowIso(),
  },
  messages: [],
  seq: 1,
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (!url.pathname.startsWith('/api/v1/')) {
    res.writeHead(200).end('ok');
    return;
  }
  const path = url.pathname.replace('/api/v1/', '');
  let body = {};
  try {
    body = await new Promise((resolve) => {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        try {
          resolve(JSON.parse(raw || '{}'));
        } catch {
          resolve({});
        }
      });
    });
  } catch {
    body = {};
  }
  let data = [];
  switch (path) {
    case 'locations/getAllProvinces': data = PROVINCES; break;
    case 'locations/getCitiesByProvince': data = CITIES; break;
    case 'categories/getAllCategories': data = CATS; break;
    case 'cityMarket/getProducts': data = paged({ cityIds: body.cityIds }); break;
    case 'products/getProductList': data = paged(body); break;
    case 'products/getProductById': {
      const pr = PRODUCTS.find((x) => x.id === Number(body.id)) ?? null;
      data = pr;
      break;
    }
    case 'products/searchSuggestions': data = []; break;
    case 'products/getSellerProducts': data = { items: PRODUCTS.slice(0, 6), total: 6 }; break;
    // محصولات من (پنل) — کاربر نشست استاب = seller0؛ همهٔ آگهی‌ها تاییدشده
    case 'products/getMyProducts': {
      const mine = (SELLERS.get(ME.userName)?.products ?? []).map((x) => ({ ...x, status: 'confirmed' }));
      data = {
        items: mine,
        counts: { confirmed: mine.length, pending: 0, rejected: 0, deleted: 0 },
        capacity: 50,
      };
      break;
    }
    case 'products/getSeller': {
      const s = SELLERS.get(String(body.userName ?? ''));
      if (!s) data = null;
      else {
        const { products, ...user } = s;
        data = { user, products };
      }
      break;
    }
    case 'products/getSellerPhone': {
      const u =
        body.id != null
          ? [...SELLERS.values()].find((s) => s.id === String(body.id))
          : findUser(String(body.userName ?? ''));
      data = u
        ? { sellerId: u.id, phone: '09120000000', firstName: u.firstName, lastName: u.lastName, userName: u.userName, callLogged: false, callsLeftToday: 20 }
        : null;
      break;
    }
    case 'reviews/getSellerReviews':
      data = {
        summary: REVIEWS.summary,
        items: REVIEWS.items,
        myReview: null,
        total: REVIEWS.items.length,
        page: 1,
        perPage: 5,
        pageCount: 1,
      };
      break;
    case 'users/getProfile': data = { user: PROFILE }; break;
    // ─── کاتالوگ کاربر (خواسته مالک ۱۰-۱۱ + بازنگری) — کاتالوگ همان
    // پروفایل فروشنده است؛ کلید همهٔ اندپوینت‌ها userName اوست ───
    case 'catalog/isSaved':
      data = { saved: CATALOG_SAVES.has(`${ME.userName}:${body.userName}`) };
      break;
    case 'catalog/toggleSave': {
      const key = `${ME.userName}:${body.userName}`;
      if (CATALOG_SAVES.has(key)) {
        CATALOG_SAVES.delete(key);
        data = { saved: false };
      } else {
        CATALOG_SAVES.set(key, new Date().toISOString());
        data = { saved: true };
      }
      break;
    }
    case 'catalog/getMySaved': {
      const items = [];
      for (const [key, savedAt] of CATALOG_SAVES) {
        if (!key.startsWith(`${ME.userName}:`)) continue;
        const sellerUserName = key.slice(ME.userName.length + 1);
        const u = findUser(sellerUserName);
        if (!u) continue;
        items.push({
          sellerUserName,
          sellerId: u.id,
          sellerName: `${u.firstName} ${u.lastName}`.trim(),
          avatarUrl: u.avatarUrl ?? null,
          cityName: u.cityName ?? null,
          productCount: (SELLERS.get(sellerUserName)?.products ?? []).length,
          savedAt,
        });
      }
      data = { items };
      break;
    }
    case 'catalog/getSavers': {
      const sun = String(body.userName ?? '');
      const items = [];
      for (const [key, savedAt] of CATALOG_SAVES) {
        if (!key.endsWith(`:${sun}`)) continue;
        const userName = key.slice(0, -(sun.length + 1));
        const u = findUser(userName);
        if (u) {
          items.push({
            id: u.id,
            userName: u.userName,
            firstName: u.firstName,
            lastName: u.lastName,
            avatarUrl: u.avatarUrl ?? null,
            cityName: u.cityName ?? null,
            savedAt,
          });
        }
      }
      data = { count: items.length, items };
      break;
    }
    // ─── شخصی‌سازی کاتالوگ (خواسته مالک ۱۰-۱۱ دور ۳) ───
    // تنظیمات کاتالوگ خودِ کاربر نشست (پنل → مودال تنظیمات کاتالوگ)
    case 'catalog/getMySettings':
      data = { settings: resolvedSettings(ME.userName) };
      break;
    // ذخیرهٔ تنظیمات — آیدی: حروف کوچک لاتین/رقم/خط تیره ۳-۳۰ + یکتا؛
    // رنگ: hex ۶ رقمی؛ نام برند ≤ ۴۰ نویسه؛ آیکون: کلید مجاز (فرانت لیست
    // رسمی دارد؛ بک‌اند واقعی همین ولیدیشن را در DTO تکرار می‌کند)
    case 'catalog/updateSettings': {
      const cur = CATALOG_SETTINGS.get(ME.userName) ?? {};
      const out = { ...cur };
      if (body.catalogId !== undefined) {
        const id = String(body.catalogId ?? '').trim().toLowerCase();
        if (!/^[a-z0-9-]{3,30}$/.test(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: false,
            message: 'آیدی کاتالوگ باید ۳ تا ۳۰ نویسه باشد؛ فقط حروف کوچک لاتین، رقم و خط تیره (-).',
          }));
          return;
        }
        const owner = catalogIdOwner(id, ME.userName);
        if (owner) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: false,
            message: 'این آیدی قبلاً گرفته شده است؛ یکی دیگر انتخاب کنید.',
          }));
          return;
        }
        out.catalogId = id === ME.userName ? null : id;
      }
      if (body.brandName !== undefined) {
        const bn = String(body.brandName ?? '').trim();
        if (bn.length > 40) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: false, message: 'نام برند حداکثر ۴۰ نویسه است.' }));
          return;
        }
        out.brandName = bn || null;
      }
      if (body.brandColor !== undefined) {
        const bc = String(body.brandColor ?? '').trim();
        if (bc && !/^#[0-9a-fA-F]{6}$/.test(bc)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: false, message: 'رنگ برند نامعتبر است (مثال: #0e9f6e).' }));
          return;
        }
        out.brandColor = bc || null;
      }
      if (body.brandIcon !== undefined) {
        const bi = String(body.brandIcon ?? '').trim();
        if (bi && !/^[a-z0-9-]{2,30}$/.test(bi)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: false, message: 'آیکون انتخابی شناخته نشد.' }));
          return;
        }
        out.brandIcon = bi || null;
      }
      CATALOG_SETTINGS.set(ME.userName, out);
      data = { settings: resolvedSettings(ME.userName) };
      break;
    }
    // صفحهٔ عمومی /catalog/{id} — id می‌تواند آیدی سفارشی یا userName باشد
    case 'catalog/resolvePublicId': {
      const id = String(body.id ?? '').trim().toLowerCase();
      let userName = null;
      if (id) {
        for (const [owner, s] of CATALOG_SETTINGS) {
          if (s.catalogId && s.catalogId === id) { userName = owner; break; }
        }
        if (!userName && findUser(id)) userName = id;
      }
      data = userName ? { userName, settings: resolvedSettings(userName) } : null;
      break;
    }
    // ─── چت — حالت حداقلی برای بازبینی بصری کامپوزر/مودال پیوست ───
    case 'chat/startThread': data = CHAT.thread; break;
    case 'chat/getConversations': data = [CHAT.thread]; break;
    case 'chat/getThreadMessages': data = CHAT.messages; break;
    case 'chat/markThreadRead': data = { read: 0 }; break;
    case 'chat/uploadFile':
      // multipart خوانده نمی‌شود — پاسخ ثابت برای تست جریان مودال پیوست
      data = {
        url: '/images/categories/food.webp',
        key: 'stub-' + Date.now(),
        name: 'stub.webp',
        size: 12345,
        mime: 'image/webp',
        kind: 'image',
      };
      break;
    case 'chat/sendMessage': {
      const msg = {
        id: 'm' + CHAT.seq++,
        threadId: body.threadId ?? 't1',
        senderId: '50',
        text: body.text ?? '',
        readAt: null,
        createdAt: nowIso(),
        kind: body.kind ?? 'text',
        file: body.fileUrl
          ? { url: body.fileUrl, key: body.fileKey, name: body.fileName, size: body.fileSize, mime: body.fileMime }
          : null,
        editedAt: null,
      };
      CHAT.messages.push(msg);
      CHAT.thread.lastMessage = { text: msg.text || (msg.file ? msg.file.name : ''), at: msg.createdAt, senderId: '50' };
      data = msg;
      break;
    }
    case 'chat/unreadCount': data = { count: 0 }; break;
    case 'follow/isFollowing': data = { following: false, item: null }; break;
    case 'follow/getFollowingMap': data = []; break;
    default: data = [];
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  if (data instanceof Fail) {
    res.end(JSON.stringify({ status: false, message: data.message }));
    return;
  }
  res.end(JSON.stringify({ status: true, data }));
});

// پورت اشغال (بک‌اند واقعی/استاب دیگری) → خروج بی‌سروصدا؛ next.config
// ممکن است هم‌زمان دوبار استاب را بالا بیاورد — فقط یک نمونه زنده می‌ماند.
server.on('error', () => process.exit(0));
server.listen(4000, '127.0.0.1', () => {
  console.log('[sandbox] stub backend on http://127.0.0.1:4000');
});
