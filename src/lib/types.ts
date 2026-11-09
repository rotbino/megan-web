/**
 * انواع داده ایمچ — کاملاً منطبق بر ساختار باسکول (استخراج‌شده از APIهای واقعی)
 * و هم‌راستا با مدل‌های Prisma در بک‌اند.
 *
 * نگاشت نام‌ها (TS camelCase ↔ ستون snake_case باسکول):
 *   myuserId ↔ myuser_id | subCategoryId ↔ sub_category_id
 *   minSalePrice ↔ min_sale_price | minSaleAmount ↔ min_sale_amount
 *   isElevated ↔ is_elevated | activePakageType ↔ active_pakage_type
 *   isLadder ↔ is_ladder (نردبان آگهی — ۱۰ هزار تومان در روز)
 */

export type PackageType = 0 | 1 | 2 | 3; // ۰=رایگان ۱=دوماهه ۲=شش‌ماهه ۳=یک‌ساله (فعال — انقضا لحاظ می‌شود)

export interface User {
  id: number;
  phone: string;
  userName: string; // شناسه عمومی پروفایل مثل c34qxnsh
  firstName: string;
  lastName: string;
  activePakageType: PackageType;
  isVerified: boolean;
  businessDesc?: string;
  /** «۱ روز در ایمچ» — کارت هویت پروفایل عمومی */
  daysInImach?: number;
  createdAt: string;
}

export interface Category {
  id: number;
  categoryName: string;
  slug: string;
  unit: string; // «کیلوگرم»
  min: number; // حداقل سفارش پیش‌فرض
  example?: string;
  parentId: number | null;
  score: number;
  image?: string; // تصویر کارت دسته (فقط نمایش، مربوط به فرانت)
  children?: Category[];
}

export interface Province {
  id: number;
  name: string;
}

export interface City {
  id: number;
  name: string;
  provinceId: number;
}

export interface Product {
  id: number;
  productName: string;
  slug: string;
  description: string;
  stock: number; // موجودی آماده فروش
  minSalePrice: number | null; // کف قیمت هر واحد (تومان)
  minSaleAmount: number; // حداقل میزان فروش در هر معامله
  unit: string;

  categoryId: number; // دسته پدر (مثل خشکبار)
  categoryName: string;
  subCategoryId: number; // دسته برگ (مثل پسته)
  subCategoryName: string;

  provinceId: number;
  provinceName: string;
  cityId: number;
  cityName: string;

  /** ObjectId کاربر در بک‌اند مگان (رشته) — در دیتای ماک قدیمی عدد بود */
  myuserId: string;
  seller: {
    id: string;
    userName: string;
    firstName: string;
    lastName: string;
    activePakageType: PackageType;
    isVerified: boolean;
  };

  /** نردبان — آگهی نردبان‌شده بالای نتایج می‌آید (۱۰۰ هزار تومان در ماه) */
  isLadder: boolean;
  isElevated: boolean; // فروشنده ویژه باسکول — در ایمچ بدون استفاده
  hasVideo: boolean;
  isOld: boolean;
  viewCount: number;

  /** اعتبار قیمت به روز (۷-۱۱ دور هفدهم) — پیش‌فرض ۳؛ پنجره‌ای که بعد از
   *  آن بدون آپدیت قیمت، آگهی بج «قیمت منقضی شده» می‌گیرد */
  priceValidityDays?: number;
  /** مهر آخرین تغییر واقعی قیمت — «YYYY-MM-DD HH:mm:ss» (خالی = قدیمی) */
  priceUpdatedAt?: string;
  /** قیمت منقضی است؟ (مهر + اعتبار < اکنون) — محاسبهٔ بک‌اند */
  priceExpired?: boolean;

  createdAt: string;
  updatedAt: string;
  photos: string[];
  /** تامبنیل‌های ۴۰۰px هم‌ترتیب با photos — برای کارت‌های لیست (سرعت) */
  photoThumbs?: string[];

  /** فقط پنل — وضعیت بررسی آگهی (عمومی: همه تایید شده فرض می‌شوند) */
  status?: ProductStatus;
  features?: ProductFeature[];
  /** دلایل رد — فقط آگهی‌های رد شده پنل */
  rejectionReasons?: string[];
}

