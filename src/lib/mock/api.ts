/**
 * لایه API ایمچ — اتصال واقعی به بک‌اند مگان (NestJS :4000/api/v1).
 *
 * همه توابع خروجی هم‌شکل ماک قبلی دارند تا هوک‌ها و کامپوننت‌ها دست‌نخورده
 * بمانند. ماک آگهی/کاربر/درخواست/کیف پول حذف شده است — تنها ثابت‌های UI
 * (برچسب‌ها، پکیج‌ها، شماره کارت) از data.ts می‌آیند.
 */

import { apiFetch, serverPost, setTokens, clearTokens, getTokens, ApiError } from '@/lib/api/client';
import type { BuyRequest, Category, City, PackageType, Product, ProductQuery, Province, SessionUser } from '@/lib/types';

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
}

// ─── شکل پاسخ خام بک‌اند ───────────────────────────────────────────────────

/** CategoryNode بک‌اند (snake_case) */
interface RawCategoryNode {
  id: number;
  category_name: string;
  slug: string;
  kind: string;
  unit: string;
  min: number;
  example: string | null;
  parent_id: number | null;
  score: number;
  children?: RawCategoryNode[];
}

/** ProductDto بک‌اند — camelCase منطبق تایپ فرانت با دو استثنا */
interface RawProduct {
  id: number;
  productName: string;
  slug: string;
  description: string;
  stock: number;
  minSalePrice: number;
  minSaleAmount: number;
  unit: string;
  categoryId: number;
  categoryName: string;
  subCategoryId: number;
  subCategoryName: string;
  provinceId: number;
  provinceName: string;
  cityId: number;
  cityName: string;
  myuserId: string;
  seller: {
    id: string;
    userName: string;
    firstName: string;
    lastName: string;
    activePakageType: number;
    isVerified: boolean;
  };
  isLadder: boolean;
  isElevated: boolean;
  hasVideo: boolean;
  isOld: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  photos: string[];
  photoThumbs?: string[];
  status?: string;
  features?: Array<{ key: string; value: string }>;
  rejectionReasons?: string[];
}

const toProduct = (p: RawProduct): Product => {
  const { status, ...rest } = p;
  return {
    ...rest,
    minSalePrice: p.minSalePrice ?? null,
    photoThumbs: p.photoThumbs ?? p.photos,
    seller: {
      ...p.seller,
      activePakageType: (p.seller.activePakageType ?? 0) as PackageType,
    },
    // اندپوینت‌های عمومی فقط آگهی confirmed برمی‌گردانند و status را
    // نمی‌فرستند — پیش‌فرض confirmed تا تب‌های «محصولات من» درست فیلتر شوند
    status: (status ?? 'confirmed') as Product['status'],
  };
};

/** تصویر کارت دسته‌های ریشه — دارایی ثابت فرانت (webp بهینه) */
const ROOT_IMAGES: Record<number, string> = {
  76: '/images/categories/agriculture.webp',
  734: '/images/categories/building.webp',
  136: '/images/categories/metals.webp',
  924: '/images/categories/fashion.webp',
  996: '/images/categories/bags.webp',
  329: '/images/categories/machinery.webp',
  77: '/images/categories/food.webp',
  998: '/images/categories/cosmetics.webp',
  923: '/images/categories/electronics.webp',
  997: '/images/categories/sports.webp',
};

const toCategory = (c: RawCategoryNode): Category => ({
  id: c.id,
  categoryName: c.category_name,
  slug: c.slug,
  unit: c.unit,
  min: c.min,
  example: c.example ?? undefined,
  parentId: c.parent_id,
  score: c.score,
  image: ROOT_IMAGES[c.id],
  children: (c.children ?? []).map(toCategory),
});

// ─── جستجو و پیشنهادها ────────────────────────────────────────────────────

export async function searchSuggestions(typedText: string): Promise<string[]> {
  try {
    return await apiFetch<string[]>('/products/searchSuggestions', { typedText }, { auth: false });
  } catch {
    return []; // جستجوی زنده هرگز نباید UX را بشکند
  }
}

// ─── محصولات ───────────────────────────────────────────────────────────────

export async function getProducts(query: ProductQuery = {}): Promise<Paged<Product>> {
  const raw = await apiFetch<{ items: RawProduct[]; total: number; page: number; pageCount: number }>(
    '/products/getProductList',
    {
      categorySlug: query.categorySlug,
      s: query.s,
      provinceId: query.provinceId,
      cityId: query.cityId,
      sort: query.sort,
      page: query.page,
    },
    { auth: false },
  );
  return { ...raw, items: raw.items.map(toProduct) };
}

export async function getProduct(id: number): Promise<Product | null> {
  try {
    const raw = await apiFetch<RawProduct>('/products/getProductById', { id }, { auth: false });
    return toProduct(raw);
  } catch {
    return null; // 404 → صفحه not-found فرانت
  }
}

export async function getRelatedProducts(product: Product, limit = 6): Promise<Product[]> {
  try {
    const raw = await apiFetch<RawProduct[]>(
      '/products/getRelatedProducts',
      { subCategoryId: product.subCategoryId, excludeId: product.id, limit },
      { auth: false },
    );
    return raw.map(toProduct);
  } catch {
    return [];
  }
}

