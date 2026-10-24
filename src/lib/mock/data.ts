/**
 * دیتای نمونه مِگان — منطبق بر داده‌های واقعی استخراج‌شده از باسکول
 * (شناسه دسته‌ها/استان‌ها/ساختار آگهی‌ها عیناً از APIهای باسکول برداشته شده تا
 *  فاز مهاجرت واقعی بدون تغییر نگاشت انجام شود).
 */

import type { BuyRequest, Category, City, Product, Province, User } from '@/lib/types';

// ─── دسته‌بندی‌ها (شناسه‌های واقعی باسکول) ───────────────────────────

export const categories: Category[] = [
  // ریشه — ۱۰ دسته اصلی
  { id: 76, categoryName: 'کشاورزی', slug: 'کشاورزی', unit: 'کیلوگرم', min: 100, parentId: null, score: 0 },
  { id: 77, categoryName: 'فرآورده‌های غذایی', slug: 'فرآورده-های-غذایی', unit: 'کیلوگرم', min: 100, parentId: null, score: 0 },
  { id: 136, categoryName: 'فلزات، مواد معدنی و شیمیایی', slug: 'فلزات-مواد-معدنی-و-شیمیایی', unit: 'کیلوگرم', min: 100, parentId: null, score: 0 },
  { id: 329, categoryName: 'ماشین‌آلات و تجهیزات صنعتی', slug: 'ماشین-آلات-و-تجهیزات-صنعتی', unit: 'عدد', min: 1, parentId: null, score: 0 },
  { id: 734, categoryName: 'خانه و مصالح ساختمانی', slug: 'خانه-و-مصالح-ساختمانی', unit: 'کیلوگرم', min: 100, parentId: null, score: 0 },
  { id: 923, categoryName: 'لوازم خانگی و الکترونیکی', slug: 'لوازم-خانگی-و-الکترونیکی', unit: 'عدد', min: 10, parentId: null, score: 0 },
  { id: 924, categoryName: 'مد، پوشاک و پارچه', slug: 'مد-پوشاک-و-پارچه', unit: 'عدد', min: 50, parentId: null, score: 0 },
  { id: 996, categoryName: 'کیف و کفش', slug: 'کیف-و-کفش', unit: 'عدد', min: 50, parentId: null, score: 0 },
  { id: 997, categoryName: 'لوازم ورزشی، کادویی و اسباب‌بازی', slug: 'لوازم-ورزشی-کادویی-و-اسباب-بازی', unit: 'عدد', min: 10, parentId: null, score: 0 },
  { id: 998, categoryName: 'لوازم آرایشی، بهداشتی و سلامت', slug: 'لوازم-آرایشی-بهداشتی-و-سلامت', unit: 'عدد', min: 100, parentId: null, score: 0 },

  // سطح ۲ — کشاورزی (شناسه‌های واقعی)
  { id: 45, categoryName: 'خشکبار', slug: 'خشکبار', unit: 'کیلوگرم', min: 100, parentId: 76, score: 18 },
  { id: 1, categoryName: 'میوه', slug: 'میوه', unit: 'کیلوگرم', min: 100, parentId: 76, score: 5 },
  { id: 2, categoryName: 'صیفی', slug: 'صیفی', unit: 'کیلوگرم', min: 100, parentId: 76, score: 0 },
  { id: 42, categoryName: 'غلات', slug: 'غلات', unit: 'کیلوگرم', min: 100, parentId: 76, score: 0 },
  { id: 46, categoryName: 'ادویه', slug: 'ادویه', unit: 'کیلوگرم', min: 100, parentId: 76, score: 0 },
  { id: 47, categoryName: 'دامپروری', slug: 'دامپروری', unit: 'کیلوگرم', min: 100, parentId: 76, score: 0 },
  { id: 71, categoryName: 'حبوبات', slug: 'حبوبات', unit: 'کیلوگرم', min: 100, parentId: 76, score: 0 },
  { id: 111, categoryName: 'بذر و نهال', slug: 'بذر-و-نهال', unit: 'عدد', min: 1000, parentId: 76, score: 0 },

  // سطح ۳ — خشکبار (شناسه‌ها و scoreهای واقعی باسکول)
  { id: 57, categoryName: 'میوه خشک', slug: 'میوه-خشک', unit: 'کیلوگرم', min: 100, example: 'قیسی', parentId: 45, score: 8272 },
  { id: 44, categoryName: 'پسته', slug: 'پسته', unit: 'کیلوگرم', min: 500, example: 'فندقی', parentId: 45, score: 5861 },
  { id: 53, categoryName: 'کشمش', slug: 'کشمش', unit: 'کیلوگرم', min: 200, parentId: 45, score: 3431 },
  { id: 55, categoryName: 'بادام', slug: 'بادام', unit: 'کیلوگرم', min: 200, parentId: 45, score: 3239 },
  { id: 56, categoryName: 'تخمه آفتابگردان', slug: 'تخمه-آفتابگردان', unit: 'کیلوگرم', min: 500, parentId: 45, score: 3136 },
  { id: 54, categoryName: 'گردو', slug: 'گردو', unit: 'کیلوگرم', min: 200, parentId: 45, score: 2726 },
  { id: 58, categoryName: 'زرشک', slug: 'زرشک', unit: 'کیلوگرم', min: 100, parentId: 45, score: 925 },
  { id: 101, categoryName: 'فندق', slug: 'فندق', unit: 'کیلوگرم', min: 200, parentId: 45, score: 593 },

  // سطح ۳ — میوه
  { id: 22, categoryName: 'خرما', slug: 'خرما', unit: 'کیلوگرم', min: 500, example: 'مضافتی', parentId: 1, score: 4210 },
  { id: 23, categoryName: 'سیب', slug: 'سیب', unit: 'کیلوگرم', min: 500, parentId: 1, score: 2330 },
  { id: 24, categoryName: 'پرتقال', slug: 'پرتقال', unit: 'کیلوگرم', min: 500, parentId: 1, score: 2140 },
  { id: 25, categoryName: 'انار', slug: 'انار', unit: 'کیلوگرم', min: 500, parentId: 1, score: 1980 },

  // سطح ۳ — غلات
  { id: 43, categoryName: 'برنج', slug: 'برنج', unit: 'کیلوگرم', min: 500, example: 'هاشمی', parentId: 42, score: 3105 },

  // سطح ۳ — ادویه
  { id: 49, categoryName: 'زعفران', slug: 'زعفران', unit: 'کیلوگرم', min: 1, example: 'سرگل', parentId: 46, score: 2760 },

  // سطح ۳ — صیفی
  { id: 26, categoryName: 'گوجه فرنگی', slug: 'گوجه-فرنگی', unit: 'کیلوگرم', min: 1000, parentId: 2, score: 1870 },
  { id: 27, categoryName: 'خیار', slug: 'خیار', unit: 'کیلوگرم', min: 1000, parentId: 2, score: 1650 },

  // سطح ۳ — حبوبات
  { id: 72, categoryName: 'لوبیا', slug: 'لوبیا', unit: 'کیلوگرم', min: 200, example: 'چیتی', parentId: 71, score: 1120 },

  // سایر ریشه‌ها — نمونه‌هایی که در درخواست‌های خرید واقعی دیدیم
  { id: 140, categoryName: 'خواربار و تنقلات', slug: 'خواربار-و-تنقلات', unit: 'کیلوگرم', min: 100, parentId: 77, score: 800 },
  { id: 239, categoryName: 'پلی اتیلن', slug: 'پلی-اتیلن', unit: 'کیلوگرم', min: 100, parentId: 136, score: 640 },
  { id: 250, categoryName: 'سایر مواد شیمیایی', slug: 'سایر-مواد-شیمیایی', unit: 'کیلوگرم', min: 100, parentId: 136, score: 500 },
  { id: 955, categoryName: 'کولر', slug: 'کولر', unit: 'عدد', min: 5, parentId: 923, score: 320 },
  { id: 1035, categoryName: 'بهداشت شخصی', slug: 'بهداشت-شخصی', unit: 'عدد', min: 100, parentId: 998, score: 410 },
];