export interface BuyRequest {
  id: number;
  name: string | null; // «نوع محصول» (مثل: پاجوش پیارم)
  categoryId: number;
  subcategoryName: string; // نام محصول (مثل: نهال)
  requirementAmount: number;
  unit: string;
  /** ObjectId مگان — در باسکول عدد بود؛ فقط کلید/ارجاع فرانت */
  myuserId: string;
  /** شناسهٔ عمومی خریدار — چت مستقیم از کارت (snapshot پیگیری‌ها و لیست درخواست‌ها) */
  userName?: string | null;
  firstName: string;
  lastName: string;
  city: string;
  /** مکان خام (خواستهٔ مالک ۷-۱۱) — ورودی فرمول تطابق؛ مقایسهٔ عددی دقیق‌تر از نام است */
  provinceId?: number | null;
  cityId?: number | null;
  province?: string | null;
  isVerified: boolean;
  createdAt: string;
}

/** مرتب‌سازی — دقیقاً مثل باسکول: مرتبط‌ترین / جدیدترین */
export type SortKey = 'related' | 'newest';

export interface ProductQuery {
  categorySlug?: string;
  s?: string; // عبارت جستجو (مثل باسکول: ?s=)
  provinceId?: number;
  cityId?: number;
  sort?: SortKey;
  page?: number;
  /** اندازه صفحه — بک‌اند می‌فهمد (پیش‌فرض خودش)؛ فقط برای اسکن‌های سمت سرور (بازار شهری) */
  pageSize?: number;
}

/**
 * کوئری «بازار عمدهٔ شهری» — سرویس جداگانهٔ /cityMarket/getProducts
 * (خواستهٔ مالک ۹-۱۱): فیلتر شهرِ صفحه ثابت است و کاربر می‌تواند شهرهای
 * دیگر همان استان را هم تیک بزند → cityIds همیشه ≥ ۱ عضو دارد (شهر خود
 * صفحه همیشه اول است؛ سرویس بدون cityIds نتیجهٔ خالی برمی‌گرداند).
 */
export interface CityMarketQuery {
  cityIds: number[];
  categorySlug?: string;
  s?: string;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
}

// ─────────────────────────────────────────────────────────────
// پنل فروشنده — منطبق بر پاسخ‌های واقعی باسکول که فرستاده شد
// (get_profile، get_category_list، saved lists، relatedByAdd)
// ─────────────────────────────────────────────────────────────

/** وضعیت آگهی — تب‌های «محصولات من»: تایید شده / در انتظار تایید / حذف شده / رد شده */
export type ProductStatus = 'confirmed' | 'pending' | 'rejected' | 'deleted';

/** ویژگی محصول — مرحله «جزئیات نهایی» ثبت محصول */
export interface ProductFeature {
  key: string; // بسته‌بندی / کیفیت / رنگ / ...
  value: string;
}

/**
 * پروفایل پنل — ساختار camelCase‌شده‌ی پاسخ user/get_profile باسکول:
 * { status, profile: {...}, user_info: {...} }
 * در فاز اتصال، فقط همین دو شیء از JSON بک‌اند پر می‌شود.
 */
/**
 * کاربر نشست فرانت — هویت نمایشی (نام/آواتار/نقش) از پروفایل واقعی بک‌اند.
 * هدر، نوار پایین موبایل و منوها با «role» عوض می‌شوند؛ نقش در بک‌اند
 * (is_seller/is_buyer) ماندگار است و با رادیوی ویرایش پروفایل/سوییچ پنل عوض می‌شود.
 */
export interface SessionUser {
  phone: string;
  userName: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: 'seller' | 'buyer';
  /** رمز پنل تعیین شده؟ false → بنر قرمز «رمز عبور تعیین کنید» فعال می‌ماند */
  hasPassword: boolean;
}