// ─── دسته‌بندی‌ها و مکان‌ها ────────────────────────────────────────────────

export async function getCategoryTree(): Promise<Category[]> {
  const raw = await apiFetch<RawCategoryNode[]>('/categories/getAllCategories', {}, { auth: false });
  return raw.map(toCategory);
}

// ─── SSR/ISR — فقط برای Server Components صفحات عمومی (F2) ──────────────────
// کش دادهٔ نکست با revalidate؛ در خطا null برمی‌گردند تا صفحه با کلاینت‌رندر ادامه دهد.

export async function getProductsSSR(
  query: ProductQuery = {},
  revalidate = 60,
): Promise<Paged<Product> | null> {
  try {
    const raw = await serverPost<
      { items: RawProduct[]; total: number; page: number; pageCount: number }
    >(
      '/products/getProductList',
      {
        categorySlug: query.categorySlug,
        s: query.s,
        provinceId: query.provinceId,
        cityId: query.cityId,
        sort: query.sort,
        page: query.page,
      },
      revalidate,
    );
    return { ...raw, items: raw.items.map(toProduct) };
  } catch {
    return null; // بک‌اند خاموش/خطا → صفحه با رندر کلاینت ادامه می‌دهد
  }
}

export async function getBuyRequestsSSR(
  opts: { s?: string; provinceId?: number; page?: number; perPage?: number } = {},
  revalidate = 60,
): Promise<Paged<BuyRequest> | null> {
  try {
    const raw = await serverPost<
      { items: RawBuyRequest[]; total: number; page: number; pageCount: number }
    >(
      '/buy-requests/getBuyRequestList',
      { s: opts.s, provinceId: opts.provinceId, page: opts.page, perPage: opts.perPage },
      revalidate,
    );
    return { ...raw, items: raw.items.map(toBuyRequest) };
  } catch {
    return null;
  }
}

/** درخت دسته‌ها سمت سرور — برای نام دسته و مسیر BreadcrumbList */
export async function getCategoryTreeSSR(revalidate = 600): Promise<Category[] | null> {
  try {
    const raw = await serverPost<RawCategoryNode[]>('/categories/getAllCategories', {}, revalidate);
    return raw.map(toCategory);
  } catch {
    return null;
  }
}

/** استان‌ها سمت سرور — داده پایه؛ در root layout به کلاینت seed می‌شود */
export async function getProvincesSSR(revalidate = 3600): Promise<Province[] | null> {
  try {
    const raw = await serverPost<Array<{ id: number; province_name: string }>>(
      '/locations/getAllProvinces',
      {},
      revalidate,
    );
    return raw.map((p) => ({ id: p.id, name: p.province_name }));
  } catch {
    return null;
  }
}

export async function getProvinces(): Promise<Province[]> {
  const raw = await apiFetch<Array<{ id: number; province_name: string }>>(
    '/locations/getAllProvinces',
    {},
    { auth: false },
  );
  return raw.map((p) => ({ id: p.id, name: p.province_name }));
}

export async function getCities(provinceId: number): Promise<City[]> {
  const raw = await apiFetch<Array<{ id: number; province_id: number; city_name: string }>>(
    '/locations/getCitiesByProvince',
    { province_id: provinceId },
    { auth: false },
  );
  return raw.map((c) => ({ id: c.id, name: c.city_name, provinceId: c.province_id }));
}

// ─── درخواست‌های خرید (B7 — واقعی) ─────────────────────────────────────────

/** RawBuyRequest بک‌اند — هم‌شکل تایپ فرانت با استثنای myuserId (رشته ObjectId) */
interface RawBuyRequest {
  id: number;
  name: string | null;
  categoryId: number;
  subcategoryName: string;
  requirementAmount: number;
  unit: string;
  myuserId: string;
  firstName: string;
  lastName: string;
  city: string;
  isVerified: boolean;
  createdAt: string;
}

const toBuyRequest = (r: RawBuyRequest): BuyRequest => ({
  id: r.id,
  name: r.name,
  categoryId: r.categoryId,
  subcategoryName: r.subcategoryName,
  requirementAmount: r.requirementAmount,
  unit: r.unit,
  myuserId: r.myuserId,
  firstName: r.firstName,
  lastName: r.lastName,
  city: r.city,
  isVerified: r.isVerified,
  createdAt: r.createdAt,
});

export async function getBuyRequests(
  opts: { s?: string; provinceId?: number; page?: number; perPage?: number } = {},
): Promise<Paged<BuyRequest>> {
  const raw = await apiFetch<{ items: RawBuyRequest[]; total: number; page: number; pageCount: number }>(
    '/buy-requests/getBuyRequestList',
    {
      s: opts.s,
      provinceId: opts.provinceId,
      page: opts.page,
      perPage: opts.perPage,
    },
    { auth: false },
  );
  return { ...raw, items: raw.items.map(toBuyRequest) };
}

