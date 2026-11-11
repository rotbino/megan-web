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
  // امکان تماس (خواستهٔ مالک ۴-۱۱) — خاموش = دکمهٔ تماس برای دیگران مخفی
  allow_calls: true,
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
      // امکان تماس (خواستهٔ مالک ۴-۱۱) — کاربر نشست از پروفایل می‌تواند
      // خاموشش کند (users/updateProfile؛ دکمهٔ تماس کاتالوگ/دفتر مخفی می‌شود)
      allow_calls: true,
      // کسب‌وکار کاربر نشست (خواستهٔ مالک ۱۱-۱۱) — پیش‌فرض عنوان بنرِ دفترِ
      // خودش «دفتر خرید تولیدی آریا» می‌شود
      isCompany: true,
      companyName: 'تولیدی آریا',
      businessCategory: 'تولید و پخش مواد غذایی',
      address: 'همدان، شهرک صنعتی، خیابان سوم',
      products: [],
    });
  }
  const s = SELLERS.get(pr.seller.userName);
  s.products.push(pr);
  s.productCount += 1;
  s.totalStock += pr.stock;
}

// ─── گالری و گواهی‌های کسب‌وکار (خواستهٔ مالک ۱۰-۱۱ دور ۵) — بخش «تصاویر و
// گواهی‌های کسب و کار» که در کاتالوگ زیر لیست کالاها می‌نشیند؛ برای همهٔ
// فروشندگان seed می‌شود تا در پیش‌نمایش دیده شود (عکس فروشگاه/انبار + مدارک) ───
const GALLERY_SEED = [
  { url: '/images/online-store2.jpg', thumbUrl: '/images/online-store2.jpg' },
  { url: '/images/hero.webp', thumbUrl: '/images/hero.webp' },
  { url: '/images/categories/food.webp', thumbUrl: '/images/categories/food.webp' },
];
const CERTIFICATES_SEED = [
  { url: '/help-img/verify/sample-card.jpg', thumbUrl: '/help-img/verify/sample-card.jpg' },
  { url: '/help-img/verify/form-step1.jpg', thumbUrl: '/help-img/verify/form-step1.jpg' },
];
for (const [name, s] of SELLERS) {
  s.gallery = name === 'seller0' ? GALLERY_SEED.slice(0, 2) : GALLERY_SEED;
  s.certificates = name === 'seller0' ? CERTIFICATES_SEED.slice(0, 1) : CERTIFICATES_SEED;
}

/** خریدارهای نمونه + کاربر نشست استاب — همه با قالب یکسان برای لیست‌ها.
 *  فیلد های اضافه (role/lastActiveAt/…) فقط برای دفتر خرید (۱۰-۱۱ دور ۵)
 *  خوانده می‌شوند؛ بقیهٔ مصرف‌کننده‌ها به آن‌ها کاری ندارند. مشخصات کسب‌وکار
 *  (توضیحات/مجوزها/گالری/احراز) هم عین کاتالوگ در دفتر خرید دیده می‌شود
 *  (خواستهٔ مالک ۱۱-۱۱): هر اطلاعاتی از خریدار که برای فروشنده مهم است. */