export interface PanelProfile {
  profile: {
    description: string | null; // «درباره شما» — حداقل ۳ تا ۵ خط
    activityDomain: string | null;
    humanResourceCount: number | null;
    profilePhoto: string | null;
    address: string | null; // «تهران - تهران»
    isCompany: boolean;
    companyName: string;
    /** شماره ثبت — embedded در profile کاربر ذخیره می‌شود (دور ۱۶) */
    companyRegisterNumber: string;
    /** صنف کسب‌وکار (خواسته مالک ۳-۱۱) — سوپرمارکت/قنادی/…؛ پایهٔ بازاریابی و تبلیغات */
    businessCategory: string;
    confirmed: boolean;
    /** استان/شهر — فیلدهای اضافی فرم ویرایش پروفایل */
    province?: string;
    city?: string;
  };
  userInfo: {
    id: string;
    userName: string; // wbrstu2g1
    firstName: string;
    lastName: string;
    sex: string | null; // «آقا» / «خانم»
    province: string;
    city: string;
    /** id عددی باسکول — برای پیش‌پر کردن فرم‌های ثبت آگهی/درخواست */
    provinceId: number | null;
    cityId: number | null;
    avatarUrl: string | null;
    phone: string;
    isVerified: boolean;
    isBuyer: boolean;
    isSeller: boolean;
    walletBalance: number; // تومان
    productCount: number; // آگهی‌های فعال
    createdAt: string;
    /** امکان تماس (خواسته مالک ۴-۱۱) — خاموش = فقط چت برای دیگران */
    allowCalls: boolean;
  };
  /** تصاویر مربوطه/گواهی‌های کسب‌وکار — آپلودی همان کاربر (اسلات‌های User) */
  gallery: Array<{ id: string; url: string; thumbUrl: string }>;
  certificates: Array<{ id: string; url: string; thumbUrl: string }>;
}

// ─────────────────────────────────────────────────────────────
// پیگیری‌ها — CRM کوچک ایمچ (خواسته مالک ۶-۱۱)
// فروشنده درخواست‌های خرید و خریدار آگهی‌های فروش را در «پرونده»های نام‌دار
// ذخیره می‌کند و با قیف تماس + یادداشت‌های زمان‌دار پیگیری می‌کند.
// جریان ذخیره دومرحله‌ای: ۱) انتخاب/ساخت پرونده ۲) وضعیت + یادداشت اختیاری.
// ─────────────────────────────────────────────────────────────

/** هدف پیگیری — درخواست خرید (دید فروشنده) یا آگهی فروش (دید خریدار) */
export type FollowTargetType = 'buy_request' | 'product';

/** نوع پرونده/سرنخ — مستقل‌سازی کامل خرید/فروش (خواستهٔ مالک ۸-۱۱ دور ۲۸):
 *  buy: سرنخ خرید (آگهی فروشِ ذخیره‌شده، دید خریدار)
 *  sell: سرنخ فروش (درخواست خریدِ ذخیره‌شده، دید فروشنده) */
export type FollowFolderKind = 'buy' | 'sell';

/** قیف پیگیری — از ذخیره تا نتیجه */
export type FollowStatus =
  | 'reviewing' // در بررسی
  | 'contacted' // تماس گرفتم
  | 'negotiating' // در مذاکره
  | 'closed' // نهایی شد
  | 'dropped'; // منصرف شدم

/** اولویت پیگیری (خواسته مالک ۷-۱۱) — 1: بالا، 2: متوسط، 3: کم؛
 *  اولویت‌های بالا در لیست بالاتر نمایش داده می‌شوند */
export type FollowPriority = 1 | 2 | 3;

/** یادداشت زمان‌دار روی یک مورد پیگیری */
export interface FollowNote {
  id: string; // ObjectId
  text: string; // «قیمت ۴۸ گفت، جمعه دوباره زنگ می‌زنم»
  createdAt: string;
}

/** پرونده پیگیری — ظرف موارد (مثل «خرید سیب زمینی») */
export interface FollowFolder {
  id: string; // ObjectId
  name: string;
  itemCount: number;
  /** خلاصه قیف برای کارت پرونده — { reviewing: 2, contacted: 1 } */
  statusCounts: Partial<Record<FollowStatus, number>>;
  updatedAt: string;
}

