/**
 * لایه API ماک — شبیه‌سازی تماس‌های شبکه با تأخیر.
 * در فاز اتصال به بک‌اند، همین اینترفیس‌ها به fetch واقعی
 * (بک‌اند ایمچ: /api/v1/...) تغییر می‌کنند و هوک‌های React Query دست‌نخورده می‌مانند.
 */

import {
  buyRequests as buyRequestsData,
  categories as categoriesData,
  categories,
  categoryTree,
  cities as citiesData,
  products as productsData,
  provinces,
  users,
} from './data';
import type { BuyRequest, Category, City, Product, ProductQuery, SortKey } from '@/lib/types';

const LATENCY = 350;

const delay = <T>(value: T, ms = LATENCY): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
}

// ─── جستجو و پیشنهادها ────────────────────────────────────────────────

export async function searchSuggestions(typedText: string): Promise<string[]> {
  const q = typedText.trim();
  if (!q) return [];
  const pool = new Set<string>();
  categories.forEach((c) => {
    if (c.categoryName.includes(q)) pool.add(c.categoryName);
  });
  productsData.forEach((p) => {
    if (p.productName.includes(q)) pool.add(`قیمت ${p.productName}`);
  });
  return delay([...pool].slice(0, 6), 150);
}

// ─── محصولات ──────────────────────────────────────────────────────────

export async function getProducts(query: ProductQuery = {}): Promise<Paged<Product>> {
  const { categorySlug, s, provinceId, cityId, sort = 'related', page = 1 } = query;
  const PER_PAGE = 16;

  let items = [...productsData];

  if (categorySlug) {
    const cat = categoriesData.find((c) => c.slug === categorySlug || c.categoryName === categorySlug);
    if (cat) {
      // خود دسته + تمام فرزندان (درخت سه‌سطحی)
      const ids = new Set<number>([cat.id]);
      categoriesData.filter((c) => c.parentId === cat.id).forEach((c) => ids.add(c.id));
      categoriesData
        .filter((c) => c.parentId !== null && ids.has(c.parentId))
        .forEach((c) => ids.add(c.id));
      items = items.filter(
        (p) => ids.has(p.subCategoryId) || ids.has(p.categoryId),
      );
    }
  }

  if (s?.trim()) {
    const q = s.trim();
    items = items.filter(
      (p) =>
        p.productName.includes(q) ||
        p.subCategoryName.includes(q) ||
        p.categoryName.includes(q) ||
        p.description.includes(q),
    );
  }

  if (provinceId) items = items.filter((p) => p.provinceId === provinceId);
  if (cityId) items = items.filter((p) => p.cityId === cityId);

  switch (sort) {
    case 'newest':
      items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      break;
    default:
      // مرتبط‌ترین — دقیقاً مثل باسکول: آگهی‌های نردبان‌شده بالای نتایج می‌آیند
      items.sort((a, b) => Number(b.isLadder) - Number(a.isLadder));
  }

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const safePage = Math.min(page, pageCount);
  return delay({
    items: items.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE),
    total,
    page: safePage,
    pageCount,
  });
}

export async function getProduct(id: number): Promise<Product | null> {
  return delay(productsData.find((p) => p.id === id) ?? null);
}

export async function getRelatedProducts(product: Product, limit = 6): Promise<Product[]> {
  const related = productsData
    .filter((p) => p.id !== product.id && p.subCategoryId === product.subCategoryId)
    .slice(0, limit);
  return delay(related);
}

// ─── دسته‌بندی‌ها و مکان‌ها ────────────────────────────────────────────

export async function getCategoryTree(): Promise<Category[]> {
  return delay(categoryTree());
}

export async function getProvinces(): Promise<{ id: number; name: string }[]> {
  return delay(provinces);
}

export async function getCities(provinceId: number): Promise<City[]> {
  return delay(citiesData.filter((c) => c.provinceId === provinceId), 120);
}

// ─── درخواست‌های خرید ─────────────────────────────────────────────────

export async function getBuyRequests(opts: { s?: string; provinceName?: string } = {}): Promise<BuyRequest[]> {
  let items = [...buyRequestsData];
  if (opts.s?.trim()) {
    const q = opts.s.trim();
    items = items.filter(
      (r) => (r.name ?? '').includes(q) || r.subcategoryName.includes(q),
    );
  }
  if (opts.provinceName) items = items.filter((r) => citiesData.find((c) => c.name === r.city)?.provinceId === provinces.find((p) => p.name === opts.provinceName)?.id);
  return delay(items, 450);
}

// ─── فروشنده‌ها ───────────────────────────────────────────────────────

export async function getSeller(userName: string) {
  const user = users.find((u) => u.userName === userName) ?? null;
  if (!user) return delay(null, 200);
  const sellerProducts = productsData.filter((p) => p.myuserId === user.id);
  return delay({ user, products: sellerProducts });
}