/** جدیدترین درخواست‌ها — سکشن صفحه اول (۴ تایی عین باسکول) */
export async function getLatestBuyRequests(): Promise<BuyRequest[]> {
  const raw = await apiFetch<RawBuyRequest[]>('/buy-requests/getLatestBuyRequests', {}, { auth: false });
  return raw.map(toBuyRequest);
}

/** شماره تماس خریدار — نیازمند ورود (مدل Lead-gen باسکول) */
export async function getBuyRequestContact(id: number): Promise<{
  phone: string;
  firstName: string;
  lastName: string;
  isVerified: boolean;
  isSelf: boolean;
}> {
  return apiFetch(`/buy-requests/getBuyRequestContact`, { id });
}

// ─── فروشنده‌ها ────────────────────────────────────────────────────────────

export async function getSeller(userName: string) {
  const raw = await apiFetch<{
    user: {
      id: string;
      userName: string;
      firstName: string;
      lastName: string;
      activePakageType: number;
      isVerified: boolean;
      businessDesc: string | null;
      avatarUrl: string | null;
      createdAt: string;
    };
    products: RawProduct[];
  }>('/products/getSeller', { userName }, { auth: false });

  return {
    user: {
      ...raw.user,
      daysInImach: Math.max(
        1,
        Math.round((Date.now() - new Date(raw.user.createdAt || Date.now()).getTime()) / 86_400_000),
      ),
    },
    products: raw.products.map(toProduct),
  };
}

// ─── فرم‌ها ────────────────────────────────────────────────────────────────

export async function submitBuyRequest(input: {
  subCategoryId: number;
  productType?: string;
  amount: number;
}): Promise<{ ok: true; id: number }> {
  await apiFetch('/buy-requests/createBuyRequest', {
    subCategoryId: input.subCategoryId,
    name: input.productType || undefined,
    requirementAmount: input.amount,
  });
  return { ok: true, id: 0 };
}

/** ارسال کد OTP واقعی — خطا با پیام فارسی بک‌اند؛ devCode فقط در محیط توسعه برمی‌گردد
 *  (فعلاً بدون پنل پیامک — ساختار برای آینده نگه داشته شده) */
export async function requestOtp(phone: string): Promise<{ ok: true; devCode?: string }> {
  const data = await apiFetch<{ devCode?: string }>('/auth/sendOtp', { phone }, { auth: false, retryOn401: false });
  return { ok: true, devCode: data.devCode };
}

/** شکل user پاسخ getProfile — مبنای کاربر نشست و پروفایل پنل */
interface RawProfileUser {
  id: string;
  phone: string;
  user_name: string | null;
  first_name: string;
  last_name: string;
  sex: string | null;
  role: string;
  has_password: boolean;
  is_verified: boolean;
  is_buyer: boolean;
  is_seller: boolean;
  wallet_balance: number;
  avatar_url: string | null;
  business_desc: string | null;
  province_id: number | null;
  city_id: number | null;
  province: string | null;
  city: string | null;
  product_count: number;
  created_at: string;
  updated_at: string;
}

/** تایید کد + ورود — توکن‌ها را ذخیره و کاربر نشست را برمی‌گرداند
 *  (ساختار برای پنل پیامک آینده — فعلاً فرانت از loginWithSession استفاده می‌کند) */
export async function verifyOtp(input: {
  phone: string;
  code: string;
}): Promise<{ ok: boolean; isNewUser?: boolean; user?: SessionUser }> {
  const data = await apiFetch<{
    isNewUser: boolean;
    accessToken: string;
    refreshToken: string;
  }>('/auth/verifyOtp', input, { auth: false, retryOn401: false });

  setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });

  // کاربر نشست — از پروفایل واقعی؛ اگر موقتاً نرسید، حداقلِ قابل‌نمایش
  let user: SessionUser = {
    phone: input.phone,
    userName: '',
    firstName: '',
    lastName: '',
    avatarUrl: null,
    role: 'buyer',
    hasPassword: false,
  };
  try {
    const profile = await apiFetch<{ user: RawProfileUser }>('/users/getProfile', {});
    user = mapSessionUser(profile.user);
  } catch {
    /* پروفایل اختیاری است — ورود موفق بوده */
  }

  return { ok: true, isNewUser: data.isNewUser, user };
}

/**
 * ورود روش سشن — فقط با شماره موبایل (بدون پیامک، تا آمدن پنل پیامک).
 * • کاربر بدون رمز → مستقیم وارد می‌شود (مثل دفعه اول).
 * • کاربر رمزدار → بک‌اند PASSWORD_REQUIRED می‌دهد؛ requiresPassword=true
 *   برمی‌گردد تا UI فیلد رمز را نشان دهد.
 * کاربر جدید → isNewUser برای هدایت به /register?step=info.
 */