/** مورد پیگیری — همراه با snapshot کامل هدف (BuyRequest یا Product) */
export interface FollowItem {
  id: string; // ObjectId
  folderId: string;
  folderName: string;
  targetType: FollowTargetType;
  targetId: number; // شناسه عددی درخواست/آگهی
  status: FollowStatus;
  /** اولویت — 1 بالا / 2 متوسط / 3 کم (خواسته مالک ۷-۱۱) */
  priority: FollowPriority;
  /** تاریخ پیگیری بعدی «YYYY-MM-DD HH:mm:ss» یا null — از اینپوت «N روز دیگر» */
  nextFollowAt: string | null;
  notes: FollowNote[];
  createdAt: string;
  updatedAt: string;
  target: BuyRequest | Product;
}

/**
 * خریدار پیشنهادی — سرویس relatedByAdd باسکول:
 * تطبیق دسته + نوع کالا + حجم خرید/فروش؛ سورت با امتیاز تطابق.
 * مثال: خرما خازویی → اول خرما خازویی هم‌حجم، بعد بقیه خرماها، بعد محصولات نزدیک.
 */
export interface SuggestedBuyer {
  buyRequest: BuyRequest;
  matchScore: number; // ۰..۱۰۰
  /** نوع کالا / همان محصول / دسته نزدیک / بدون تطابق — «هرگز خالی نمی‌شود» (مالک ۷-۱۱) */
  tier: 'exact' | 'same-product' | 'near-category' | 'other';
  relatedProduct: string; // آگهی ملاک تطبیق
}

// ─────────────────────────────────────────────────────────────
// پنل خریدار — منطبق بر MHTMLهای ارسالی (درخواستهای من،
// فروشندگان پیشنهادی، نظرسنجی، معاملات پرداخت امن)
// ─────────────────────────────────────────────────────────────

/** وضعیت درخواست خرید — تب‌های «درخواستهای من» */
export type BuyRequestStatus = 'confirmed' | 'pending' | 'rejected';

/** درخواست خرید کاربر جاری — ردیف «درخواستهای من» */
export interface MyBuyRequest {
  id: number;
  /** نام دسته انتخابی — مثل «میوه خشک» */
  subcategoryName: string;
  /** نوع کالای واردشده — مثل «قیسی» (خالی = خود دسته) */
  productType: string;
  /** میزان نیازمندی — کیلوگرم */
  requirementAmount: number;
  unit: string;
  status: BuyRequestStatus;
  /** هدف ثبت درخواست: قیمت + خرید سریع / فقط اطلاع از قیمت */
  goal: 'price_and_buy' | 'price_only';
  /** سابقه خرید عمده این کالا */
  hasHistory: boolean;
  createdAt: string;
  /** دلایل رد — فقط رد شده */
  rejectionReasons?: string[];
}

/** گروه فروشندگان پیشنهادی — کارت دسته در صفحه «پیشنهادی» خریدار */
export interface SuggestedSellerGroup {
  id: number;
  /** نام دسته/کالا — مثل «سیب زمینی» */
  categoryName: string;
  /** تعداد فروشندگان هم‌کالا */
  sellerCount: number;
  /** مقصد کارت: لیست محصولات همان دسته */
  href: string;
}

/** دسته بازخورد نظرسنجی — «تحقیقات بازار» (خطا/انتقاد/بهبود/نیاز جدید) */
export type FeedbackCategory = 'bug' | 'critique' | 'improvement' | 'feature';

// ─────────────────────────────────────────────────────────────
// کیف پول — پرداخت کارت به کارت (جایگزین درگاه پرداخت)
// ─────────────────────────────────────────────────────────────

/** پکیج شارژ کیف پول — از تنظیمات پویای ادمین (کلید آزاد مثل p100/p200/p400) + «سایر» */
export interface ChargePackage {
  key: string;
  amount: number; // مبلغ واریزی (تومان)
  bonusPercent: number; // درصد شارژ اضافه
  charge?: number; // شارژ اعمالی نهایی = amount × (۱ + درصد)
}

