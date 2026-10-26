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

export type PackageType = 0 | 1 | 2 | 3; // باسکول: ۰=رایگان ۱=عادی ۲=ویژه ۳=ویژه+ — در ایمچ فعلاً بدون کاربرد

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

/** پکیج شارژ کیف پول — سه پکیج کارت به کارت */
export interface ChargePackage {
  key: 'p100' | 'p200' | 'p400';
  amount: number; // مبلغ واریزی (تومان)
  bonusPercent: number; // ۰ / ۱۰ / ۲۰ درصد شارژ اضافه
  charge: number; // شارژ اعمالی نهایی = amount × (۱ + درصد)
}

/** تراکنش کیف پول */
export interface WalletTransaction {
  id: number;
  title: string;
  amount: number;
  incoming: boolean; // واریز / کسر
  at: string;
  /** کارت به کارت: تا تایید ادمین «در انتظار تایید» است */
  pendingAdmin?: boolean;
}