export async function loginWithSession(input: {
  phone: string;
  password?: string;
}): Promise<{
  ok: boolean;
  requiresPassword?: boolean;
  isNewUser?: boolean;
  user?: SessionUser;
}> {
  let data: { isNewUser: boolean; hasPassword: boolean; accessToken: string; refreshToken: string };
  try {
    data = await apiFetch('/auth/login', input, { auth: false, retryOn401: false });
  } catch (err) {
    if (err instanceof ApiError && err.code === 'PASSWORD_REQUIRED') {
      return { ok: false, requiresPassword: true };
    }
    throw err;
  }

  setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });

  // کاربر نشست — از پروفایل واقعی؛ اگر موقتاً نرسید، حداقلِ قابل‌نمایش
  let user: SessionUser = {
    phone: input.phone,
    userName: '',
    firstName: '',
    lastName: '',
    avatarUrl: null,
    role: 'buyer',
    hasPassword: data.hasPassword,
  };
  try {
    const profile = await apiFetch<{ user: RawProfileUser }>('/users/getProfile', {});
    user = mapSessionUser(profile.user);
  } catch {
    /* پروفایل اختیاری است — ورود موفق بوده */
  }

  return { ok: true, isNewUser: data.isNewUser, user };
}

/** تعیین رمز پنل — از بنر قرمز پنل؛ تغییرهای بعدی currentPassword می‌خواهد */
export async function setPasswordRemote(input: {
  password: string;
  currentPassword?: string;
}): Promise<void> {
  await apiFetch('/auth/setPassword', input, { auth: true });
}

/** نگاشت user بک‌اند → کاربر نشست فرانت */
export function mapSessionUser(u: RawProfileUser): SessionUser {
  return {
    phone: u.phone,
    userName: u.user_name ?? '',
    firstName: u.first_name ?? '',
    lastName: u.last_name ?? '',
    avatarUrl: u.avatar_url ?? null,
    // پیش‌فرض فروشنده (خواسته مالک) — فقط وقتی خودش خریدار را انتخاب کرده باشد
    // (is_buyer=true و is_seller=false) پنل خریدار باز می‌شود؛ انتخاب در بک‌اند ماندگار است.
    role: u.is_buyer && !u.is_seller ? 'buyer' : 'seller',
    hasPassword: Boolean(u.has_password),
  };
}

/** کاربر نشست از پروفایل واقعی — null یعنی لاگین نیست؛ خطای شبکه reject می‌شود */
export async function fetchAuthUser(): Promise<SessionUser | null> {
  if (!getTokens()?.accessToken) return null;
  try {
    const profile = await apiFetch<{ user: RawProfileUser }>('/users/getProfile', {});
    return mapSessionUser(profile.user);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) return null;
    throw err;
  }
}

/** تغییر نقش فعال (فروشنده/خریدار) — ماندگار روی is_seller/is_buyer بک‌اند */
export async function updateUserRoleRemote(role: 'seller' | 'buyer'): Promise<void> {
  await apiFetch('/users/updateProfile', {
    is_seller: role === 'seller',
    is_buyer: role === 'buyer',
  });
}

/** خروج — ابطال رفرش‌توکن + پاک‌سازی نشست */
export async function logoutRemote(): Promise<void> {
  const tokens = getTokens();
  if (tokens?.refreshToken) {
    try {
      await apiFetch('/auth/logout', { refreshToken: tokens.refreshToken }, { auth: true, retryOn401: false });
    } catch {
      /* خروج با توکن نامعتبر هم موفق است */
    }
  }
  clearTokens();
}

// ─── پنل فروشنده ──────────────────────────────────────────────────────────

import { PRODUCT_CAPACITY } from './data';
import { uploadImage, deleteImage } from '@/lib/api/client';
import type {
  PanelProfile,
  ProductStatus,
  SavedList,
  SavedUserItem,
  SavedUserNote,
  SuggestedBuyer,
} from '@/lib/types';

/** پروفایل پنل — واقعی از بک‌اند */
export async function getPanelProfile(): Promise<PanelProfile> {
  const raw = await apiFetch<{ user: RawProfileUser; profile: Record<string, unknown> }>('/users/getProfile', {});
  const p = raw.profile as Partial<PanelProfile['profile']>;

  return {
    profile: {
      description: (p.description as string) ?? raw.user.business_desc ?? null,
      activityDomain: (p.activityDomain as string) ?? null,
      humanResourceCount: (p.humanResourceCount as number) ?? null,
      profilePhoto: raw.user.avatar_url ?? (p.profilePhoto as string) ?? null,
      publicPhone: (p.publicPhone as string) ?? null,
      address: (p.address as string) ?? null,
      isCompany: (p.isCompany as boolean) ?? false,
      companyName: (p.companyName as string) ?? '',
      confirmed: raw.user.is_verified,
    },
    userInfo: {
      id: raw.user.id,
      userName: raw.user.user_name ?? '',
      firstName: raw.user.first_name,
      lastName: raw.user.last_name,
      sex: raw.user.sex,
      province: raw.user.province ?? '',
      city: raw.user.city ?? '',
      provinceId: raw.user.province_id ?? null,
      cityId: raw.user.city_id ?? null,
      avatarUrl: raw.user.avatar_url ?? null,
      phone: raw.user.phone,
      isVerified: raw.user.is_verified,
      isBuyer: raw.user.is_buyer,
      isSeller: raw.user.is_seller,
      walletBalance: raw.user.wallet_balance,
      productCount: raw.user.product_count,
      createdAt: (raw.user.created_at ?? '').slice(0, 10),
    },
  };
}

