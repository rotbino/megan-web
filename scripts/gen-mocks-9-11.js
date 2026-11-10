/**
 * مولد ماک برای تست UI دور ۹-۱۱ (پیگیری‌ها + خریداران) — خروجی در
 * scripts/ui-check/mocks/. تاریخ‌ها «همین حالا» ساخته می‌شوند تا
 * «ذخیره لحظه‌ای پیش» و برچسب‌های فردا/پس‌فردا واقعی تست شوند.
 * قالب تاریخ = SQL بک‌اند «YYYY-MM-DD HH:mm:ss» در UTC (بدون نشان منطقه).
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'ui-check', 'mocks');
fs.mkdirSync(OUT, { recursive: true });

const pad = (n) => String(n).padStart(2, '0');
/** Date → «YYYY-MM-DD HH:mm:ss» UTC */
const sql = (d) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
  `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;

const now = new Date();
const hoursAgo = (h) => new Date(now.getTime() - h * 3600_000);
const daysFromNow = (d) => new Date(now.getTime() + d * 86_400_000);
const daysAgo = (d) => new Date(now.getTime() - d * 86_400_000);

const W = (name, data) =>
  fs.writeFileSync(path.join(OUT, name), JSON.stringify({ status: true, data }, null, 1));

// ─── پروفایل فروشنده (برای پنل + هدر) ───────────────────────────────────
W('profile.json', {
  user: {
    id: 'u-seller-01',
    phone: '09130000001',
    user_name: 'aliakhondi',
    first_name: 'علی',
    last_name: 'آخوندی',
    sex: 'm',
    role: 'seller',
    has_password: true,
    is_verified: true,
    is_buyer: false,
    is_seller: true,
    wallet_balance: 480000,
    avatar_url: null,
    business_desc: 'پسته اکبری و احمدآقایی',
    province_id: 8,
    city_id: 801,
    province: 'تهران',
    city: 'تهران',
    product_count: 1,
    created_at: sql(daysAgo(400)),
    updated_at: sql(daysAgo(2)),
  },
  profile: {},
  gallery: [],
  certificates: [],
});

// ─── بسته فعال ────────────────────────────────────────────────────────────
W('package.json', {
  pakageType: 1,
  isActive: true,
  expiresAt: sql(daysFromNow(40)),
  startedAt: sql(daysAgo(20)),
  totalDays: 60,
  daysLeft: 40,
  planTitle: 'بستهٔ دو ماهه',
  pendingCount: 0,
  features: { productCapacity: 10, canSeeBuyers: true, unlimitedBuyRequests: true },
});

// ─── دسته‌ها + استان‌ها ────────────────────────────────────────────────────
W('categories.json', [
  {
    id: 1, category_name: 'کشاورزی', slug: 'agri', unit: 'کیلوگرم', min: 100,
    example: null, parent_id: null, score: 100,
    children: [
      { id: 11, category_name: 'پسته', slug: 'pistachio', unit: 'کیلوگرم', min: 50, example: 'اکبری', parent_id: 1, score: 90 },
      { id: 12, category_name: 'خرما', slug: 'date', unit: 'کیلوگرم', min: 100, example: 'خازنی', parent_id: 1, score: 80 },
    ],
  },
  {
    id: 2, category_name: 'خشکبار', slug: 'nuts', unit: 'کیلوگرم', min: 30,
    example: null, parent_id: null, score: 95,
    children: [
      { id: 21, category_name: 'بادام', slug: 'almond', unit: 'کیلوگرم', min: 30, example: 'مامایی', parent_id: 2, score: 85 },
    ],
  },
]);
W('provinces.json', [
  { id: 8, province_name: 'تهران' },
  { id: 4, province_name: 'خراسان رضوی' },
]);

// ─── پیگیری‌ها: پرونده‌ها + موارد ─────────────────────────────────────────
W('follow-folders.json', [
  {
    id: 'f1', name: 'پسته', itemCount: 3,
    statusCounts: { reviewing: 2, contacted: 1 }, updatedAt: sql(now),
  },
  {
    id: 'f2', name: 'بادام', itemCount: 1,
    statusCounts: { negotiating: 1 }, updatedAt: sql(hoursAgo(30)),
  },
]);

const br = (over) => ({
  id: over.id, name: over.name ?? null, categoryId: over.categoryId,
  subcategoryName: over.subcategoryName, requirementAmount: over.requirementAmount,
  unit: over.unit, myuserId: over.myuserId, userName: over.userName ?? null,
  firstName: over.firstName, lastName: over.lastName, city: over.city,
  provinceId: over.provinceId ?? null, cityId: over.cityId ?? null,
  province: over.province ?? null, isVerified: over.isVerified ?? true,
  createdAt: over.createdAt,
});

// هدف آگهی فروش (دید خریدار) — برای ردیف product
const productTarget = {
  id: 9001, productName: 'پسته اکبری درجه یک', slug: 'pistachio-akbari',
  description: 'پسته اکبری تازه امسال', stock: 2000, minSalePrice: 850000,
  minSaleAmount: 100, unit: 'کیلوگرم', categoryId: 1, categoryName: 'کشاورزی',
  subCategoryId: 11, subCategoryName: 'پسته', provinceId: 8, provinceName: 'تهران',
  cityId: 801, cityName: 'تهران', myuserId: 'u-seller-02',
  seller: { id: 'u-seller-02', userName: 'rezaee', firstName: 'رضا', lastName: 'رضایی', activePakageType: 2, isVerified: true },
  isLadder: false, isElevated: false, hasVideo: false, isOld: false, viewCount: 210,
  createdAt: sql(daysAgo(10)), updatedAt: sql(daysAgo(1)), photos: [], photoThumbs: [],
  status: 'confirmed',
};

W('follow-items.json', [
  {
    // تازه ذخیره شده + یادآور فردا — نباید همین حالا در «امروز» بیاید
    id: 'i1', folderId: 'f1', folderName: 'پسته', targetType: 'buy_request', targetId: 501,
    status: 'reviewing', priority: 2, nextFollowAt: sql(daysFromNow(1)),
    notes: [], createdAt: sql(now), updatedAt: sql(now),
    target: br({
      id: 501, name: 'اکبری', categoryId: 1, subcategoryName: 'پسته',
      requirementAmount: 500, unit: 'کیلوگرم', myuserId: 'u-b-01', userName: 'mohammadi',
      firstName: 'محمد', lastName: 'محمدی', city: 'کرمان', provinceId: 5,
      createdAt: sql(hoursAgo(5)),
    }),
  },
  {
    // یادآور سررسیده (۲ ساعت پیش) — کهربایی «پیگیری امروز» + شمار نوار امروز
    id: 'i2', folderId: 'f1', folderName: 'پسته', targetType: 'buy_request', targetId: 502,
    status: 'contacted', priority: 1, nextFollowAt: sql(hoursAgo(2)),
    notes: [
      { id: 'n1', text: 'قیمت ۴۸ هزار گفت، جمعه دوباره تماس می‌گیرم.', createdAt: sql(hoursAgo(26)) },
      { id: 'n2', text: 'گفت ۱۰ تن می‌خواهد.', createdAt: sql(hoursAgo(2)) },
    ],
    createdAt: sql(daysAgo(3)), updatedAt: sql(hoursAgo(2)),
    target: br({
      id: 502, name: 'احمدآقایی', categoryId: 1, subcategoryName: 'پسته',
      requirementAmount: 10000, unit: 'کیلوگرم', myuserId: 'u-b-02', userName: 'karimi',
      firstName: 'سمیه', lastName: 'کریمی', city: 'رفسنجان', provinceId: 5,
      createdAt: sql(daysAgo(4)),
    }),
  },
  {
    // یادآور پس‌فردا — برچسب تازهٔ «پیگیری پس‌فردا»
    id: 'i3', folderId: 'f1', folderName: 'پسته', targetType: 'buy_request', targetId: 503,
    status: 'negotiating', priority: 3, nextFollowAt: sql(daysFromNow(2)),
    notes: [], createdAt: sql(daysAgo(6)), updatedAt: sql(daysAgo(1)),
    target: br({
      id: 503, name: null, categoryId: 1, subcategoryName: 'پسته',
      requirementAmount: 300, unit: 'کیلوگرم', myuserId: 'u-b-03',
      firstName: 'حسین', lastName: 'نوری', city: 'یزد',
      createdAt: sql(daysAgo(7)),
    }),
  },
  {
    // آگهی فروش (دید خریدار) — بدون یادآور، ذخیرهٔ ۳ روز پیش
    id: 'i4', folderId: 'f2', folderName: 'بادام', targetType: 'product', targetId: 9001,
    status: 'reviewing', priority: 2, nextFollowAt: null,
    notes: [], createdAt: sql(daysAgo(3)), updatedAt: sql(daysAgo(3)),
    target: productTarget,
  },
]);

// جهش‌های پیگیری (setNextFollow و…) — موفقِ خالی
W('ok-null.json', null);
W('ok-empty.json', {});

// ─── خریداران پنل: فوری + دوره‌ای ─────────────────────────────────────────
W('buy-requests.json', {
  items: [
    br({
      id: 601, name: 'اکبری', categoryId: 1, subcategoryName: 'پسته',
      requirementAmount: 800, unit: 'کیلوگرم', myuserId: 'u-b-11', userName: 'ahmadi',
      firstName: 'مریم', lastName: 'احمدی', city: 'دزفول', provinceId: 15,
      createdAt: sql(now), // «لحظه‌ای پیش» — تست RelativeTime
    }),
    br({
      id: 602, name: 'مامایی', categoryId: 2, subcategoryName: 'بادام',
      requirementAmount: 2000, unit: 'کیلوگرم', myuserId: 'u-b-12',
      firstName: 'کریم', lastName: 'زاده', city: 'سمنان', provinceId: 20, isVerified: false,
      createdAt: sql(hoursAgo(26)),
    }),
    br({
      id: 603, name: null, categoryId: 1, subcategoryName: 'خرما',
      requirementAmount: 5000, unit: 'کیلوگرم', myuserId: 'u-b-13', userName: 'salehi',
      firstName: 'نرگس', lastName: 'صالحی', city: 'بم', provinceId: 5,
      createdAt: sql(daysAgo(2)),
    }),
  ],
  total: 3, page: 1, pageCount: 1,
});

W('my-products.json', {
  items: [
    {
      id: 7001, productName: 'پسته اکبری ممتاز', slug: 'pistachio-akbari-premium',
      description: 'پسته اکبری ممتاز امسال', stock: 3000, minSalePrice: 900000,
      minSaleAmount: 50, unit: 'کیلوگرم', categoryId: 1, categoryName: 'کشاورزی',
      subCategoryId: 11, subCategoryName: 'پسته', provinceId: 8, provinceName: 'تهران',
      cityId: 801, cityName: 'تهران', myuserId: 'u-seller-01',
      seller: { id: 'u-seller-01', userName: 'aliakhondi', firstName: 'علی', lastName: 'آخوندی', activePakageType: 1, isVerified: true },
      isLadder: true, isElevated: false, hasVideo: false, isOld: false, viewCount: 540,
      createdAt: sql(daysAgo(90)), updatedAt: sql(daysAgo(3)), photos: [], status: 'confirmed',
    },
  ],
  counts: { confirmed: 1, pending: 0, rejected: 0, deleted: 0 },
  capacity: 10,
});

W('buyer-directory.json', {
  items: [
    {
      id: 'd1', buyerId: 'u-b-21', buyerName: 'شیرین پخش تهران', role: 'عمده‌خریدار',
      categoryId: 11, categoryName: 'پسته', rootName: 'کشاورزی', categoryPath: 'کشاورزی / پسته',
      unit: 'کیلوگرم', minAmount: 2000, period: 'monthly',
      province: 'تهران', city: 'تهران',
      lastActiveAt: sql(daysAgo(1)), activeRecently: true, stale: false,
    },
    {
      id: 'd2', buyerId: 'u-b-22', buyerName: 'حسن مرادی', role: 'خرده‌خریدار',
      categoryId: 21, categoryName: 'بادام', rootName: 'خشکبار', categoryPath: 'خشکبار / بادام',
      unit: 'کیلوگرم', minAmount: 150, period: 'quarterly',
      province: 'خراسان رضوی', city: 'مشهد',
      lastActiveAt: sql(daysAgo(120)), activeRecently: false, stale: true,
    },
  ],
  total: 2, page: 1, perPage: 24, buyRequestCount: 3,
});

W('quota.json', { isFeatured: true, pakageType: 1, walletBalance: 480000 });
W('sent-offers.json', { items: [], total: 0, page: 1, perPage: 20, categories: [] });
W('urgent-chats.json', { items: [] });
W('unread.json', { count: 0, chat: 0, support: 0, ticket: 0 });
W('buy-request-contact.json', {
  phone: '09121234567', firstName: 'مریم', lastName: 'احمدی', isVerified: true, isSelf: false,
});

console.log('mocks written to', OUT, '— now =', sql(now));