const ME = { id: '50', userName: 'seller0', firstName: 'کاربر', lastName: 'تستی', avatarUrl: null, cityName: 'همدان', allow_calls: true };
const BUYER_USERS = [
  {
    id: '90', userName: 'buyer1', firstName: 'علی', lastName: 'محمدی', avatarUrl: null,
    provinceName: 'تهران', cityName: 'تهران', role: 'عمده‌خریدار',
    createdAt: '2024-03-10 09:00:00', lastActiveAt: '2026-11-08T10:00:00.000Z',
    activeRecently: true, stale: false,
    // مشخصات کسب‌وکار (خواستهٔ مالک ۱۱-۱۱) — عین فیلدهای کاتالوگ فروشنده
    isVerified: true,
    isCompany: true,
    companyName: 'شرکت آرمان',
    businessCategory: 'هایپرمارکت و زنجیره فروشی',
    businessDesc:
      'زنجیره‌ فروشی آرمان با ۱۲ شعبه فعال در تهران؛ خرید دوره‌ای میوه، تنقلات و مواد غذایی برای فروشگاه‌ها. پرداخت نقدی و به‌موقع، تحویل از باربری همکار.',
    address: 'تهران، خیابان ولیعصر، نبش کوچه بهار، پلاک ۱۲',
    gallery: [
      { url: '/images/online-store2.jpg', thumbUrl: '/images/online-store2.jpg' },
      { url: '/images/hero.webp', thumbUrl: '/images/hero.webp' },
      { url: '/images/categories/food.webp', thumbUrl: '/images/categories/food.webp' },
    ],
    certificates: [
      { url: '/help-img/verify/sample-card.jpg', thumbUrl: '/help-img/verify/sample-card.jpg' },
      { url: '/help-img/verify/form-step1.jpg', thumbUrl: '/help-img/verify/form-step1.jpg' },
    ],
  },
  {
    id: '91', userName: 'buyer2', firstName: 'زهرا', lastName: 'کریمی', avatarUrl: null,
    provinceName: 'همدان', cityName: 'ملایر', role: 'خرده‌خریدار',
    createdAt: '2025-01-20 09:00:00', lastActiveAt: '2026-05-01T10:00:00.000Z',
    activeRecently: false, stale: true,
    isVerified: false,
    isCompany: false,
    companyName: null,
    businessCategory: null,
    businessDesc: 'مغازه مواد غذایی محلی؛ خرید هفتگی تنقلات و نوشیدنی برای فروش در ملایر.',
    address: null,
    gallery: [],
    certificates: [],
    // دموی «تماس غیرفعال» (خواستهٔ مالک ۱۱-۱۱): دفتر buyer2 چت دارد، تماس نه
    allow_calls: false,
  },
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
// می‌تواند آیدی لینک (/c/{catalogId})، نام برند، رنگ و آیکون خودش را
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
    // دکمهٔ تماس مخصوص کاتالوگ (خواستهٔ مالک ۱۱-۱۱) — کلید صفحهٔ به صفحه؛
    // سوییچ پروفایل (allow_calls) جدا از این کلید، همان صفحه را می‌بندد
    allowCalls: saved.allowCalls !== false,
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

// ─── دفتر خرید (خواستهٔ مالک ۱۰-۱۱ دور ۵) — قرینهٔ کاتالوگ ────────────────
// فروشنده کاتالوگ دارد که خریدار ذخیره می‌کند؛ خریدار دفتر خرید دارد که
// فروشنده ذخیره می‌کند. دفتر = کالاهای خرید دوره‌ایِ confirmed کاربر؛
// ذخیره‌ها: `${sellerUserName}:${buyerUserName}` (خریدار با userName).
const mkBookItem = (
  categoryId, name, rootName, parentName, unit, minAmount, period, productType,
  status = 'confirmed',
) => ({
  categoryId, name, rootName, parentName, unit, minAmount, period, productType,
  example: null, status, rejectionReasons: [],
});

const BUYER_BOOK_ITEMS = new Map(); // userName -> BuyerBookItem[]
// seed — دفتر خریداران نمونه (confirmed = عمومی؛ pending فقط خود خریدار می‌بیند)
BUYER_BOOK_ITEMS.set('buyer1', [
  mkBookItem(500, 'سیب', 'محصولات کشاورزی', 'میوه', 'کیلوگرم', 2000, 'monthly', 'قرمز'),
  mkBookItem(600, 'گردو', 'محصولات کشاورزی', 'میوه', 'کیلوگرم', 300, 'monthly', null),
]);
BUYER_BOOK_ITEMS.set('buyer2', [
  mkBookItem(300, 'پفک و چیپس', 'مواد غذایی', 'تنقلات', 'کیلوگرم', 500, 'weekly', 'تند'),
  // pending → در دفتر عمومی و دایرکتوری نمی‌آید (تا جریان تایید ادمین دیده شود)
  mkBookItem(200, 'تنقلات', 'مواد غذایی', 'تنقلات', 'کیلوگرم', 150, 'occasional', null, 'pending'),
]);
// کاربر نشست استاب هم دفتر دارد — پیش‌نمایش «تنظیمات دفتر خرید» و دفتر خودم
BUYER_BOOK_ITEMS.set(ME.userName, [
  mkBookItem(500, 'سیب', 'محصولات کشاورزی', 'میوه', 'کیلوگرم', 800, 'weekly', 'زرد'),
  mkBookItem(200, 'تنقلات', 'مواد غذایی', 'تنقلات', 'کیلوگرم', 120, 'monthly', null),
]);

/** تنظیمات دفتر — bookId (پیش‌فرض تصادفی)، رنگ برند و لوگو */
const BUYER_BOOK_SETTINGS = new Map(); // userName -> { bookId?, brandColor?, logo? }
const randomBookId = () => 'b' + Math.random().toString(36).slice(2, 9);
const bookIdOwner = (id, exceptUserName) => {
  for (const [owner, s] of BUYER_BOOK_SETTINGS) {
    if (owner !== exceptUserName && s.bookId && s.bookId === id) return owner;
  }
  const u = findUser(id);
  if (u && u.userName !== exceptUserName) return u.userName;
  return null;
};
const freshBookId = (userName) => {
  let id = randomBookId();
  while (bookIdOwner(id, userName)) id = randomBookId();
  return id;
};
// seed — buyer1 آیدی سفارشی مثال مالک (phaksh-seyyed)؛ بقیه تصادفی.
// فیلدهای متن (خواستهٔ مالک ۱۱-۱۱): عنوان بنر دفتر، سمت مسئول خرید و
// شرایط تامین — دفترِ خریدار با متنی که خودش در تنظیمات نوشته معرفی می‌شود
BUYER_BOOK_SETTINGS.set('buyer1', {
  bookId: 'phaksh-seyyed', brandColor: '#0891b2', logo: null,
  supplyTerms:
    'فقط تولیدکنندگان پیشنهاد تامین ارسال کنند.\nهزینه حمل بر عهده تامین‌کننده است.\nپرداخت نقدی در لحظه تحویل کالا انجام می‌شود.',
});
BUYER_BOOK_SETTINGS.set('buyer2', {
  brandColor: '#7c3aed', logo: null,
  bannerTitle: 'تامین هفتگی مغازه مواد غذایی کریمی — منتظر پیشنهاد قیمت شما هستیم.',
});
BUYER_BOOK_SETTINGS.set(ME.userName, {
  supplyTerms: 'فقط تولیدکنندگان پیشنهاد تامین ارسال کنند.\nهزینه حمل بر عهده تامین‌کننده است.',
});

/** خواندن تنظیمات رزولو‌شدهٔ دفتر (بدون ساخت — فقط خواندن) — متن‌های دفتر
 *  (عنوان بنر/سمت/شرایط تامین) هم همین‌جا برمی‌گردند (خواستهٔ مالک ۱۱-۱۱) */
const resolvedBookSettings = (userName) => {
  const s = BUYER_BOOK_SETTINGS.get(userName) ?? {};
  return {
    bookId: s.bookId ?? null,
    brandColor: s.brandColor ?? null,
    logo: s.logo ?? null,
    bannerTitle: s.bannerTitle ?? null,
    managerTitle: s.managerTitle ?? null,
    supplyTerms: s.supplyTerms ?? null,
    // دکمهٔ تماس مخصوص دفتر خرید (خواستهٔ مالک ۱۱-۱۱) — فقط همین صفحه؛
    // سوییچ کاتالوگ و سوییچ پروفایل جدا هستند
    allowCalls: s.allowCalls !== false,
  };
};
/** تنظیمات دفتر هر کاربر — با اولین خواندن، آیدی تصادفیِ پیش‌فرض ساخته می‌شود
 *  (خواستهٔ مالک ۱۰-۱۱ دور ۵: پیش‌فرض بصورت تصادفی؛ برای همهٔ صاحبان دفتر،
 *  نه فقط کاربر نشست — دایرکتوری/لیست ذخیره‌شده‌ها هم لینک سالم بدهند) */
const ensureBookSettings = (userName) => {
  let s = BUYER_BOOK_SETTINGS.get(userName);
  if (!s) { s = {}; BUYER_BOOK_SETTINGS.set(userName, s); }
  if (!s.bookId) s.bookId = freshBookId(userName);
  // خروجی رزولو‌شده — همهٔ کلیدها (از جمله allowCalls و متن‌های null) همیشه
  // حاضرند؛ مصرف‌کننده‌های عمومی (getPublic/resolvePublicId) کل فرم را می‌بینند
  return resolvedBookSettings(userName);
};
const ensureMyBookSettings = () => ensureBookSettings(ME.userName);

/** ذخیره‌های دفتر — فروشنده‌ای که دفترِ خریدار را ذخیره کرده */
const BOOK_SAVES = new Map(); // `${sellerUserName}:${buyerUserName}` -> savedAt
// seed — کاربر نشست دفتر buyer1 را ذخیره کرده؛ فروشندهٔ دیگری دفتر buyer2 را
BOOK_SAVES.set(`${ME.userName}:buyer1`, '2026-11-02T09:00:00.000Z');
BOOK_SAVES.set(`seller2:buyer2`, '2026-10-18T12:00:00.000Z');

const countBookSavers = (buyerUserName) => {
  let n = 0;
  for (const key of BOOK_SAVES.keys()) if (key.endsWith(`:${buyerUserName}`)) n += 1;
  return n;
};

/** رزولو آیدی عمومی دفتر — آیدی سفارشی یا userName خریدار */
const resolveBookUserName = (id) => {
  const key = String(id ?? '').trim().toLowerCase();
  if (!key) return null;
  for (const [owner, s] of BUYER_BOOK_SETTINGS) {
    if (s.bookId && s.bookId === key) return owner;
  }
  if (findUser(key)) return key;
  return null;
};

/** مسیر دسته از id — برای فیلتر دایرکتوری بر اساس زیردرخت */
function subtreeIdsById(id) {
  const flat = [];
  const walk = (nodes) => {
    for (const n of nodes) {
      flat.push(n);
      if (n.children) walk(n.children);
    }
  };
  walk(CATS);
  const target = flat.find((n) => n.id === Number(id));
  if (!target) return new Set();
  const ids = new Set([target.id]);
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

/** نام/واحد دسته از درخت — saveMyBook فقط categoryId می‌گیرد */
function catById(id) {
  const flat = [];
  const walk = (nodes) => {
    for (const n of nodes) {
      flat.push(n);
      if (n.children) walk(n.children);
    }
  };
  walk(CATS);
  return flat.find((n) => n.id === Number(id)) ?? null;
}

// کاربر نشست استاب بستهٔ یک‌سالهٔ فعال دارد — گیت‌های پنل (canSeeBuyers و
// isFeatured) در پیش‌نمایش باز باشند
const ME_HAS_PACKAGE = true;

// ─── آپلود فایل (multipart) — لوگوی دفتر خرید، آواتار، مدارک احراز ─────────
// حافظه‌ای (استاب فقط برای پیش‌نمایش است)؛ فایل‌ها با GET /api/v1/uploads/*
// سرو می‌شوند که از طریق پروکسی نکست به‌صورت /api/uploads/* در دسترس‌اند.
const UPLOADS = new Map(); // name -> { buf, mime }

/** پارس سادهٔ multipart/form-data — برای فایل‌های کوچک (≤۵MB) کافی است */
function parseMultipart(buffer, contentTypeHeader) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(String(contentTypeHeader || ''));
  if (!m) return null;
  const bBoundary = Buffer.from('--' + (m[1] || m[2]).trim());
  const parts = [];
  let pos = buffer.indexOf(bBoundary);
  while (pos !== -1) {
    const start = pos + bBoundary.length;
    if (buffer.slice(start, start + 2).toString() === '--') break; // پایان نهایی
    const next = buffer.indexOf(bBoundary, start);
    if (next === -1) break;
    let seg = buffer.slice(start, next);
    if (seg[0] === 13 && seg[1] === 10) seg = seg.slice(2); // \r\n ابتدای بخش
    if (seg.length >= 2 && seg[seg.length - 2] === 13 && seg[seg.length - 1] === 10) {
      seg = seg.slice(0, -2); // \r\n انتهای بخش
    }
    const headerEnd = seg.indexOf('\r\n\r\n');
    if (headerEnd !== -1) {
      const headerStr = seg.slice(0, headerEnd).toString('utf8');
      const nameM = /name="([^"]*)"/.exec(headerStr);
      const fileM = /filename="([^"]*)"/.exec(headerStr);
      const typeM = /content-type:\s*([^\r\n]+)/i.exec(headerStr);
      parts.push({
        name: nameM?.[1] ?? '',
        filename: fileM?.[1] ?? '',
        contentType: typeM?.[1]?.trim() ?? '',
        content: seg.slice(headerEnd + 4),
      });
    }
    pos = next;
  }
  return parts;
}