// ─── استان‌ها (۳۱ استان — ترتیب و شناسه‌های باسکول؛ اصفهان=4 و کرمان=21 تأییدشده) ──

export const provinces: Province[] = [
  'آذربایجان شرقی', 'آذربایجان غربی', 'اردبیل', 'اصفهان', 'البرز', 'ایلام', 'بوشهر',
  'تهران', 'چهارمحال و بختیاری', 'خراسان جنوبی', 'خراسان رضوی', 'خراسان شمالی', 'خوزستان',
  'زنجان', 'سمنان', 'سیستان و بلوچستان', 'فارس', 'قزوین', 'قم', 'کردستان', 'کرمان',
  'کرمانشاه', 'کهگیلویه و بویراحمد', 'گلستان', 'گیلان', 'لرستان', 'مازندران', 'مرکزی',
  'هرمزگان', 'همدان', 'یزد',
].map((name, i) => ({ id: i + 1, name }));

// ─── شهرها (شناسه‌های باسکول: اصفهان=45، شهر بابک=230) ─────────────

const citySeed: [number, string, number][] = [
  [230, 'شهر بابک', 21], [231, 'رفسنجان', 21], [232, 'کرمان', 21], [233, 'سیرجان', 21], [234, 'بم', 21], [235, 'جیرفت', 21],
  [45, 'اصفهان', 4], [46, 'کاشان', 4], [47, 'خوانسار', 4], [48, 'نجف‌آباد', 4],
  [860, 'تهران', 8], [861, 'اسلامشهر', 8], [862, 'پاکدشت', 8],
  [1110, 'مشهد', 11], [1111, 'تربت حیدریه', 11], [1112, 'نیشابور', 11], [1113, 'قوچان', 11],
  [1010, 'بیرجند', 10], [1011, 'قائن', 10],
  [110, 'تبریز', 1], [111, 'خوی', 1], [112, 'مراغه', 1],
  [1710, 'شیراز', 17], [1711, 'اقلید', 17], [1712, 'داراب', 17],
  [2510, 'رشت', 25], [2511, 'آستانه', 25],
  [2710, 'آمل', 27], [2711, 'بابل', 27], [2712, 'ساری', 27],
  [3110, 'یزد', 31], [3111, 'اردکان', 31],
  [3010, 'همدان', 30], [3011, 'تویسرکان', 30],
  [1910, 'قم', 19],
  [1610, 'زاهدان', 16],
];