/** ذخیره «ویرایش پروفایل» — واقعی؛ فیلدهای پایه (نام/مکان/نقش/آواتار) + کسب‌وکار */
export async function updatePanelProfile(
  input: Partial<PanelProfile['profile']> & {
    first_name?: string;
    last_name?: string;
    province_id?: number | null;
    city_id?: number | null;
    /** نقش فعال — روی is_seller/is_buyer بک‌اند ماندگار می‌شود */
    role?: 'seller' | 'buyer';
    avatar_url?: string;
  },
): Promise<{ ok: true }> {
  const body: Record<string, unknown> = {};
  if (input.first_name !== undefined) body.first_name = input.first_name;
  if (input.last_name !== undefined) body.last_name = input.last_name;
  if (input.province_id !== undefined) body.province_id = input.province_id;
  if (input.city_id !== undefined) body.city_id = input.city_id;
  if (input.role !== undefined) {
    body.is_seller = input.role === 'seller';
    body.is_buyer = input.role === 'buyer';
  }
  if (input.avatar_url !== undefined) body.avatar_url = input.avatar_url;
  if (input.description !== undefined) body.business_desc = input.description;
  await apiFetch('/users/updateProfile', {
    ...body,
    profile: {
      ...(input.activityDomain !== undefined ? { activityDomain: input.activityDomain } : {}),
      ...(input.humanResourceCount !== undefined ? { humanResourceCount: input.humanResourceCount } : {}),
      ...(input.publicPhone !== undefined ? { publicPhone: input.publicPhone } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.isCompany !== undefined ? { isCompany: input.isCompany } : {}),
      ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
    },
  });
  return { ok: true };
}

/** آگهی‌های «محصولات من» — واقعی */
export async function getMyProducts(): Promise<{
  items: Product[];
  counts: Record<ProductStatus, number>;
  capacity: number;
}> {
  const raw = await apiFetch<{
    items: RawProduct[];
    counts: Record<string, number>;
    capacity: number;
  }>('/products/getMyProducts', {});
  const counts: Record<ProductStatus, number> = {
    confirmed: raw.counts.confirmed ?? 0,
    pending: raw.counts.pending ?? 0,
    rejected: raw.counts.rejected ?? 0,
    deleted: raw.counts.deleted ?? 0,
  };
  return { items: raw.items.map(toProduct), counts, capacity: raw.capacity ?? PRODUCT_CAPACITY };
}

/**
 * ثبت محصول جدید از ویزارد — واقعی:
 * ۱) createProduct → id عددی؛ ۲) آپلود هر عکس به گالری همان آگهی
 * (دکترین فایل: آپلود فقط بعد از وجود مدل — عین imach-back)
 *
 * آپلود عکس‌ها دیگر بی‌صدا گم نمی‌شوند — فایل‌های ناموفق برمی‌گردند تا
 * ویزارد به کاربر هشدار دهد و دکمه «تلاش دوباره» بدهد (خواسته مالک:
 * «تصویر در هیچ قسمتی ذخیره نمی‌شود» ریشه همین بی‌صدایی بود).
 */
export async function submitProduct(input: {
  productName: string;
  subCategoryId: number;
  provinceId: number;
  cityId: number;
  stock: number;
  minSaleAmount: number;
  minSalePrice: number;
  description: string;
  features: { key: string; value: string }[];
  photos?: File[];
}): Promise<{ ok: true; id: number; status: 'pending'; failedPhotos: File[] }> {
  const created = await apiFetch<{ id: number; status: string }>('/products/createProduct', {
    productName: input.productName,
    subCategoryId: input.subCategoryId,
    provinceId: input.provinceId,
    cityId: input.cityId,
    stock: input.stock,
    minSaleAmount: input.minSaleAmount,
    minSalePrice: input.minSalePrice,
    description: input.description,
    features: input.features,
  });

  // آپلود عکس‌ها به گالری همین آگهی — ناموفق‌ها برای «تلاش دوباره» برمی‌گردند
  const failedPhotos: File[] = [];
  for (const file of (input.photos ?? []).slice(0, 4)) {
    try {
      await uploadImage(file, { model: 'Product', modelId: created.id, key: 'gallery', replace: false });
    } catch {
      failedPhotos.push(file);
    }
  }

  return { ok: true, id: created.id, status: 'pending', failedPhotos };
}

/**
 * تلاش دوباره آپلود عکس‌های ناموفقِ ثبت/ویرایش — به گالری همان آگهی.
 * خروجی: فایل‌هایی که باز هم ناموفق ماندند (اگر خالی بود همه رفتند).
 */
export async function retryProductPhotos(
  productId: number,
  files: File[],
): Promise<{ failed: File[] }> {
  const failed: File[] = [];
  for (const file of files.slice(0, 4)) {
    try {
      await uploadImage(file, { model: 'Product', modelId: productId, key: 'gallery', replace: false });
    } catch {
      failed.push(file);
    }
  }
  return { failed };
}

/** حذف نرم آگهی — واقعی */
export async function deleteMyProduct(id: number): Promise<{ ok: true }> {
  await apiFetch('/products/deleteMyProduct', { id });
  return { ok: true };
}