// ─── فرم‌ها (mutationهای ماک) ──────────────────────────────────────────

export async function submitBuyRequest(input: {
  productName: string;
  productType?: string;
  amount: number;
}): Promise<{ ok: true; id: number }> {
  return delay({ ok: true, id: Date.now() }, 700);
}

export async function requestOtp(phone: string): Promise<{ ok: true }> {
  return delay({ ok: true }, 600);
}

export async function verifyOtp(input: { phone: string; code: string }): Promise<{ ok: boolean; userName?: string }> {
  // هر کد ۵ رقمی در نمونه قبول است
  return delay({ ok: /^\d{5}$/.test(input.code), userName: 'c34qxnsh' }, 600);
}

// ─── پنل فروشنده ──────────────────────────────────────────────────────

import {
  PANEL_USER_ID,
  PRODUCT_CAPACITY,
  myProducts,
  panelProfile,
  savedLists as savedListsData,
  savedUsers as savedUsersData,
  buyRequests as buyRequestsForPanel,
} from './data';
import type {
  PanelProfile,
  ProductStatus,
  SavedList,
  SavedUserItem,
  SuggestedBuyer,
} from '@/lib/types';

/** پروفایل کاربر جاری پنل — ساختار عین user/get_profile باسکول */
export async function getPanelProfile(): Promise<PanelProfile> {
  return delay(panelProfile, 200);
}

/** آگهی‌های ثبت‌شده از ویزارد — ماندگار در حافظه مرورگر (فاز ماک) */
const EXTRA_KEY = 'imach:my-extra-products';

function readExtras(): Product[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(EXTRA_KEY);
    return raw ? (JSON.parse(raw) as Product[]) : [];
  } catch {
    return [];
  }
}

function writeExtras(items: Product[]) {
  try {
    window.localStorage.setItem(EXTRA_KEY, JSON.stringify(items));
  } catch {
    /* حافظه پر است — فقط درstate جاری */
  }
}

/** آگهی‌های «محصولات من» + شمارنده تب‌ها */
export async function getMyProducts(): Promise<{
  items: Product[];
  counts: Record<ProductStatus, number>;
  capacity: number;
}> {
  const counts: Record<ProductStatus, number> = { confirmed: 0, pending: 0, rejected: 0, deleted: 0 };
  const all = [...myProducts, ...readExtras()];
  all.forEach((p) => {
    counts[p.status ?? 'confirmed'] += 1;
  });
  return delay({ items: all, counts, capacity: PRODUCT_CAPACITY }, 250);
}

/** ثبت محصول جدید از ویزارد — نتیجه: «در انتظار تایید» */
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
  photosCount: number;
}): Promise<{ ok: true; id: number; status: 'pending' }> {
  // ثبت در «در انتظار تایید» — ماندگار در حافظه مرورگر (فاز ماک)
  const id = Date.now();
  const sub = categoriesData.find((c) => c.id === input.subCategoryId);
  const prov = provinces.find((p) => p.id === input.provinceId);
  const city = citiesData.find((c) => c.id === input.cityId);
  if (sub && prov && city && typeof window !== 'undefined') {
    const fresh: Product = {
      id,
      productName: input.productName,
      slug: `خرید-عمده-${input.productName}-${id}`,
      description: input.description,
      stock: input.stock,
      minSalePrice: input.minSalePrice,
      minSaleAmount: input.minSaleAmount,
      unit: sub.unit,
      categoryId: sub.parentId ?? sub.id,
      categoryName: categoriesData.find((c) => c.id === sub.parentId)?.categoryName ?? sub.categoryName,
      subCategoryId: sub.id,
      subCategoryName: sub.categoryName,
      provinceId: prov.id,
      provinceName: prov.name,
      cityId: city.id,
      cityName: city.name,
      myuserId: PANEL_USER_ID,
      seller: {
        id: PANEL_USER_ID,
        userName: panelProfile.userInfo.userName,
        firstName: panelProfile.userInfo.firstName,
        lastName: panelProfile.userInfo.lastName,
        activePakageType: 0,
        isVerified: false,
      },
      isLadder: false,
      isElevated: false,
      hasVideo: false,
      isOld: false,
      viewCount: 0,
      status: 'pending',
      features: input.features,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      photos: [],
    };
    writeExtras([...readExtras(), fresh]);
  }
  return delay({ ok: true, id, status: 'pending' }, 900);
}

/** نشان شده ها — لیست‌ها */
export async function getSavedLists(): Promise<SavedList[]> {
  return delay(savedListsData.map((l) => ({ ...l })), 200);
}

/** موارد یک لیست نشان‌شده (خریداران) */
export async function getSavedListUsers(listId: number): Promise<SavedUserItem[] | null> {
  const list = savedListsData.find((l) => l.id === listId);
  if (!list) return delay(null, 150);
  return delay(savedUsersData.map((u) => ({ ...u, notes: u.notes.map((n) => ({ ...n })) })), 250);
}