export const cities: City[] = citySeed.map(([id, name, provinceId]) => ({ id, name, provinceId }));

// ─── کاربران/فروشندگان (دو نفر اول: داده واقعی باسکول) ───────────────

export const users: User[] = [
  {
    id: 46676, phone: '09962253970', userName: 'c34qxnsh',
    firstName: 'محمد رضا', lastName: 'جعفری',
    activePakageType: 2, isVerified: false,
    businessDesc: 'باغدار و عرضه‌کننده پسته اکبری شهر بابک؛ عرضه مستقیم از باغ با کنترل کیفیت انس.',
    createdAt: '2021-06-06T20:29:30+03:30',
  },
  {
    id: 1278018, phone: '09120000002', userName: '6vi62',
    firstName: 'رحمت اله', lastName: 'باقری',
    activePakageType: 1, isVerified: true,
    businessDesc: 'خشکبار فروردین — تأمین و عرضه خشکبار اصیل ایرانی با کیفیت تضمینی و ارسال سریع.',
    createdAt: '2025-02-10T00:44:05+03:30',
  },
  {
    id: 1959003, phone: '09120000003', userName: 'saffronqueen',
    firstName: 'حسین', lastName: 'زارع',
    activePakageType: 2, isVerified: true,
    businessDesc: 'زعفران‌کار قائنات؛ زعفران سرگل و نگین با خالصی ۱۰۰٪ و آزمایشگاه معتبر.',
    createdAt: '2024-11-02T10:12:00+03:30',
  },
  {
    id: 1959004, phone: '09120000004', userName: 'ricegilan',
    firstName: 'بیژن', lastName: 'نوروزی',
    activePakageType: 1, isVerified: false,
    businessDesc: 'شالیکاری گیلان؛ برنج هاشمی و طارم به‌صورت مستقیم از شالیزار.',
    createdAt: '2025-05-19T08:30:00+04:30',
  },
  {
    id: 1959005, phone: '09120000005', userName: 'datepalm',
    firstName: 'علی', lastName: 'دهقان',
    activePakageType: 2, isVerified: true,
    businessDesc: 'صادرکننده خرمای مضافتی و کلوته بم؛ بسته‌بندی صادراتی مطابق استاندارد.',
    createdAt: '2024-08-21T14:05:00+04:30',
  },
  {
    id: 1959006, phone: '09120000006', userName: 'greenhouse',
    firstName: 'مهدی', lastName: 'رستمی',
    activePakageType: 1, isVerified: false,
    businessDesc: 'گلخانه‌دار یزد؛ خیار و گوجه گلخانه‌ای با عرضه روزانه.',
    createdAt: '2025-01-15T09:45:00+03:30',
  },
];