/** جزئیات کامل آگهی خودم برای پیش‌پر کردن فرم ویرایش — واقعی */
export async function getMyProductDetail(id: number): Promise<{
  product: Product;
  photoFiles: { id: string; url: string; thumbUrl: string }[];
}> {
  const raw = await apiFetch<RawProduct & { photoFiles: { id: string; url: string; thumbUrl: string }[] }>(
    '/products/getMyProductDetail',
    { id },
  );
  const { photoFiles, ...rest } = raw;
  return { product: toProduct(rest), photoFiles };
}

/**
 * ویرایش آگهی خودم — واقعی:
 * ۱) updateMyProduct (دوباره «در انتظار تایید» مثل باسکول)؛
 * ۲) عکس‌های جدید آپلود می‌شوند؛ ۳) عکس‌های حذف‌شده پاک می‌شوند.
 * ناموفق‌های آپلود برمی‌گردند (نه بی‌صدایی) تا فرم هشدار/تلاش-دوباره بدهد.
 */
export async function updateMyProduct(input: {
  id: number;
  productName: string;
  subCategoryId: number;
  provinceId: number;
  cityId: number;
  stock: number;
  minSaleAmount: number;
  minSalePrice: number;
  description: string;
  features: { key: string; value: string }[];
  newPhotos?: File[];
  removedPhotoIds?: string[];
}): Promise<{ ok: true; id: number; status: 'pending'; failedPhotos: File[] }> {
  const updated = await apiFetch<{ id: number; status: string }>('/products/updateMyProduct', {
    id: input.id,
    productName: input.productName,
    subCategoryId: input.subCategoryId,
    provinceId: input.provinceId,
    cityId: input.cityId,
    stock: input.stock,
    minSaleAmount: input.minSaleAmount,
    minSalePrice: input.minSalePrice,
    description: input.description,
    features: input.features,
  });

  // عکس‌های حذف‌شده — بهترین‌حال؛ خطا جریان ویرایش را نمی‌شکند
  for (const fileId of input.removedPhotoIds ?? []) {
    try {
      await deleteImage(fileId);
    } catch {
      /* ردیف DB منبع حقیقت است — عروسک دوره‌ای ادمین جمع می‌کند */
    }
  }

  // عکس‌های جدید — ناموفق‌ها برمی‌گردند
  const failedPhotos: File[] = [];
  for (const file of (input.newPhotos ?? []).slice(0, 4)) {
    try {
      await uploadImage(file, { model: 'Product', modelId: input.id, key: 'gallery', replace: false });
    } catch {
      failedPhotos.push(file);
    }
  }

  return { ok: true, id: updated.id, status: 'pending', failedPhotos };
}

/** خرید نردبان یک‌ماهه — کسر واقعی از کیف پول */
export async function ladderProduct(productId: number): Promise<{ productId: number; expiresAt: string }> {
  return apiFetch<{ productId: number; expiresAt: string }>('/wallet/ladderProduct', { productId });
}

// ─── نشان شده ها (B7 — واقعی) ──────────────────────────────────────────────

export async function getSavedLists(): Promise<SavedList[]> {
  return apiFetch<SavedList[]>('/saved/getSavedLists', {});
}