/**
 * خریداران پیشنهادی — سرویس relatedByAdd باسکول:
 * تطبیق با دسته و نوع کالای آگهی‌های فروشنده + حجم خرید/فروش؛ سورت با امتیاز تطابق.
 * ماک: آگهی رد شده «پسته اکبری» ملاک است —
 *   exact: نوع کالا اکبری / same-product: پسته / near-category: خشکبار و کشاورزی
 */
export async function getSuggestedBuyers(): Promise<SuggestedBuyer[]> {
  const AGHIL_PRODUCTS = ['پسته'];
  const nearNames = ['بادام', 'گردو', 'کشمش', 'میوه خشک', 'تخمه آفتابگردان', 'خرما', 'سیب', 'زعفران', 'برنج'];
  const out: SuggestedBuyer[] = [];
  buyRequestsForPanel.forEach((r) => {
    const type = (r.name ?? '').replace(/\s+/g, ' ').trim();
    let tier: SuggestedBuyer['tier'] | null = null;
    if (r.subcategoryName === 'پسته' && type.includes('اکبری')) tier = 'exact';
    else if (r.subcategoryName === 'پسته') tier = 'same-product';
    else if (AGHIL_PRODUCTS.includes(r.subcategoryName) || nearNames.includes(r.subcategoryName)) tier = 'near-category';
    if (!tier) return;
    // حجم خرید نزدیک حجم فروش آگهی (۵۰۰ کیلوگرم) امتیاز بیشتری می‌گیرد
    const volumeScore = Math.max(0, 30 - Math.min(30, Math.abs(r.requirementAmount - 500) / 100));
    const base = tier === 'exact' ? 70 : tier === 'same-product' ? 50 : 25;
    out.push({
      buyRequest: r,
      matchScore: Math.min(99, Math.round(base + volumeScore)),
      tier,
      relatedProduct: 'پسته اکبری',
    });
  });
  out.sort((a, b) => b.matchScore - a.matchScore);
  return delay(out.slice(0, 24), 300);
}

// ─── پنل خریدار ──────────────────────────────────────────────────────

import {
  myBuyRequests,
  suggestedSellerGroups,
} from './data';
import type { BuyRequestStatus, MyBuyRequest, SuggestedSellerGroup } from '@/lib/types';

/** درخواست‌های ثبت‌شده از ویزارد خرید — ماندگار در حافظه مرورگر (فاز ماک) */
const BUY_EXTRA_KEY = 'imach:my-extra-buy-requests';

function readBuyExtras(): MyBuyRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(BUY_EXTRA_KEY);
    return raw ? (JSON.parse(raw) as MyBuyRequest[]) : [];
  } catch {
    return [];
  }
}

function writeBuyExtras(items: MyBuyRequest[]) {
  try {
    window.localStorage.setItem(BUY_EXTRA_KEY, JSON.stringify(items));
  } catch {
    /* حافظه پر است — فقط در state جاری */
  }
}

/** درخواستهای من — آیتم‌ها + شمارنده تب‌ها (تایید شده/در انتظار تایید/رد شده) */
export async function getMyBuyRequests(): Promise<{
  items: MyBuyRequest[];
  counts: Record<BuyRequestStatus, number>;
}> {
  const counts: Record<BuyRequestStatus, number> = { confirmed: 0, pending: 0, rejected: 0 };
  const all = [...myBuyRequests, ...readBuyExtras()];
  all.forEach((r) => {
    counts[r.status] += 1;
  });
  return delay({ items: all, counts }, 250);
}

/** ثبت درخواست خرید از ویزارد — نتیجه: «در انتظار تایید» */
export async function submitPanelBuyRequest(input: {
  subcategoryName: string;
  productType: string;
  requirementAmount: number;
  unit: string;
  goal: 'price_and_buy' | 'price_only';
  hasHistory: boolean;
}): Promise<{ ok: true; id: number; status: 'pending' }> {
  const id = Date.now();
  if (typeof window !== 'undefined') {
    const fresh: MyBuyRequest = {
      id,
      subcategoryName: input.subcategoryName,
      productType: input.productType,
      requirementAmount: input.requirementAmount,
      unit: input.unit,
      status: 'pending',
      goal: input.goal,
      hasHistory: input.hasHistory,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    writeBuyExtras([...readBuyExtras(), fresh]);
  }
  return delay({ ok: true, id, status: 'pending' }, 900);
}

/** گروه‌های فروشندگان پیشنهادی — بر اساس دسته درخواست‌های تاییدشده */
export async function getSuggestedSellerGroups(): Promise<SuggestedSellerGroup[]> {
  return delay(suggestedSellerGroups.map((g) => ({ ...g })), 450);
}