/** پله درصد شارژ اضافه مبلغ دلخواه — اعمال تا وقتی amount از aboveAmount بیشتر باشد */
export interface CustomChargeTier {
  aboveAmount: number;
  percent: number;
}

/** قواعد شارژ دلخواه (دکمه «سایر») — از تنظیمات پویای ادمین */
export interface CustomChargeRules {
  min: number; // حداقل = مبلغ گران‌ترین پکیج شارژ (محاسبه سرور)
  max: number;
  tiers: CustomChargeTier[]; // صعودی — [0→30٪, 1M→50٪]
}

/** تراکنش کیف پول — فقط اقلام قطعی‌شده (در انتظار/ردشده اینجا نیستند؛ تب کارت‌به‌کارت‌اند) */
export interface WalletTransaction {
  id: string;
  title: string;
  amount: number;
  incoming: boolean; // واریز / کسر
  at: string;
  /** نوع تراکنش: card = شارژ کارت‌به‌کارت تأییدشده؛ ladder = نردبان؛ adjust = اصلاح ادمین؛ offer = ارسال گروهی پیشنهاد تامین */
  type: 'card' | 'ladder' | 'adjust' | 'offer';
}

/** فیش شارژ کارت‌به‌کارت کاربر — تب «کارت به کارت» کیف پول */
export interface MyChargeOrder {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  packageKey: string;
  amount: number; // مبلغ واریزی (تومان)
  bonusPercent: number; // ۰/۱۰/۲۰ درصد شارژ اضافه
  charge: number; // شارژ اعمالی نهایی پس از تأیید
  rejectionReason?: string | null; // فقط وقتی رد شده — کاربر باید دلیل و راه‌حل را ببیند
  reviewedAt?: string | null;
  createdAt: string;
  receipt: { url: string; thumbUrl?: string } | null;
}

// ─────────────────────────────────────────────────────────────
// بسته‌های اشتراک (عضویت ویژه — کارت به کارت + تأیید ادمین)
// ─────────────────────────────────────────────────────────────

/** پلن اشتراک — از جدول Plan بک‌اند (ادمین تعریف/ویرایش می‌کند) */
export interface MembershipPlan {
  key: string;
  months: number;
  amount: number; // قیمت پایه قبل از تخفیف (تومان)
  title: string; // «دو ماهه»
  pakageType: 1 | 2 | 3;
  bestSeller?: boolean;
  /** ویژگی‌های بسته — ردیف‌های کارت قیمت (از ادمین) */
  features?: string[];
  /** درصد تخفیف جاری کمپین — ۰ = بدون کمپین */
  discountPercent?: number;
  /** قیمت نهایی قابل پرداخت = amount × (۱ − تخفیف) */
  finalAmount?: number;
  sortOrder?: number;
}

/** پله کمپین تعدادی — «۱۰ نفر اول ۷۰٪» */
export interface CampaignTier {
  from: number;
  to: number | null; // null = تا پایان کمپین
  percent: number;
}

/** کمپین فروش فعال — بنر بالای بسته‌ها (خواسته مالک ۳۱-۱۰) */
export interface SalesCampaignInfo {
  id: string;
  title: string;
  description: string | null;
  type: 'time' | 'quantity' | 'new_user';
  /** درصد جاری — در تعدادی از پله/override دستی؛ در کاربران جدید: درصد مؤثر
   *  همین بیننده (مهمان = تبلیغ‌شده، نا‌واجد = ۰) (خواسته مالک ۹-۱۱) */
  discountPercent: number;
  endsAt: string | null;
  /** شمار مؤثر خریداران (بیشینهٔ واقعی/دستی) — عدد نمایشی کاربر */
  purchaseCount: number;
  currentTier: {
    from: number;
    to: number | null;
    percent: number;
    boughtInTier: number;
    /** جاهای باقی‌مانده همین پله — null = بی‌پایان (تا پایان کمپین) */
    spotsLeft: number | null;
  } | null;
  tiers: CampaignTier[];
  /** درصد عمومی پس از اتمام پله‌های محدود — تا پایان کمپین (خواسته مالک ۳۱-۱۰) */
  finalPercent: number | null;
  /** نوع کاربران جدید — طول پنجره پس از ثبت‌نام (ساعت)؛ بقیه انواع = null (۹-۱۱).
   *  این نوع کمپین به‌جای تاریخ شروع/پایان فقط همین یک فیلد ساعت می‌گیرد. */
  newUserHours: number | null;
  /** نوع کاربران جدید — سقف خرید بسته با تخفیف برای هر کاربر */
  newUserMaxPurchases: number | null;
  /** مهلت شخصی همین کاربر (مبنای شمارشگر معکوس) — مهمان/نوع دیگر = null */
  userDeadline: string | null;
  /** خریدهای باقی‌مانده همین کاربر با تخفیف — مهمان/نوع دیگر = null */
  userPurchasesLeft: number | null;
  /** آیا همین بیننده الان مشمول تخفیف است؟ (مهمان = false) */
  userEligible: boolean;
}