export async function getSavedListUsers(listId: string): Promise<SavedUserItem[] | null> {
  try {
    return await apiFetch<SavedUserItem[] | null>('/saved/getSavedListUsers', { listId });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function createSavedList(name: string): Promise<SavedList> {
  return apiFetch<SavedList>('/saved/createSavedList', { name });
}

export async function updateSavedList(listId: string, name: string): Promise<SavedList> {
  return apiFetch<SavedList>('/saved/updateSavedList', { listId, name });
}

export async function deleteSavedList(listId: string): Promise<{ ok: true }> {
  await apiFetch('/saved/deleteSavedList', { listId });
  return { ok: true };
}

/** «نشان کردن» خریدار — لیست مقصد یا نام لیست جدید (عین مودال باسکول) */
export async function saveBuyerToList(input: {
  targetUserId: string;
  listId?: string;
  listName?: string;
}): Promise<{ savedUserId: string; listId: string }> {
  return apiFetch('/saved/saveBuyerToList', input);
}

export async function removeSavedUser(savedUserId: string): Promise<{ ok: true }> {
  await apiFetch('/saved/removeSavedUser', { savedUserId });
  return { ok: true };
}

export async function setSavedUserStatus(
  savedUserId: string,
  status: SavedUserItem['status'],
): Promise<{ ok: true }> {
  await apiFetch('/saved/setSavedUserStatus', { savedUserId, status });
  return { ok: true };
}

export async function addSavedUserNote(
  savedUserId: string,
  text: string,
): Promise<SavedUserNote> {
  return apiFetch<SavedUserNote>('/saved/addSavedUserNote', { savedUserId, text });
}

export async function moveSavedUser(savedUserId: string, toListId: string): Promise<{ ok: true }> {
  await apiFetch('/saved/moveSavedUser', { savedUserId, toListId });
  return { ok: true };
}

/** خریداران پیشنهادی — تطبیق درخواست‌ها با آگهی‌های من (B7 — واقعی) */
export async function getSuggestedBuyers(): Promise<SuggestedBuyer[]> {
  const raw = await apiFetch<
    Array<{
      buyRequest: RawBuyRequest;
      matchScore: number;
      tier: SuggestedBuyer['tier'];
      relatedProduct: string;
    }>
  >('/buy-requests/getSuggestedBuyers', {});
  return raw.map((s) => ({ ...s, buyRequest: toBuyRequest(s.buyRequest) }));
}


// ─── چت و پیام‌ها (B8 — واقعی) ─────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  readAt: string | null;
  createdAt: string;
}

export interface ChatThreadInfo {
  id: string;
  productId: number;
  productName: string;
  myId: string;
  myRole: 'buyer' | 'seller';
  counterpart: { id: string; firstName: string; lastName: string; userName: string };
  lastMessage: { text: string; at: string; senderId: string } | null;
  unreadCount: number;
  updatedAt: string;
}

/** شروع/یافتن مکالمه روی یک آگهی */
export async function startChatThread(productId: number): Promise<ChatThreadInfo> {
  return apiFetch<ChatThreadInfo>('/chat/startThread', { productId });
}

/** ارسال پیام — بک‌اند push لحظه‌ای WS هم می‌فرستد */
export async function sendChatMessage(threadId: string, text: string): Promise<ChatMessage> {
  return apiFetch<ChatMessage>('/chat/sendMessage', { threadId, text });
}

/** پیام‌های مکالمه — باز کردن یعنی خواندن */
export async function getChatThreadMessages(threadId: string): Promise<ChatMessage[]> {
  return apiFetch<ChatMessage[]>('/chat/getThreadMessages', { threadId });
}

/** لیست مکالمات من + خوانده‌نشده */
export async function getConversations(): Promise<ChatThreadInfo[]> {
  return apiFetch<ChatThreadInfo[]>('/chat/getConversations', {});
}

/** علامت خوانده‌شدن بدون واکشی */
export async function markChatThreadRead(threadId: string): Promise<{ read: number }> {
  return apiFetch<{ read: number }>('/chat/markThreadRead', { threadId });
}

// ─── پیام‌های پشتیبانی (ادمین → کاربر) ─────────────────────────────────────

export interface AdminInboxMessage {
  id: string;
  text: string;
  adminUsername: string;
  readAt: string | null;
  createdAt: string;
}

export interface AdminInbox {
  /** صعودی — قدیمی → جدید (۵۰ پیام آخر) */
  items: AdminInboxMessage[];
  total: number;
  unread: number;
}

/** پیام‌های «پشتیبانی ایمچ» من — ارسال مستقیم ادمین (یک‌طرفه) */
export async function getMyAdminMessages(): Promise<AdminInbox> {
  return apiFetch<AdminInbox>('/chat/getMyAdminMessages', {});
}

/** باز کردن مکالمه پشتیبانی = خواندن همه پیام‌های خوانده‌نشده */
export async function markAdminMessagesRead(): Promise<{ read: number }> {
  return apiFetch<{ read: number }>('/chat/markMyAdminMessagesRead', {});
}

// ─── احراز هویت اسناد (B6 — واقعی) ────────────────────────────────────────

export interface VerificationDoc {
  id: string;
  fieldKey: string;
  url: string;
  thumbUrl: string | null;
  createdAt: string;
}

export interface MyVerification {
  /** none | pending | approved | rejected */
  status: 'none' | 'pending' | 'approved' | 'rejected';
  submittedAt?: string;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  docs: Partial<Record<'nationalCard' | 'selfie', VerificationDoc | null>>;
}

/** وضعیت احراز هویت کاربر جاری + مدارک ارسالی */
export async function getMyVerification(): Promise<MyVerification> {
  return apiFetch<MyVerification>('/verification/getMyVerification', {});
}

/**
 * ارسال مدارک — یک درخواست multipart با کارت ملی + سلفی (عین باسکول).
 * بک‌اند سفارش را اتمیک می‌سازد؛ در خطا هیچ فایلی جامانده نمی‌ماند.
 */
export async function submitVerification(input: {
  nationalCard: File;
  selfie: File;
}): Promise<MyVerification> {
  const tokens = getTokens();
  if (!tokens?.accessToken) {
    throw new ApiError('برای ارسال مدارک ابتدا وارد حساب خود شوید.', 401, 'AUTH_REQUIRED');
  }

  const form = new FormData();
  form.append('nationalCard', input.nationalCard);
  form.append('selfie', input.selfie);

  const res = await fetch('/api/verification/submitVerification', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
    body: form,
  });
  const json = (await res.json().catch(() => null)) as
    | { status: true; data: MyVerification; message?: string }
    | { status: false; message: string; code?: string }
    | null;
  if (!json) throw new ApiError('ارسال مدارک ناموفق بود.', res.status, 'NETWORK');
  if (json.status === false) throw new ApiError(json.message, res.status, json.code);
  return json.data;
}

// ─── پنل خریدار ────────────────────────────────────────────────────────────

