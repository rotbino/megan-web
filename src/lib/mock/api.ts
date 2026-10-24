/**
 * لایه API ماک — شبیه‌سازی تماس‌های شبکه با تأخیر.
 * در فاز اتصال به بک‌اند، همین اینترفیس‌ها به fetch واقعی
 * (megan-back: /api/v1/...) تغییر می‌کنند و هوک‌های React Query دست‌نخورده می‌مانند.
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
  const PER_PAGE = 8;

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
    case 'cheapest':
      items.sort((a, b) => (a.minSalePrice ?? Infinity) - (b.minSalePrice ?? Infinity));
      break;
    case 'stockiest':
      items.sort((a, b) => b.stock - a.stock);
      break;
    default: // related — باسکول‌مانند: ویژه‌ها اول، بعد امتیاز دسته
      items.sort((a, b) => Number(b.isElevated) - Number(a.isElevated));
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

export async function verifyOtp(phone: string, code: string): Promise<{ ok: boolean; userName?: string }> {
  // هر کد ۵ رقمی در نمونه قبول است
  return delay({ ok: /^\d{5}$/.test(code), userName: 'c34qxnsh' }, 600);
}
