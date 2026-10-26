/**
 * لایه API ایمچ — F1: اتصال واقعی به بک‌اند مگان (NestJS :4000/api/v1).
 *
 * همه توابع خروجی هم‌شکل ماک قبلی دارند تا هوک‌ها و کامپوننت‌ها دست‌نخورده
 * بمانند. اندپوینت‌هایی که هنوز در بک پیاده نشده‌اند (درخواست‌های خرید،
 * CRM نشان‌شده‌ها، کیف پول، …) موقتاً ماک می‌مانند تا فاز B6..B9 آزاد شوند.
 */

import { apiFetch, setTokens, clearTokens, getTokens, ApiError } from '@/lib/api/client';
import type { BuyRequest, Category, City, PackageType, Product, ProductQuery, Province } from '@/lib/types';
import {
  categories as categoriesData,
  cities as citiesData,
  provinces,
} from './data';

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
    ...(status ? { status: status as Product['status'] } : {}),
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

/** ارسال کد OTP واقعی — خطا با پیام فارسی بک‌اند؛ devCode فقط در محیط توسعه برمی‌گردد */
export async function requestOtp(phone: string): Promise<{ ok: true; devCode?: string }> {
  const data = await apiFetch<{ devCode?: string }>('/auth/sendOtp', { phone }, { auth: false, retryOn401: false });
  return { ok: true, devCode: data.devCode };
}

/** تایید کد + ورود — توکن‌ها را ذخیره می‌کند و userName می‌گیرد */
export async function verifyOtp(input: {
  phone: string;
  code: string;
}): Promise<{ ok: boolean; userName?: string; isNewUser?: boolean }> {
  const data = await apiFetch<{
    isNewUser: boolean;
    accessToken: string;
    refreshToken: string;
  }>('/auth/verifyOtp', input, { auth: false, retryOn401: false });

  setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });

  // نام کاربری عمومی برای نشست فرانت
  let userName = '';
  try {
    const profile = await apiFetch<{ user: { user_name: string | null } }>('/users/getProfile', {});
    userName = profile.user.user_name ?? '';
  } catch {
    /* پروفایل اختیاری است — ورود موفق بوده */
  }

  return { ok: true, userName, isNewUser: data.isNewUser };
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
import { uploadImage } from '@/lib/api/client';
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
  interface RawProfile {
    user: {
      id: string;
      phone: string;
      user_name: string | null;
      first_name: string;
      last_name: string;
      sex: string | null;
      role: string;
      is_verified: boolean;
      is_buyer: boolean;
      is_seller: boolean;
      wallet_balance: number;
      avatar_url: string | null;
      business_desc: string | null;
      product_count: number;
      created_at: string;
    };
    profile: Record<string, unknown>;
  }
  const raw = await apiFetch<RawProfile>('/users/getProfile', {});
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
      province: (p.province as string) ?? '',
      city: (p.city as string) ?? '',
      isVerified: raw.user.is_verified,
      isBuyer: raw.user.is_buyer,
      isSeller: raw.user.is_seller,
      walletBalance: raw.user.wallet_balance,
      productCount: raw.user.product_count,
      createdAt: (raw.user.created_at ?? '').slice(0, 10),
    },
  };
}

/** ذخیره فرم «ویرایش پروفایل» — واقعی */
export async function updatePanelProfile(input: Partial<PanelProfile['profile']>): Promise<{ ok: true }> {
  const body: Record<string, unknown> = {};
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
      ...(input.province !== undefined ? { province: input.province } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
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
}): Promise<{ ok: true; id: number; status: 'pending' }> {
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

  // آپلود عکس‌ها به گالری همین آگهی — با خطا راه می‌افتیم ولی ثبت لغو نمی‌شود
  const files = input.photos ?? [];
  for (const file of files.slice(0, 4)) {
    try {
      await uploadImage(file, { model: 'Product', modelId: created.id, key: 'gallery', replace: false });
    } catch (err) {
      console.warn('آپلود عکس آگهی ناموفق بود:', err instanceof Error ? err.message : err);
    }
  }

  return { ok: true, id: created.id, status: 'pending' };
}

/** حذف نرم آگهی — واقعی */
export async function deleteMyProduct(id: number): Promise<{ ok: true }> {
  await apiFetch('/products/deleteMyProduct', { id });
  return { ok: true };
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

// ─── پنل خریدار (ماک تا فازهای بعدی) ──────────────────────────────────────

import { suggestedSellerGroups } from './data';
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

export async function getSuggestedSellerGroups(): Promise<SuggestedSellerGroup[]> {
  await new Promise((r) => setTimeout(r, 450));
  return suggestedSellerGroups.map((g) => ({ ...g }));
}

// ─── کیف پول (ماک تا فاز B9) ──────────────────────────────────────────────

import {
  AIMCH_CARD_NUMBER,
  AIMCH_CARD_OWNER,
  CHARGE_PACKAGES,
  walletTransactions as walletTransactionsData,
} from './data';
import type { ChargePackage, WalletTransaction } from '@/lib/types';

export async function submitChargeRequest(input: {
  packageKey: ChargePackage['key'];
  receiptDataUrl: string;
}): Promise<{ ok: true; transactionId: number }> {
  await new Promise((r) => setTimeout(r, 900));
  return { ok: true, transactionId: Date.now() };
}

export async function getWalletTransactions(): Promise<WalletTransaction[]> {
  await new Promise((r) => setTimeout(r, 250));
  return walletTransactionsData;
}

export { AIMCH_CARD_NUMBER, AIMCH_CARD_OWNER, CHARGE_PACKAGES };
