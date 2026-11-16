/**
 * کلاینت کاتالوگ عمومی v2 — صفحهٔ /product-filter (مهاجرت موازی).
 *
 * اندپوینت‌ها عمومی‌اند (بدون توکن): POST /catalog/v2/getTree و getList.
 * شمارهٔ تلفن فروشنده از سمت بک‌اند هرگز ارسال نمی‌شود؛ قیمت‌ها مثل
 * بقیهٔ سایت پشت ورود است (کارت «مشاهده قیمت»).
 */

import { apiFetch } from '@/lib/api/client';

// ─── تایپ‌ها — قرینهٔ AdsReportService بک‌اند (شکل عمومی) ───────────────────

export interface CatalogV2AttrOption {
  label: string;
  match: string[];
}

export interface CatalogV2Attr {
  key: string;
  label: string;
  hint?: string;
  options: CatalogV2AttrOption[];
}

export interface CatalogV2TreeNode {
  key: string;
  name: string;
  icon?: string;
  count: number;
  attrs?: CatalogV2Attr[];
  children?: CatalogV2TreeNode[];
}

export interface CatalogV2Tree {
  totalProducts: number;
  mapped: number;
  unmapped: number;
  roots: CatalogV2TreeNode[];
}

export interface CatalogV2Row {
  id: number;
  product_name: string;
  v2_path: string[];
  v2_key: string;
  province_name: string;
  city_name: string;
  seller: {
    user_name: string;
    full_name: string;
    is_verified: boolean;
  };
  stock: number;
  min_sale_amount: number;
  min_sale_price: number;
  unit: string;
  is_ladder: boolean;
  view_count: number;
  photo: string | null;
  updated_at: string;
  resolved_attrs?: Record<string, string>;
}

export type CatalogV2Sort = 'newest' | 'price-asc' | 'price-desc';

export interface CatalogV2Filters {
  nodeKey?: string;
  provinceId?: number;
  cityId?: number;
  search?: string;
  attrs?: Record<string, string[]>;
  sort?: CatalogV2Sort;
  page?: number;
  perPage?: number;
}

export interface CatalogV2List {
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
  attrs: CatalogV2Attr[];
  items: CatalogV2Row[];
}

// ─── فراخوانی‌ها ────────────────────────────────────────────────────────────

/** درخت عمیق v2 + شمار آگهی confirmed هر گره (کش مشترک React Query) */
export async function fetchCatalogV2Tree(): Promise<CatalogV2Tree> {
  return apiFetch<CatalogV2Tree>('/catalog/v2/getTree', {}, { auth: false });
}

/** آگهی‌های confirmed روی دستهٔ جدید — گره/شهر/جستجو/اتریبیوت/سورت */
export async function fetchCatalogV2List(filters: CatalogV2Filters = {}): Promise<CatalogV2List> {
  return apiFetch<CatalogV2List>(
    '/catalog/v2/getList',
    {
      ...filters,
      attrs: filters.attrs && Object.keys(filters.attrs).length ? filters.attrs : undefined,
    },
    { auth: false },
  );
}

/** برچسب مسیر گره از روی درخت — مثل «کشاورزی و باغبانی ‹ حبوبات ‹ نخود» */
export function catalogNodePathLabel(tree: CatalogV2TreeNode[] | undefined, key: string): string {
  if (key === 'all') return 'همهٔ دسته‌ها';
  const walk = (nodes: CatalogV2TreeNode[], acc: string[]): string[] | null => {
    for (const n of nodes) {
      const path = [...acc, n.name];
      if (n.key === key) return path;
      if (key.startsWith(`${n.key}.`) && n.children) {
        const deep = walk(n.children, path);
        if (deep) return deep;
      }
    }
    return null;
  };
  return walk(tree ?? [], [])?.join(' ‹ ') ?? key;
}