import type { BuyRequestStatus, MyBuyRequest, SuggestedSellerGroup } from '@/lib/types';

export async function getMyBuyRequests(): Promise<{
  items: MyBuyRequest[];
  counts: Record<BuyRequestStatus, number>;
}> {
  const raw = await apiFetch<{
    items: MyBuyRequest[];
    counts: Record<string, number>;
  }>('/buy-requests/getMyBuyRequests', {});
  const counts: Record<BuyRequestStatus, number> = {
    confirmed: raw.counts.confirmed ?? 0,
    pending: raw.counts.pending ?? 0,
    rejected: raw.counts.rejected ?? 0,
  };
  return { items: raw.items, counts };
}

export async function submitPanelBuyRequest(input: {
  subCategoryId: number;
  productType: string;
  requirementAmount: number;
  goal: 'price_and_buy' | 'price_only';
  hasHistory: boolean;
}): Promise<{ ok: true; id: number; status: 'pending' }> {
  const data = await apiFetch<{ id: number; status: string }>('/buy-requests/createBuyRequest', {
    subCategoryId: input.subCategoryId,
    name: input.productType || undefined,
    requirementAmount: input.requirementAmount,
    goal: input.goal,
    hasHistory: input.hasHistory,
  });
  return { ok: true, id: data.id, status: 'pending' };
}

export async function deleteMyBuyRequest(id: number): Promise<{ ok: true }> {
  await apiFetch('/buy-requests/deleteMyBuyRequest', { id });
  return { ok: true };
}

/** ویرایش درخواست «در انتظار تایید» خودم — نوع/میزان/هدف */
export async function updateMyBuyRequest(input: {
  id: number;
  productType: string;
  requirementAmount: number;
  goal: 'price_and_buy' | 'price_only';
}): Promise<{ ok: true }> {
  await apiFetch('/buy-requests/updateMyBuyRequest', {
    id: input.id,
    name: input.productType || undefined,
    requirementAmount: input.requirementAmount,
    goal: input.goal,
  });
  return { ok: true };
}

/** فروشندگان پیشنهادی — واقعی از بک‌اند (گروه دسته‌ای بر اساس درخواست‌های من) */
export async function getSuggestedSellerGroups(): Promise<SuggestedSellerGroup[]> {
  return apiFetch<SuggestedSellerGroup[]>('/buy-requests/getSuggestedSellers', {});
}

// ─── کیف پول (B9 — واقعی) ──────────────────────────────────────────────────

import {
  AIMCH_CARD_NUMBER,
  AIMCH_CARD_OWNER,
  CHARGE_PACKAGES,
} from './data';
import type { ChargePackage, MyChargeOrder, WalletTransaction } from '@/lib/types';

/** ارسال فیش شارژ کارت‌به‌کارت — واقعی: multipart (packageKey + receipt) */
export async function submitChargeRequest(input: {
  packageKey: ChargePackage['key'];
  receiptDataUrl: string;
}): Promise<{ ok: true; transactionId: string }> {
  const tokens = getTokens();
  if (!tokens?.accessToken) {
    throw new ApiError('برای شارژ کیف پول ابتدا وارد حساب خود شوید.', 401, 'AUTH_REQUIRED');
  }

  // dataURL → Blob (فرم صفحه همان dataURL را می‌دهد)
  const form = new FormData();
  form.append('packageKey', input.packageKey);
  form.append('receipt', dataUrlToBlob(input.receiptDataUrl));

  const res = await fetch('/api/wallet/createChargeOrder', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
    body: form,
  });
  const json = (await res.json().catch(() => null)) as
    | { status: true; data?: { id?: number }; message?: string }
    | { status: false; message: string; code?: string }
    | null;
  if (!json) throw new ApiError('ارسال فیش ناموفق بود.', res.status, 'NETWORK');
  if (json.status === false) throw new ApiError(json.message, res.status, json.code);
  return { ok: true, transactionId: String(json.data?.id ?? '') };
}

/** dataURL → Blob برای فرم multipart */
function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',');
  const mime = /data:(.*?)(;|$)/.exec(head)?.[1] || 'image/jpeg';
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** تراکنش‌های قطعی‌شده — فقط شارژ کارت‌به‌کارت «تأییدشده» + نردبان + اصلاح ادمین */
export async function getWalletTransactions(): Promise<WalletTransaction[]> {
  const raw = await apiFetch<{ items: Array<Omit<WalletTransaction, 'at'> & { at: string }> }>(
    '/wallet/getWalletTransactions',
    {},
  );
  return raw.items.map((t) => ({
    ...t,
    at: t.at,
  }));
}

/** فیش‌های کارت‌به‌کارت خودم — در انتظار/تأیید/رد + دلیل رد (تب «کارت به کارت») */
export async function getMyChargeOrders(): Promise<MyChargeOrder[]> {
  const raw = await apiFetch<{ items: MyChargeOrder[] }>('/wallet/getMyChargeOrders', {});
  return raw.items;
}

export { AIMCH_CARD_NUMBER, AIMCH_CARD_OWNER, CHARGE_PACKAGES };