/** بسته فعال من + امکانات مؤثر — تک منبع گیت‌های سمت کلاینت */
export interface MyPackage {
  /** ۰=رایگان ۱=دوماهه ۲=شش‌ماهه ۳=یک‌ساله (مؤثر — انقضا لحاظ شده) */
  pakageType: PackageType;
  isActive: boolean;
  expiresAt: string | null;
  /** شروع دوره جاری — مبنای نمودار دایره‌ای «ایمچ من» */
  startedAt?: string | null;
  /** کل روزهای دوره جاری (کل دایره) */
  totalDays?: number | null;
  daysLeft: number | null;
  /** عنوان بسته جاری از جدول Plan — «اشتراک شش ماهه» */
  planTitle?: string | null;
  /** تعداد فیش‌های در انتظار بررسی */
  pendingCount: number;
  features: {
    /** -۱ = نامحدود */
    productCapacity: number;
    canSeeBuyers: boolean;
    unlimitedBuyRequests: boolean;
  };
}

/** سفارش خرید بسته خودم — در انتظار/تایید/رد + دلیل رد + فیش */
export interface MyPackageOrder {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  planKey: string;
  months: number;
  amount: number;
  /** قیمت پایه قبل از تخفیف (snapshot — نمایش خط‌خورده) */
  baseAmount?: number;
  /** درصد تخفیف کمپین لحظه خرید */
  discountPercent?: number;
  /** عنوان کمپین لحظه خرید */
  campaignTitle?: string | null;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  receipt: { url: string; thumbUrl?: string } | null;
}

// ─────────────────────────────────────────────────────────────
// خریداران — دفتر خرید، دایرکتوری و پیشنهاد تامین (۳۱-۱۰)
// ─────────────────────────────────────────────────────────────

/** دوره خرید — ترتیب نمایش در همه‌جا یکسان است */
export type PurchasePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'occasional';

/** ترتیب ثابت گزینه‌ها: روزانه، هفتگی، ماهیانه، سالیانه، موردی */
export const PURCHASE_PERIODS: PurchasePeriod[] = ['daily', 'weekly', 'monthly', 'yearly', 'occasional'];

export const PERIOD_LABELS: Record<PurchasePeriod, string> = {
  daily: 'روزانه',
  weekly: 'هفتگی',
  monthly: 'ماهیانه',
  yearly: 'سالیانه',
  occasional: 'موردی',
};

/** ردیف دفتر خرید من — دسته برگ + حداقل خرید + دوره؛ واحد از خود دسته (ثابت).
 *  وضعیت بازبینی ادمین (خواستهٔ مالک ۸-۱۱): درخواست‌های خرید دوره‌ای هم
 *  مثل فوری تایید/رد می‌شوند — دایرکتوری خریداران فقط تاییدشده‌ها را می‌بیند. */
export interface BuyerBookItem {
  categoryId: number;
  name: string; // نام دسته (برای نمایش)
  rootName: string; // کشاورزی
  parentName: string; // میوه
  unit: string; // واحد دسته — کیلوگرم | تن | عدد | بسته | لیتر
  minAmount: number; // حداقل خرید در هر دوره
  period: PurchasePeriod;
  status: 'pending' | 'confirmed' | 'rejected';
  rejectionReasons: string[];
}