// ─── محصولات (ساختار عین خروجی get_product_list باسکول) ─────────────

const seller = (id: number) => {
  const u = users.find((x) => x.id === id)!;
  return { id: u.id, userName: u.userName, firstName: u.firstName, lastName: u.lastName, activePakageType: u.activePakageType, isVerified: u.isVerified };
};

const mkSlug = (name: string) =>
  `خرید-عمده-${name.trim().replace(/\s+/g, '-').replace(/[/_]/g, '-')}`;

export const products: Product[] = [
  {
    id: 328828, productName: 'پسته اکبری 20_22', slug: mkSlug('پسته اکبری 20_22'),
    description: 'پسته اکبری انس 21 توچین 70 درصد بدون لک و آجیلی.\nبرای اطلاع از قیمت روز و خرید مستقیم پیام ارسال کنید.\nمقدار موجودی آماده فروش: 1000 کیلوگرم — حداقل فروش در هر معامله: 1000 کیلوگرم.',
    stock: 1000, minSalePrice: 3700000, minSaleAmount: 1000, unit: 'کیلوگرم',
    categoryId: 45, categoryName: 'خشکبار', subCategoryId: 44, subCategoryName: 'پسته',
    provinceId: 21, provinceName: 'کرمان', cityId: 230, cityName: 'شهر بابک',
    myuserId: 46676, seller: seller(46676),
    isElevated: true, hasVideo: false, isOld: false, viewCount: 1840,
    createdAt: '2026-10-21T08:18:01+03:30', updatedAt: '2026-10-21T08:18:01+03:30', photos: [],
  },
  {
    id: 284241, productName: 'پسته اکبری ممتاز', slug: mkSlug('پسته اکبری ممتاز'),
    description: 'فروش عمده پسته اکبری؛ تأمین پایدار، ارسال سریع، امکان عقد قرارداد بلندمدت و بسته‌بندی صادراتی. مناسب سازمان‌ها، تجار و صادرکنندگان.',
    stock: 200000, minSalePrice: 3500000, minSaleAmount: 500, unit: 'کیلوگرم',
    categoryId: 45, categoryName: 'خشکبار', subCategoryId: 44, subCategoryName: 'پسته',
    provinceId: 4, provinceName: 'اصفهان', cityId: 45, cityName: 'اصفهان',
    myuserId: 1278018, seller: seller(1278018),
    isElevated: true, hasVideo: false, isOld: false, viewCount: 2361,
    createdAt: '2026-10-21T10:44:49+03:30', updatedAt: '2026-10-21T10:44:49+03:30', photos: [],
  },
  {
    id: 299661, productName: 'مغز پسته احمدآقایی درجه یک', slug: mkSlug('مغز پسته احمدآقایی درجه یک'),
    description: 'مغز پسته احمدآقایی سال جدید، سبز و تازه، بدون تلخزی. ارسال به سراسر کشور.',
    stock: 10000, minSalePrice: 4100000, minSaleAmount: 500, unit: 'کیلوگرم',
    categoryId: 45, categoryName: 'خشکبار', subCategoryId: 44, subCategoryName: 'پسته',
    provinceId: 21, provinceName: 'کرمان', cityId: 231, cityName: 'رفسنجان',
    myuserId: 1278018, seller: seller(1278018),
    isElevated: true, hasVideo: false, isOld: false, viewCount: 1210,
    createdAt: '2026-10-19T16:02:11+03:30', updatedAt: '2026-10-19T16:02:11+03:30', photos: [],
  },
  {
    id: 293711, productName: 'پسته فندقی ممتاز صادراتی', slug: mkSlug('پسته فندقی ممتاز صادراتی'),
    description: 'پسته فندقی درجه یک با بسته‌بندی ۵۰ کیلویی مناسب بازارهای صادراتی.',
    stock: 5000, minSalePrice: 2900000, minSaleAmount: 500, unit: 'کیلوگرم',
    categoryId: 45, categoryName: 'خشکبار', subCategoryId: 44, subCategoryName: 'پسته',
    provinceId: 11, provinceName: 'خراسان رضوی', cityId: 1111, cityName: 'تربت حیدریه',
    myuserId: 46676, seller: seller(46676),
    isElevated: true, hasVideo: false, isOld: true, viewCount: 890,
    createdAt: '2026-09-28T11:20:00+03:30', updatedAt: '2026-10-12T09:10:00+03:30', photos: [],
  },
  {
    id: 297843, productName: 'کشمش تیزابی درجه 1', slug: mkSlug('کشمش تیزابی درجه 1'),
    description: 'کشمش تیزابی تبریز، بدون دم، طلایی و یکدست؛ مناسب صادرات و پخش عمده.',
    stock: 50000, minSalePrice: 92000, minSaleAmount: 200, unit: 'کیلوگرم',
    categoryId: 45, categoryName: 'خشکبار', subCategoryId: 53, subCategoryName: 'کشمش',
    provinceId: 1, provinceName: 'آذربایجان شرقی', cityId: 110, cityName: 'تبریز',
    myuserId: 1278018, seller: seller(1278018),
    isElevated: true, hasVideo: false, isOld: false, viewCount: 1560,
    createdAt: '2026-10-18T13:44:00+03:30', updatedAt: '2026-10-18T13:44:00+03:30', photos: [],
  },
  {
    id: 299576, productName: 'کشمش سبز پلویی خوی', slug: mkSlug('کشمش سبز پلویی خوی'),
    description: 'کشمش سبز پلویی بیدقی، رنگ پایدار و عطر طبیعی؛ عرضه در پالت ۱۰ کیلویی.',
    stock: 30000, minSalePrice: 105000, minSaleAmount: 200, unit: 'کیلوگرم',
    categoryId: 45, categoryName: 'خشکبار', subCategoryId: 53, subCategoryName: 'کشمش',
    provinceId: 1, provinceName: 'آذربایجان شرقی', cityId: 111, cityName: 'خوی',
    myuserId: 1278018, seller: seller(1278018),
    isElevated: false, hasVideo: false, isOld: false, viewCount: 640,
    createdAt: '2026-10-15T10:00:00+03:30', updatedAt: '2026-10-15T10:00:00+03:30', photos: [],
  },
  {
    id: 211213, productName: 'خرمای مضافتی ممتاز بکست', slug: mkSlug('خرمای مضافتی ممتاز بکست'),
    description: 'خرمای مضافتی ممتاز و مونس، رطوبت ۱۸٪، شیرین و گوشت‌دار؛ بسته‌بندی صادراتی و داخلی.',
    stock: 60000, minSalePrice: 130000, minSaleAmount: 500, unit: 'کیلوگرم',
    categoryId: 1, categoryName: 'میوه', subCategoryId: 22, subCategoryName: 'خرما',
    provinceId: 21, provinceName: 'کرمان', cityId: 234, cityName: 'بم',
    myuserId: 1959005, seller: seller(1959005),
    isElevated: true, hasVideo: true, isOld: false, viewCount: 3120,
    createdAt: '2026-10-20T09:30:00+03:30', updatedAt: '2026-10-20T09:30:00+03:30', photos: [],
  },
  {
    id: 293616, productName: 'خرمای کلوته قمصر', slug: mkSlug('خرمای کلوته قمصر'),
    description: 'کلوته قمصر درجه یک، خشک و مونس، عالی برای صادرات؛ عرضه از سردخانه.',
    stock: 25000, minSalePrice: 165000, minSaleAmount: 500, unit: 'کیلوگرم',
    categoryId: 1, categoryName: 'میوه', subCategoryId: 22, subCategoryName: 'خرما',
    provinceId: 21, provinceName: 'کرمان', cityId: 232, cityName: 'کرمان',
    myuserId: 1959005, seller: seller(1959005),
    isElevated: true, hasVideo: false, isOld: false, viewCount: 2010,
    createdAt: '2026-10-17T12:15:00+03:30', updatedAt: '2026-10-17T12:15:00+03:30', photos: [],
  },
  {
    id: 281372, productName: 'زعفران سرگل قائنات', slug: mkSlug('زعفران سرگل قائنات'),
    description: 'زعفران سرگل با خالصی تضمینی، رنگ‌دهی بالای ۲۴۰ واحد، آزمایش‌شده؛ عرضه در بسته ۱ گرمی تا عمده.',
    stock: 120, minSalePrice: 410000000, minSaleAmount: 1, unit: 'کیلوگرم',
    categoryId: 46, categoryName: 'ادویه', subCategoryId: 49, subCategoryName: 'زعفران',
    provinceId: 10, provinceName: 'خراسان جنوبی', cityId: 1011, cityName: 'قائن',
    myuserId: 1959003, seller: seller(1959003),
    isElevated: true, hasVideo: false, isOld: false, viewCount: 5400,
    createdAt: '2026-10-22T08:00:00+03:30', updatedAt: '2026-10-22T08:00:00+03:30', photos: [],
  },
  {
    id: 309494, productName: 'زعفران نگین درجه یک', slug: mkSlug('زعفران نگین درجه یک'),
    description: 'زعفران نگین تربت حیدریه؛ رشته‌های کامل، سفید ندارد، مناسب گیفت و صادرات.',
    stock: 60, minSalePrice: 325000000, minSaleAmount: 1, unit: 'کیلوگرم',
    categoryId: 46, categoryName: 'ادویه', subCategoryId: 49, subCategoryName: 'زعفران',
    provinceId: 11, provinceName: 'خراسان رضوی', cityId: 1111, cityName: 'تربت حیدریه',
    myuserId: 1959003, seller: seller(1959003),
    isElevated: true, hasVideo: false, isOld: false, viewCount: 3980,
    createdAt: '2026-10-16T15:20:00+03:30', updatedAt: '2026-10-16T15:20:00+03:30', photos: [],
  },
  {
    id: 253382, productName: 'برنج هاشمی درجه 1', slug: mkSlug('برنج هاشمی درجه 1'),
    description: 'برنج هاشمی سال جدید شالی ۱۴۰۵، کشت اول، خوش‌عطر و دانه‌بلند؛ عرضه در کیسه ۱۰ کیلویی.',
    stock: 100000, minSalePrice: 128000, minSaleAmount: 500, unit: 'کیلوگرم',
    categoryId: 42, categoryName: 'غلات', subCategoryId: 43, subCategoryName: 'برنج',
    provinceId: 25, provinceName: 'گیلان', cityId: 2510, cityName: 'رشت',
    myuserId: 1959004, seller: seller(1959004),
    isElevated: true, hasVideo: false, isOld: false, viewCount: 4200,
    createdAt: '2026-10-19T07:40:00+03:30', updatedAt: '2026-10-19T07:40:00+03:30', photos: [],
  },
  {
    id: 292790, productName: 'برنج طارم ممتاز آمل', slug: mkSlug('برنج طارم ممتاز آمل'),
    description: 'طارم هیرودی آمل؛ پخت عالی و عطر مطبوع، بدون شکسته.',
    stock: 40000, minSalePrice: 115000, minSaleAmount: 500, unit: 'کیلوگرم',
    categoryId: 42, categoryName: 'غلات', subCategoryId: 43, subCategoryName: 'برنج',
    provinceId: 27, provinceName: 'مازندران', cityId: 2710, cityName: 'آمل',
    myuserId: 1959004, seller: seller(1959004),
    isElevated: false, hasVideo: false, isOld: false, viewCount: 1780,
    createdAt: '2026-10-14T11:30:00+03:30', updatedAt: '2026-10-14T11:30:00+03:30', photos: [],
  },
  {
    id: 296325, productName: 'گردو تازه کاغذی تویسرکان', slug: mkSlug('گردو تازه کاغذی تویسرکان'),
    description: 'گردوی کاغذی تازه مغز سفید و روغنی؛ عرضه در گونی ۲۵ کیلویی.',
    stock: 15000, minSalePrice: 480000, minSaleAmount: 200, unit: 'کیلوگرم',
    categoryId: 45, categoryName: 'خشکبار', subCategoryId: 54, subCategoryName: 'گردو',
    provinceId: 30, provinceName: 'همدان', cityId: 3011, cityName: 'تویسرکان',
    myuserId: 46676, seller: seller(46676),
    isElevated: true, hasVideo: false, isOld: false, viewCount: 2050,
    createdAt: '2026-10-13T09:00:00+03:30', updatedAt: '2026-10-13T09:00:00+03:30', photos: [],
  },
  {
    id: 301961, productName: 'خیار خطی گلخانه‌ای', slug: mkSlug('خیار خطی گلخانه‌ای'),
    description: 'خیار خطی گلخانه‌ای یزد؛ عرضه روزانه با بارگیری سریع.',
    stock: 50000, minSalePrice: 28000, minSaleAmount: 1000, unit: 'کیلوگرم',
    categoryId: 2, categoryName: 'صیفی', subCategoryId: 27, subCategoryName: 'خیار',
    provinceId: 31, provinceName: 'یزد', cityId: 3110, cityName: 'یزد',
    myuserId: 1959006, seller: seller(1959006),
    isElevated: true, hasVideo: false, isOld: false, viewCount: 990,
    createdAt: '2026-10-23T06:30:00+03:30', updatedAt: '2026-10-23T06:30:00+03:30', photos: [],
  },
  {
    id: 301841, productName: 'گوجه گلخانه‌ای یکدست', slug: mkSlug('گوجه گلخانه‌ای یکدست'),
    description: 'گوجه گلخانه‌ای یکدست ۵۷ گرمی؛ کیفیت صادراتی، صندوق ۵ کیلویی.',
    stock: 40000, minSalePrice: 24000, minSaleAmount: 1000, unit: 'کیلوگرم',
    categoryId: 2, categoryName: 'صیفی', subCategoryId: 26, subCategoryName: 'گوجه فرنگی',
    provinceId: 31, provinceName: 'یزد', cityId: 3110, cityName: 'یزد',
    myuserId: 1959006, seller: seller(1959006),
    isElevated: false, hasVideo: false, isOld: false, viewCount: 720,
    createdAt: '2026-10-22T12:10:00+03:30', updatedAt: '2026-10-22T12:10:00+03:30', photos: [],
  },
  {
    id: 261076, productName: 'لوبیا چیتی درجه یک', slug: mkSlug('لوبیا چیتی درجه یک'),
    description: 'لوبیا چیتی درجه یک، سالم و یکدست، کشت شمال کشور.',
    stock: 20000, minSalePrice: 86000, minSaleAmount: 200, unit: 'کیلوگرم',
    categoryId: 71, categoryName: 'حبوبات', subCategoryId: 72, subCategoryName: 'لوبیا',
    provinceId: 17, provinceName: 'فارس', cityId: 1710, cityName: 'شیراز',
    myuserId: 1959006, seller: seller(1959006),
    isElevated: true, hasVideo: false, isOld: false, viewCount: 560,
    createdAt: '2026-10-12T14:25:00+03:30', updatedAt: '2026-10-12T14:25:00+03:30', photos: [],
  },
];