/** ذخیرهٔ فایل در حافظه و ساخت رکورد پاسخ آپلود */
function storeUpload(file, fieldKey) {
  const ext = (file.filename.match(/\.(png|jpe?g|webp|gif)$/i)?.[1] ?? 'png').toLowerCase();
  const name = `u${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const mime = file.contentType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  UPLOADS.set(name, { buf: file.content, mime });
  return {
    id: name,
    fieldKey,
    url: `/api/uploads/${name}`,
    thumbUrl: null,
    description: null,
    size: file.content.length,
    mimeType: mime,
    createdAt: new Date().toISOString(),
  };
}

// وضعیت احراز هویت کاربر نشست — پیش‌نمایش جریان ارسال/بررسی مدارک
const VERIFICATION = {
  status: 'none', // none | pending | approved | rejected
  accountType: 'personal',
  submittedAt: null,
  reviewedAt: null,
  rejectionReason: null,
  docs: {},
};

// ─── نظرات نمونه — تا ستاره/توزیع/کارت‌های نظر دیده شود. جداسازی نقش‌ها
// (خواستهٔ مالک ۱۱-۱۱): نظر درباره کاربر «به‌عنوان فروشنده» جدا از نظر درباره
// او «به‌عنوان خریدار» است — ممکن است خریدار خوبی باشد ولی فروشنده خوبی نه.
// subject: 'seller' (نویسنده=خریدار) | 'buyer' (نویسنده=فروشنده) ───
const distFrom = (rows) =>
  [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: rows.filter((x) => x.rating === r).length }));
const summarize = (rows) => ({
  avg: rows.length ? Math.round((rows.reduce((a, x) => a + x.rating, 0) / rows.length) * 10) / 10 : 0,
  count: rows.length,
  distribution: distFrom(rows),
});
const SELLER_REVIEWS_SEED = [
  {
    id: 'r1', rating: 5, status: 'approved',
    text: 'کیفیت عالی و ارسال سریع؛ تقریباً یک ساله هر ماه از این فروشنده می‌خرم و همیشه همون چیزی می‌رسه که توافق کردیم.',
    createdAt: '2026-10-12 10:00:00',
    author: { id: '90', userName: 'buyer1', firstName: 'علی', lastName: 'محمدی', avatarUrl: null },
  },
  {
    id: 'r2', rating: 5, status: 'approved',
    text: 'قیمت مناسب و بسته‌بندی مرتب. برای سوپرمارکت ما عالی بود.',
    createdAt: '2026-10-05 12:30:00',
    author: { id: '91', userName: 'buyer2', firstName: 'زهرا', lastName: 'کریمی', avatarUrl: null },
  },
  {
    id: 'r3', rating: 3, status: 'approved',
    text: 'کالا خوب بود ولی ارسال یک روز دیرتر شد.',
    createdAt: '2026-09-18 09:15:00',
    author: { ...ME },
  },
];
const BUYER_REVIEWS_SEED = [
  {
    id: 'br1', rating: 5, status: 'approved',
    text: 'پرداخت به‌موقع و بدون چونه؛ سفارش و تحویل هم دقیق همان چیزی بود که توافق شد. خریدار قابل اعتماد.',
    createdAt: '2026-10-20 16:00:00',
    author: { id: '51', userName: 'seller1', firstName: 'کاربر', lastName: 'تستی 1', avatarUrl: null },
  },
  {
    id: 'br2', rating: 4, status: 'approved',
    text: 'هماهنگی خوب و تسویه نقدی در لحظه تحویل. فقط ساعت دریافت بارها کمی تغییر می‌کند.',
    createdAt: '2026-10-02 11:20:00',
    author: { id: '52', userName: 'seller2', firstName: 'کاربر', lastName: 'تستی 2', avatarUrl: null },
  },
  {
    id: 'br3', rating: 5, status: 'approved',
    text: 'سفارش‌های ماهانه‌شان مشخص و منظم است؛ بارگیری سریع و بدون معطلی. یکی از بهترین مشتری‌های ما.',
    createdAt: '2026-09-25 09:40:00',
    author: { ...ME },
  },
];
const REVIEWS = {
  seller: { summary: summarize(SELLER_REVIEWS_SEED), items: SELLER_REVIEWS_SEED },
  buyer: { summary: summarize(BUYER_REVIEWS_SEED), items: BUYER_REVIEWS_SEED },
};
// نظر خودم — upsert واقعی per (هدف، نقش)؛ تا پیش‌نمایش «در انتظار تایید» کار کند
const MY_REVIEWS = new Map(); // `${ME.userName}:${targetUserName}:${subject}` -> row

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
  // ── سرو فایل آپلودی (GET) — پیش از سوئیچ JSON؛ آدرس نسبی /api/uploads/*
  //    از طریق پروکسی نکست از هر میزبانی بارگذاری می‌شود ──
  if (req.method === 'GET' && url.pathname.startsWith('/api/v1/uploads/')) {
    const name = url.pathname.slice('/api/v1/uploads/'.length);
    const f = UPLOADS.get(name);
    if (!f) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: false, message: 'فایل یافت نشد.' }));
      return;
    }
    res.writeHead(200, {
      'Content-Type': f.mime,
      'Content-Length': f.buf.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    res.end(f.buf);
    return;
  }
  const path = url.pathname.replace('/api/v1/', '');
  // ── بدنه — Buffer (فایل‌های باینری سالم می‌مانند؛ multipart جداگانه) ──
  const rawBody = await new Promise((resolve) => {
    let buf = Buffer.alloc(0);
    req.on('data', (c) => {
      buf = Buffer.concat([buf, c]);
    });
    req.on('end', () => resolve(buf));
    req.on('error', () => resolve(buf));
  });
  let body = {};
  try {
    body = JSON.parse(rawBody.toString('utf8') || '{}');
  } catch {
    body = {};
  }
  /** فایل multipart درخواست جاری — فقط برای مسیرهای آپلود */
  const multipartFile = (fieldName) => {
    const parts = parseMultipart(rawBody, req.headers['content-type']);
    if (!parts) return null;
    return parts.find((p) => p.name === fieldName && p.content.length > 0) ?? null;
  };
  let data = [];
  switch (path) {
    // ─── ورود سشن (پیش‌نمایش) — هر شماره‌ای = کاربر نشست استاب ───
    case 'auth/login':
      data = {
        isNewUser: false,
        hasPassword: false,
        accessToken: 'stub-token-' + Date.now(),
        refreshToken: 'stub-refresh-' + Date.now(),
      };
      break;
    case 'auth/refreshToken':
      data = {
        accessToken: 'stub-token-' + Date.now(),
        refreshToken: 'stub-refresh-' + Date.now(),
      };
      break;
    case 'auth/logout':
      data = { ok: true };
      break;
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
      // گیت امکان تماس (خواستهٔ مالک ۴-۱۱) — کاربر خاموش کرده = شماره نمی‌آید؛
      // پیام روشن می‌گیرد که با چت ادامه دهد
      if (u && u.allow_calls === false) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: false,
          code: 'CALLS_DISABLED',
          message: 'این کاربر امکان تماس تلفنی را غیرفعال کرده است؛ می‌توانید با او چت کنید.',
        }));
        return;
      }
      data = u
        ? { sellerId: u.id, phone: '09120000000', firstName: u.firstName, lastName: u.lastName, userName: u.userName, callLogged: false, callsLeftToday: 20 }
        : null;
      break;
    }
    // نظرات — subject جدا می‌کند «درباره فروشنده» از «درباره خریدار» (مالک ۱۱-۱۱)
    case 'reviews/getSellerReviews': {
      const subject = body.subject === 'buyer' ? 'buyer' : 'seller';
      const R = REVIEWS[subject];
      const target = String(body.userName ?? '');
      const my = MY_REVIEWS.get(`${ME.userName}:${target}:${subject}`) ?? null;
      data = {
        summary: R.summary,
        items: R.items,
        myReview: my,
        total: R.items.length,
        page: 1,
        perPage: 5,
        pageCount: 1,
      };
      break;
    }
    // ثبت/ویرایش نظر من — upsert per (هدف، نقش)؛ قانون انتشار: pending تا تایید ادمین
    case 'reviews/addSellerReview': {
      const subject = body.subject === 'buyer' ? 'buyer' : 'seller';
      const rating = Math.min(5, Math.max(1, Number(body.rating) || 0));
      const text = String(body.text ?? '').trim();
      if (text.length < 3) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: false,
          message: subject === 'buyer'
            ? 'متن نظر درباره این خریدار خیلی کوتاه است (حداقل ۳ نویسه).'
            : 'متن نظر خیلی کوتاه است (حداقل ۳ نویسه).',
        }));
        return;
      }
      const key = `${ME.userName}:${String(body.userName ?? '')}:${subject}`;
      const prev = MY_REVIEWS.get(key);
      const row = {
        id: prev?.id ?? 'my' + Date.now().toString(36),
        rating,
        text,
        status: 'pending',
        author: { ...ME },
        createdAt: prev?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      MY_REVIEWS.set(key, row);
      data = row;
      break;
    }
    case 'users/getProfile': data = { user: PROFILE }; break;
    // ذخیرهٔ ویرایش پروفایل — اینجا فقط فیلدهایی که پیش‌نمایش به آن‌ها وابسته
    // است ماندگار می‌شوند؛ مهم‌تر از همه allow_calls (خواستهٔ مالک ۴-۱۱) که
    // دکمهٔ تماس کاتالوگ/دفتر همان لحظه خاموش/روشن می‌شود
    case 'users/updateProfile': {
      if (body.allow_calls !== undefined) {
        const allow = body.allow_calls === true;
        PROFILE.allow_calls = allow;
        ME.allow_calls = allow;
        const meSeller = SELLERS.get(ME.userName);
        if (meSeller) meSeller.allow_calls = allow;
      }
      data = { user: PROFILE };
      break;
    }
    // ─── دفتر خرید (خواستهٔ مالک ۱۰-۱۱ دور ۵) — خریدار کالاهای دوره‌ای خود ───
    case 'buyers/getMyBook': {
      data = { max: 15, items: BUYER_BOOK_ITEMS.get(ME.userName) ?? [] };
      break;
    }
    case 'buyers/saveMyBook': {
      const rows = Array.isArray(body.items) ? body.items : [];
      const clean = rows.slice(0, 15).map((r) => {
        const cat = catById(r.categoryId);
        // نام/مسیر/واحد از درخت می‌آید؛ کالای تازه «در انتظار تایید» است
        return mkBookItem(
          Number(r.categoryId) || 0,
          cat?.category_name ?? 'کالا',
          cat ? (catById(cat.parent_id)?.category_name ?? cat.category_name) : '—',
          cat?.parent_id != null ? (catById(cat.parent_id)?.category_name ?? '') : '',
          cat?.unit ?? 'کیلوگرم',
          Number(r.minAmount) || 0,
          r.period ?? 'monthly',
          r.productType?.trim() || null,
          'pending',
        );
      });
      BUYER_BOOK_ITEMS.set(ME.userName, clean);
      data = { saved: clean.length };
      break;
    }
    case 'buyers/directory': {
      const all = [];
      for (const [userName, rows] of BUYER_BOOK_ITEMS) {
        const u = findUser(userName);
        if (!u) continue;
        const st = ensureBookSettings(userName);
        for (const it of rows) {
          if (it.status !== 'confirmed') continue;
          all.push({
            id: `${userName}-${it.categoryId}`,
            buyerId: u.id ?? userName,
            buyerName: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
            role: u.role === 'خرده‌خریدار' ? 'خرده‌خریدار' : 'عمده‌خریدار',
            categoryId: it.categoryId,
            categoryName: it.name,
            rootName: it.rootName,
            categoryPath: [it.rootName, it.parentName].filter(Boolean).join(' / '),
            unit: it.unit,
            minAmount: it.minAmount,
            period: it.period,
            productType: it.productType,
            province: u.provinceName ?? null,
            city: u.cityName ?? null,
            lastActiveAt: u.lastActiveAt ?? '2026-11-01T10:00:00.000Z',
            activeRecently: u.activeRecently ?? false,
            stale: u.stale ?? false,
            bookId: st.bookId,
          });
        }
      }
      let filtered = all;
      if (body.categoryId != null) {
        const ids = subtreeIdsById(body.categoryId);
        if (ids.size > 0) filtered = filtered.filter((x) => ids.has(x.categoryId));
      }
      if (body.period) filtered = filtered.filter((x) => x.period === body.period);
      if (body.provinceId != null) {
        const pv = PROVINCES.find((p) => p.id === Number(body.provinceId));
        if (pv) filtered = filtered.filter((x) => x.province === pv.province_name);
      }
      if (body.cityId != null) {
        const ct = CITIES.find((c) => c.id === Number(body.cityId));
        if (ct) filtered = filtered.filter((x) => x.city === ct.city_name);
      }
      if (body.s) {
        const q = String(body.s).trim();
        filtered = filtered.filter((x) =>
          [x.categoryName, x.categoryPath, x.productType, x.buyerName].some(
            (v) => v && String(v).includes(q),
          ),
        );
      }
      const perPage = Math.max(1, Number(body.perPage) || 12);
      const page = Math.max(1, Number(body.page) || 1);
      data = {
        items: filtered.slice((page - 1) * perPage, page * perPage),
        total: filtered.length,
        page,
        perPage,
        buyRequestCount: null,
      };
      break;
    }
    // گیت بستهٔ فعال — پنل خریداران (خواستهٔ مالک ۷-۱۱)
    case 'buyers/getMyOfferQuota': {
      data = { isFeatured: ME_HAS_PACKAGE, pakageType: 3, walletBalance: 500000 };
      break;
    }
    // پیشنهادهای تامین ارسالی/دریافتی و گفتگوهای فوری — شکل کامل (items همیشه
    // هست؛ قبلاً [] برمی‌گشت و صفحهٔ خریداران با TypeError می‌افتاد)
    case 'buyers/getMySentOffers':
      data = { items: [], total: 0, page: 1, perPage: Number(body.perPage) || 20, categories: [] };
      break;
    case 'buyers/getMyUrgentChats':
      data = { items: [] };
      break;
    case 'buyers/getMyReceivedOffers':
      data = { items: [], total: 0, page: 1, perPage: 20, categories: [] };
      break;
    case 'buy-requests/getMyBuyRequests':
      data = { items: [], counts: { confirmed: 0, pending: 0, rejected: 0 } };
      break;
    case 'packages/getMyPackage': {
      data = {
        pakageType: 3,
        isActive: ME_HAS_PACKAGE,
        expiresAt: '2027-06-01T00:00:00.000Z',
        startedAt: '2026-06-01T00:00:00.000Z',
        totalDays: 365,
        daysLeft: 203,
        planTitle: 'اشتراک یک‌ساله',
        pendingCount: 0,
        features: { productCapacity: -1, canSeeBuyers: ME_HAS_PACKAGE, unlimitedBuyRequests: true },
      };
      break;
    }
    // ─── دفتر خرید — صفحهٔ عمومی /b/{id} و ذخیرهٔ فروشنده‌ها ───
    case 'buyerBook/resolvePublicId': {
      const userName = resolveBookUserName(body.id);
      const u = userName ? findUser(userName) : null;
      if (!userName || !u) {
        data = null;
      } else {
        data = {
          userName,
          name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
          settings: ensureBookSettings(userName),
        };
      }
      break;
    }
    case 'buyerBook/getPublic': {
      const userName = resolveBookUserName(body.id);
      const u = userName ? findUser(userName) : null;
      if (!userName || !u) {
        data = null;
        break;
      }
      // گیت (خواستهٔ مالک): فقط مالک دفتر یا دارندهٔ بستهٔ فعال
      if (userName !== ME.userName && !ME_HAS_PACKAGE) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: false,
          code: 'NEED_PACKAGE',
          message: 'مشاهدهٔ دفاتر خرید ویژهٔ کاربران دارندهٔ بستهٔ اشتراک فعال ایمچ است.',
        }));
        return;
      }
      const items = (BUYER_BOOK_ITEMS.get(userName) ?? []).filter((i) => i.status === 'confirmed');
      const days = Math.max(
        1,
        Math.round(
          (Date.now() - new Date(String(u.createdAt ?? '2025-01-01 09:00:00').replace(' ', 'T') + 'Z').getTime()) / 86_400_000,
        ),
      );
      data = {
        buyer: {
          userName,
          id: u.id ?? userName,
          firstName: u.firstName,
          lastName: u.lastName,
          avatarUrl: u.avatarUrl ?? null,
          role: u.role === 'خرده‌خریدار' ? 'خرده‌خریدار' : 'عمده‌خریدار',
          provinceName: u.provinceName ?? null,
          cityName: u.cityName ?? null,
          createdAt: u.createdAt ?? '2025-01-01 09:00:00',
          daysInImach: days,
          lastActiveAt: u.lastActiveAt ?? null,
          activeRecently: u.activeRecently ?? false,
          // مشخصات کسب‌وکار (خواستهٔ مالک ۱۱-۱۱) — عین کاتالوگ: توضیحات،
          // احراز هویت، مجوزها و تصاویر + هر اطلاعاتی که برای فروشنده مهم است
          isVerified: u.isVerified ?? false,
          isCompany: u.isCompany ?? false,
          companyName: u.companyName ?? null,
          businessCategory: u.businessCategory ?? null,
          businessDesc: u.businessDesc ?? null,
          address: u.address ?? null,
          gallery: u.gallery ?? [],
          certificates: u.certificates ?? [],
          // امکان تماس سراسری (پروفایل → allow_calls) — دفتر و کاتالوک هر دو
          // آن را می‌بینند؛ سوییچ مخصوص دفتر (settings.allowCalls) جدا است
          allowCalls: u.allow_calls !== false,
        },
        items,
        saversCount: countBookSavers(userName),
        settings: ensureBookSettings(userName),
      };
      break;
    }
    case 'buyerBook/getMySettings': {
      ensureMyBookSettings();
      data = { settings: resolvedBookSettings(ME.userName) };
      break;
    }
    case 'buyerBook/updateSettings': {
      ensureMyBookSettings();
      const cur = BUYER_BOOK_SETTINGS.get(ME.userName) ?? {};
      const out = { ...cur };
      if (body.bookId !== undefined) {
        const id = String(body.bookId ?? '').trim().toLowerCase();
        if (!/^[a-z0-9-]{3,30}$/.test(id) || /^-|-$/.test(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: false,
            message: 'آیدی دفتر خرید باید ۳ تا ۳۰ نویسه باشد؛ فقط حروف کوچک لاتین، رقم و خط تیره (-).',
          }));
          return;
        }
        const owner = bookIdOwner(id, ME.userName);
        if (owner) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: false,
            message: 'این آیدی قبلاً گرفته شده است؛ یکی دیگر انتخاب کنید.',
          }));
          return;
        }
        out.bookId = id;
      }
      if (body.brandColor !== undefined) {
        const bc = String(body.brandColor ?? '').trim();
        if (bc && !/^#[0-9a-fA-F]{6}$/.test(bc)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: false, message: 'رنگ برند نامعتبر است (مثال: #0891b2).' }));
          return;
        }
        out.brandColor = bc || null;
      }
      if (body.logo !== undefined) {
        const lg = String(body.logo ?? '').trim();
        if (lg.length > 600) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: false, message: 'آدرس لوگو نامعتبر است.' }));
          return;
        }
        out.logo = lg || null;
      }
      // عنوان بنر دفتر (خواستهٔ مالک ۱۱-۱۱) — متن معرفی دفتر روی جلد برند
      if (body.bannerTitle !== undefined) {
        const t = String(body.bannerTitle ?? '').trim();
        if (t.length > 120) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: false, message: 'عنوان بنر دفتر حداکثر ۱۲۰ نویسه است.' }));
          return;
        }
        out.bannerTitle = t || null;
      }
      // سمت مسئول خرید (خواستهٔ مالک ۱۱-۱۱) — کنار نام خریدار روی جلد دفتر
      if (body.managerTitle !== undefined) {
        const t = String(body.managerTitle ?? '').trim();
        if (t.length > 40) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: false, message: 'عنوان سمت حداکثر ۴۰ نویسه است.' }));
          return;
        }
        out.managerTitle = t || null;
      }
      // شرایط تامین (خواستهٔ مالک ۱۱-۱۱) — متنی که تامین‌کنندگان در دفتر می‌بینند
      if (body.supplyTerms !== undefined) {
        const t = String(body.supplyTerms ?? '').trim();
        if (t.length > 600) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: false, message: 'شرایط تامین حداکثر ۶۰۰ نویسه است.' }));
          return;
        }
        out.supplyTerms = t || null;
      }
      // دکمهٔ تماس در دفتر خرید (خواستهٔ مالک ۱۱-۱۱) — خاموش = تامین‌کنندگان
      // فقط چت می‌بینند؛ کلید مستقل از کاتالوگ و پروفایل
      if (body.allowCalls !== undefined) out.allowCalls = body.allowCalls === true;
      BUYER_BOOK_SETTINGS.set(ME.userName, out);
      data = { settings: resolvedBookSettings(ME.userName) };
      break;
    }
    case 'buyerBook/isSaved':
      data = { saved: BOOK_SAVES.has(`${ME.userName}:${body.userName}`) };
      break;
    case 'buyerBook/toggleSave': {
      const key = `${ME.userName}:${body.userName}`;
      if (BOOK_SAVES.has(key)) {
        BOOK_SAVES.delete(key);
        data = { saved: false };
      } else {
        BOOK_SAVES.set(key, new Date().toISOString());
        data = { saved: true };
      }
      break;
    }
    case 'buyerBook/getMySaved': {
      const items = [];
      for (const [key, savedAt] of BOOK_SAVES) {
        if (!key.startsWith(`${ME.userName}:`)) continue;
        const buyerUserName = key.slice(ME.userName.length + 1);
        const u = findUser(buyerUserName);
        if (!u) continue;
        const itemCount = (BUYER_BOOK_ITEMS.get(buyerUserName) ?? []).filter(
          (i) => i.status === 'confirmed',
        ).length;
        items.push({
          buyerUserName,
          buyerId: u.id ?? buyerUserName,
          buyerName: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
          avatarUrl: u.avatarUrl ?? null,
          cityName: u.cityName ?? null,
          itemCount,
          bookId: ensureBookSettings(buyerUserName).bookId,
          savedAt,
          lastActiveAt: u.lastActiveAt ?? null,
        });
      }
      data = { items };
      break;
    }
    // ─── آپلود تصویر — قرارداد uploads/uploadImage بک‌اند واقعی ───
    case 'uploads/uploadImage': {
      const file = multipartFile('file');
      if (!file) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: false,
          code: 'MULTIPART_TRUNCATED',
          message: 'فایلی دریافت نشد — دوباره تلاش کنید.',
        }));
        return;
      }
      if (file.content.length > 5 * 1024 * 1024) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: false, message: 'حجم فایل باید کمتر از ۵ مگابایت باشد.' }));
        return;
      }
      const key = url.searchParams.get('key') ?? 'file';
      data = storeUpload(file, key);
      break;
    }
    // ─── احراز هویت — جریان کامل مدارک در پیش‌نمایش ───
    case 'verification/getMyVerification': {
      data = {
        status: VERIFICATION.status,
        accountType: VERIFICATION.accountType,
        submittedAt: VERIFICATION.submittedAt,
        reviewedAt: VERIFICATION.reviewedAt,
        rejectionReason: VERIFICATION.rejectionReason,
        docs: VERIFICATION.docs,
      };
      break;
    }
    case 'verification/submitVerification': {
      const front = multipartFile('nationalCardFront');
      const back = multipartFile('nationalCardBack');
      const selfie = multipartFile('selfieWithCard');
      if (!front || !back || !selfie) {
        // همان خطای بک‌اند واقعی وقتی استریم ناقص برسد (گزارش مالک ۱۰-۱۱)
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: false,
          code: 'MULTIPART_TRUNCATED',
          message: 'آپلود ناقص بود — دوباره تلاش کنید.',
        }));
        return;
      }
      const notice = multipartFile('registrationNotice');
      VERIFICATION.status = 'pending';
      VERIFICATION.accountType = notice ? 'legal' : 'personal';
      VERIFICATION.submittedAt = new Date().toISOString();
      VERIFICATION.docs = {
        nationalCardFront: storeUpload(front, 'nationalCardFront'),
        nationalCardBack: storeUpload(back, 'nationalCardBack'),
        selfieWithCard: storeUpload(selfie, 'selfieWithCard'),
        registrationNotice: notice ? storeUpload(notice, 'registrationNotice') : null,
      };
      data = {
        status: VERIFICATION.status,
        accountType: VERIFICATION.accountType,
        submittedAt: VERIFICATION.submittedAt,
        reviewedAt: null,
        rejectionReason: null,
        docs: VERIFICATION.docs,
      };
      break;
    }
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
      // دکمهٔ تماس در کاتالوگ (خواستهٔ مالک ۱۱-۱۱) — کلید مستقل از دفتر خرید
      // و پروفایل؛ خاموش = خریداران در کاتالوگ فقط چت می‌بینند
      if (body.allowCalls !== undefined) out.allowCalls = body.allowCalls === true;
      CATALOG_SETTINGS.set(ME.userName, out);
      data = { settings: resolvedSettings(ME.userName) };
      break;
    }
    // صفحهٔ عمومی /c/{id} — id می‌تواند آیدی سفارشی یا userName باشد
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
    case 'chat/uploadFile': {
      // multipart واقعی خوانده می‌شود؛ فایل در حافظه ذخیره و سرو می‌شود
      const file = multipartFile('file');
      if (!file) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: false,
          code: 'MULTIPART_TRUNCATED',
          message: 'فایلی دریافت نشد — دوباره تلاش کنید.',
        }));
        return;
      }
      const rec = storeUpload(file, 'chat');
      data = {
        url: rec.url,
        key: rec.id,
        name: file.filename || rec.id,
        size: rec.size,
        mime: rec.mimeType,
        kind: rec.mimeType.startsWith('image/') ? 'image' : rec.mimeType.startsWith('video/') ? 'video' : 'file',
      };
      break;
    }
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
