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
  firstName: string;
  lastName: string;
  city: string;
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
    publicPhone: string | null;
    address: string | null; // «تهران - تهران»
    isCompany: boolean;
    companyName: string;
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
  };
  /** تصاویر مربوطه/گواهی‌های کسب‌وکار — آپلودی همان کاربر (اسلات‌های User) */
  gallery: Array<{ id: string; url: string; thumbUrl: string }>;
  certificates: Array<{ id: string; url: string; thumbUrl: string }>;
}

/** لیست نشان‌شده — پاسخ سرویس: { lists: [{ id, name, cnt, saved }] } */
export interface SavedList {
  id: string; // ObjectId
  name: string; // «سیب زمینی»
  cnt: number; // تعداد نشان‌شده‌ها
}

/** وضعیت CRM نشان‌شده — چیپ‌های صفحه جزئیات لیست باسکول */
export type SavedUserStatusKey =
  | 'following' // در حال پیگیری
  | 'not_needed' // فعلا نیاز نداشت
  | 'unresponsive' // پاسخگو نبود
  | 'out_of_stock' // موجودی نداشت
  | 'priority_high' // اولویت زیاد
  | 'priority_medium' // اولویت متوسط
  | 'priority_low'; // اولویت کم

export interface SavedUserNote {
  id: string;
  text: string; // «یادم باشه زنگ بزنم»
  createdAt: string; // «۳ آبان ۱۴۰۵ , ۹:۵۲»
}

/** کاربر نشان‌شده در یک لیست (خریدار) */
export interface SavedUserItem {
  id: string;
  name: string; // «مریم صابری»
  status: SavedUserStatusKey;
  notes: SavedUserNote[];
}

/**
 * خریدار پیشنهادی — سرویس relatedByAdd باسکول:
 * تطبیق دسته + نوع کالا + حجم خرید/فروش؛ سورت با امتیاز تطابق.
 * مثال: خرما خازویی → اول خرما خازویی هم‌حجم، بعد بقیه خرماها، بعد محصولات نزدیک.
 */
export interface SuggestedBuyer {
  buyRequest: BuyRequest;
  matchScore: number; // ۰..۱۰۰
  tier: 'exact' | 'same-product' | 'near-category'; // نوع کالا / همان محصول / دسته نزدیک
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

/** گزینه نظرسنجی */
export type SurveyScore = 'excellent' | 'good' | 'average' | 'bad' | 'very_bad';

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
  type: 'time' | 'quantity';
  /** درصد جاری — در تعدادی از پله/override دستی */
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

/** ردیف دفتر خرید من — دسته برگ + بازه حجم خرید ماهانه */
export interface BuyerBookItem {
  categoryId: number;
  name: string; // نام دسته (برای نمایش)
  volumeMin: number;
  volumeMax: number; // 0 = بدون سقف
  unit: string; // کیلوگرم | تن | عدد | بسته | لیتر | متر
}

/** پاسخ getMyBook */
export interface MyBuyerBook {
  max: number; // 15
  units: string[];
  items: BuyerBookItem[];
}

/** کارت خریدار در دایرکتوری — بی نام و تماس (حریم خصوصی) */
export interface BuyerDirectoryItem {
  id: string; // برای sendSupplyOffer
  role: 'عمده‌خریدار' | 'خرده‌خریدار';
  categories: { id: number; name: string; range: string }[];
  moreCategories: number;
  province: string | null;
  city: string | null;
  lastActiveAt: string;
  activeRecently: boolean; // فعال در ۷ روز اخیر
}

/** فیلتر دایرکتوری خریداران */
export interface BuyerDirectoryQuery {
  categoryId?: number;
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

/** سهمیه پیشنهاد تامین امروز (دارندگان بسته) */
export interface OfferQuota {
  isFeatured: boolean;
  pakageType: number;
  dailyLimit: number;
  usedToday: number;
  left: number;
  groupSend: {
    perRecipientPrice: number;
    maxBatch: number;
    maxPerDay: number;
    usedToday: number;
    left: number;
  };
  walletBalance: number;
}

/** نتیجه ارسال تکی */
export interface SendOfferResult {
  offerId: string;
  threadId: string;
  quotaLeft: number;
}

/** نتیجه ارسال گروهی */
export interface GroupSendResult {
  sent: number;
  fee: number;
  perRecipient: number;
  balance: number;
  groupLeft: number;
}

/** پیکربندی صورتحساب — از site-settings/getBillingConfig (عمومی) */
export interface BillingConfig {
  chargePackages: ChargePackage[];
  customCharge: { maxAmount: number; tiers: CustomChargeTier[]; minAmount: number };
  ladder: { monthlyPrice: number; maxMonths: number };
  supplyOffer: { dailyLimits: { pakageType: number; label: string; limit: number }[] };
  groupSend: { perRecipientPrice: number; maxPerDay: number; maxBatch: number };
}