/** پاسخ getMyBook */
export interface MyBuyerBook {
  max: number; // 15
  items: BuyerBookItem[];
}

/** آیتم دایرکتوری — یک کارت برای هر کالای دفتر خرید؛ نام خریدار روی کارت، تماس فقط از مسیر چت */
export interface BuyerDirectoryItem {
  id: string; // ObjectId ردیف — برای انتخاب گروهی
  buyerId: string; // برای sendSupplyOffer
  buyerName: string; // نام نمایشی خریدار — روی کارت (خواسته مالک ۱-۱۱)
  role: 'عمده‌خریدار' | 'خرده‌خریدار';
  categoryId: number;
  categoryName: string;
  rootName: string; // نام دستهٔ ریشه — برای آیکون کارت
  categoryPath: string; // «کشاورزی / میوه»
  unit: string;
  minAmount: number;
  period: PurchasePeriod;
  province: string | null;
  city: string | null;
  lastActiveAt: string;
  activeRecently: boolean; // فعال در ۷ روز اخیر
  stale: boolean; // غایب بیش از ۹۰ روز — کم‌رنگ
}

/** فیلتر دایرکتوری خریداران */
export interface BuyerDirectoryQuery {
  categoryId?: number;
  s?: string; // جستجو در نام/مسیر دسته
  period?: PurchasePeriod;
  provinceId?: number;
  cityId?: number;
  page?: number;
  perPage?: number;
}

/** پاسخ directory */
export interface BuyerDirectoryPage {
  items: BuyerDirectoryItem[];
  total: number;
  page: number;
  perPage: number;
  buyRequestCount: number | null; // درخواست‌های خرید همین دسته — تب دوم
}

/** وضعیت گیت پیشنهاد تامین (خواسته مالک ۶-۱۱: سهمیه/سقف روزانه حذف شد —
 *  ارسال پولی است و محدودیت معنا ندارد؛ فقط «بستهٔ فعال؟» می‌ماند) */
export interface OfferQuota {
  isFeatured: boolean;
  pakageType: number;
  walletBalance: number;
}

/** نتیجه ارسال تکی */
export interface SendOfferResult {
  offerId: string;
  threadId: string;
}

/** نتیجه ارسال گروهی — هزینه لحظهٔ ارسال از کیف پول کسر و همین‌جا برگردانده می‌شود */
export interface GroupSendResult {
  sent: number;
  fee: number;
  balance: number;
}

/** شرایط ساختاریافتهٔ پیشنهاد تامین (خواستهٔ مالک) — دستهٔ آخر + نوع کالا +
 *  سوییچ چک (درصد/سرسید) + سوییچ ارسال به محل (پرداخت‌کنندهٔ حمل) + حداقل خرید.
 *  ساختاری ذخیره می‌شود تا خریدار بتواند پیشنهادها را فیلتر و مقایسه کند. */
export interface SupplyOfferTerms {
  categoryId?: number;
  productType?: string;
  checkAccepted?: boolean;
  checkPercent?: number;
  checkMaxDays?: number;
  deliveryToBuyer?: boolean;
  shippingCostBy?: 'seller' | 'customer';
  minOrderAmount?: number;
}

/** پیشنهاد تامین دریافتی — کارت پنل خریدار (فیلتر/مقایسهٔ فروشندگان) */
export interface ReceivedOffer {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerVerified: boolean;
  categoryId: number | null;
  categoryName: string | null;
  categoryPath: string | null;
  productType: string | null;
  message: string;
  checkAccepted: boolean;
  checkPercent: number | null;
  checkMaxDays: number | null;
  deliveryToBuyer: boolean;
  shippingCostBy: 'seller' | 'customer' | null;
  minOrderAmount: number | null;
  unit: string;
  isGroup: boolean;
  threadId: string | null;
  createdAt: string;
}