// ─── درخواست‌های خرید (سه نمونه اول: داده واقعی get_buyAd_list باسکول) ──

export const buyRequests: BuyRequest[] = [
  { id: 1067184, name: 'پد بهداشتی پارچه‌ای', categoryId: 1035, subcategoryName: 'بهداشت شخصی', requirementAmount: 600, unit: 'عدد', myuserId: 1959052, firstName: 'عسل', lastName: 'محمدی', city: 'تهران', isVerified: false, createdAt: '2026-10-23T23:55:46+03:30' },
  { id: 1067182, name: 'پلی اورتان', categoryId: 239, subcategoryName: 'پلی اتیلن', requirementAmount: 10000, unit: 'کیلوگرم', myuserId: 1958254, firstName: 'امیرکیا', lastName: 'کیخسروکیانی', city: 'زاهدان', isVerified: false, createdAt: '2026-10-23T23:47:56+03:30' },
  { id: 1067181, name: null, categoryId: 239, subcategoryName: 'پلی اتیلن', requirementAmount: 10000, unit: 'کیلوگرم', myuserId: 1958254, firstName: 'امیرکیا', lastName: 'کیخسروکیانی', city: 'زاهدان', isVerified: false, createdAt: '2026-10-23T23:46:39+03:30' },
  { id: 1067175, name: 'کولر', categoryId: 955, subcategoryName: 'کولر', requirementAmount: 5, unit: 'عدد', myuserId: 1959030, firstName: 'کمال', lastName: 'ضیائی', city: 'لردگان', isVerified: false, createdAt: '2026-10-23T23:33:34+03:30' },
  { id: 1067161, name: 'تخم مرغ مخصوص صادراتی', categoryId: 140, subcategoryName: 'خواربار و تنقلات', requirementAmount: 30000, unit: 'عدد', myuserId: 1959061, firstName: 'سعید', lastName: 'مرادی', city: 'تهران', isVerified: true, createdAt: '2026-10-23T23:08:35+03:30' },
  { id: 1067150, name: 'پسته اکبری برای صادرات', categoryId: 44, subcategoryName: 'پسته', requirementAmount: 20000, unit: 'کیلوگرم', myuserId: 1959072, firstName: 'محمود', lastName: 'رضایی', city: 'تهران', isVerified: true, createdAt: '2026-10-23T21:40:12+03:30' },
  { id: 1067141, name: 'کشمش تیزابی درجه 1', categoryId: 53, subcategoryName: 'کشمش', requirementAmount: 100000, unit: 'کیلوگرم', myuserId: 1959083, firstName: 'ایلگار', lastName: 'حسین‌زاده', city: 'تبریز', isVerified: false, createdAt: '2026-10-23T20:15:44+03:30' },
  { id: 1067132, name: 'خرمای کلوته', categoryId: 22, subcategoryName: 'خرما', requirementAmount: 200000, unit: 'کیلوگرم', myuserId: 1959094, firstName: 'فاطمه', lastName: 'اکبری', city: 'مشهد', isVerified: true, createdAt: '2026-10-23T19:02:30+03:30' },
  { id: 1067120, name: 'زعفران سرگل', categoryId: 49, subcategoryName: 'زعفران', requirementAmount: 50, unit: 'کیلوگرم', myuserId: 1959105, firstName: 'رضا', lastName: 'کیانی', city: 'تهران', isVerified: false, createdAt: '2026-10-23T17:44:05+03:30' },
  { id: 1067111, name: 'برنج هاشمی کشت اول', categoryId: 43, subcategoryName: 'برنج', requirementAmount: 50000, unit: 'کیلوگرم', myuserId: 1959116, firstName: 'سمانه', lastName: 'طاهری', city: 'قم', isVerified: false, createdAt: '2026-10-23T16:20:18+03:30' },
  { id: 1067102, name: 'گوجه گلخانه‌ای صادراتی', categoryId: 26, subcategoryName: 'گوجه فرنگی', requirementAmount: 30000, unit: 'کیلوگرم', myuserId: 1959127, firstName: 'حامد', lastName: 'شریفی', city: 'تهران', isVerified: true, createdAt: '2026-10-23T15:05:52+03:30' },
  { id: 1067095, name: 'گردوی کاغذی مغز', categoryId: 54, subcategoryName: 'گردو', requirementAmount: 8000, unit: 'کیلوگرم', myuserId: 1959138, firstName: 'نگین', lastName: 'صادقی', city: 'یزد', isVerified: false, createdAt: '2026-10-23T13:47:29+03:30' },
];

// ─── ابزارها ──────────────────────────────────────────────────────────

export function findCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug || c.categoryName === slug);
}

export function categoryTree(): Category[] {
  const withChildren = (parentId: number): Category[] =>
    categories
      .filter((c) => c.parentId === parentId)
      .map((c) => ({ ...c, children: withChildren(c.id) }));
  return categories.filter((c) => c.parentId === null).map((r) => ({ ...r, children: withChildren(r.id) }));
}