/** فیلتر پیشنهادهای دریافتی (پنل خریدار) */
export interface ReceivedOffersQuery {
  categoryId?: number;
  productType?: string;
  hasCheck?: boolean;
  hasDelivery?: boolean;
  page?: number;
  perPage?: number;
}

/** پاسخ getMyReceivedOffers */
export interface ReceivedOffersPage {
  items: ReceivedOffer[];
  total: number;
  page: number;
  perPage: number;
  /** دسته‌های یکتای پیشنهادهای دریافتی — برای فیلتر انتخابی بالای صفحه */
  categories: { id: number; name: string }[];
}

/** پیشنهاد تامین ارسالی من — کارت پنل فروشنده (خواسته مالک ۴-۱۱):
 *  چه کالایی، به چه کسی، چه شد — آخرین پیام گفتگوی مرتبط برای پیگیری.
 *  (خواسته مالک ۸-۱۱) مشخصات ساختاریافتهٔ پیشنهاد هم می‌آید تا عین فرم
 *  ارسال روی کارت دیده شود: حداقل خرید + واحد، چک (درصد/سرسید)، ارسال */
export interface SentOffer {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerUserName: string | null;
  buyerVerified: boolean;
  categoryId: number | null;
  categoryName: string | null;
  categoryPath: string | null;
  productType: string | null;
  message: string;
  isGroup: boolean;
  fee: number;
  threadId: string | null;
  createdAt: string;
  /** آخرین پیام گفتگو — «بعدش چه شد» روی کارت */
  lastMessage: { text: string; at: string; mine: boolean } | null;
  /** حداقل مقدار خرید این پیشنهاد (به واحد دسته) */
  minOrderAmount: number | null;
  /** واحد دستهٔ کالا — کنار حداقل خرید */
  unit: string;
  /** پرداخت با چک پذیرفته می‌شود (درصد/سرسید فقط وقتی true) */
  checkAccepted: boolean;
  checkPercent: number | null;
  checkMaxDays: number | null;
  /** ارسال به محل خریدار (پرداخت‌کنندهٔ حمل فقط وقتی true) */
  deliveryToBuyer: boolean;
  shippingCostBy: 'seller' | 'customer' | null;
}

/** فیلتر پیشنهادهای ارسالی من */
export interface SentOffersQuery {
  categoryId?: number;
  page?: number;
  perPage?: number;
}

/** پاسخ getMySentOffers */
export interface SentOffersPage {
  items: SentOffer[];
  total: number;
  page: number;
  perPage: number;
  categories: { id: number; name: string }[];
}

/** گفتگوی من با یک خریدارِ فوریِ دسته (خواسته مالک ۷-۱۱) — تب «پیشنهادهای
 *  من» صفحهٔ خریدارانِ هر کالا: کنار پیشنهادهای تامین، تاریخچه و نتیجهٔ
 *  گفتگوهای خرید فوری همان دسته هم نمایش داده می‌شود */
export interface UrgentChat {
  threadId: string;
  buyerId: string;
  buyerName: string;
  buyerUserName: string | null;
  buyerVerified: boolean;
  /** آخرین درخواست فوری خریدار در این دسته — زمینهٔ گفتگو */
  request: {
    id: number;
    amount: number;
    unit: string;
    productType: string | null;
    categoryId: number;
    categoryName: string | null;
    createdAt: string;
  } | null;
  /** آخرین پیام گفتگو — پاسخ خریدار یا پیام خودم */
  lastMessage: { text: string; at: string; mine: boolean } | null;
  updatedAt: string;
}

/** پاسخ getMyUrgentChats */
export interface UrgentChatsPage {
  items: UrgentChat[];
}

/** پیکربندی صورتحساب — از site-settings/getBillingConfig (عمومی)؛
 *  خواسته مالک ۶-۱۱: سقف‌های سهمیه حذف شدند — فقط هزینه هر گیرندهٔ ارسال گروهی می‌ماند */
export interface BillingConfig {
  chargePackages: ChargePackage[];
  customCharge: { maxAmount: number; tiers: CustomChargeTier[]; minAmount: number };
  ladder: { monthlyPrice: number; maxMonths: number };
  groupSend: { perRecipientPrice: number };
}
