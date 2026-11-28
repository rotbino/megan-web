/**
 * کلاینت کاتالوگ عمومی v2 — صفحهٔ فیلتر پیشرفتهٔ ایمچ /product-filter.
 *
 * اندپوینت‌ها عمومی‌اند (بدون توکن): POST /catalog/v2/getTree و getList.
 * شمارهٔ تلفن فروشنده از سمت بک‌اند هرگز ارسال نمی‌شود؛ قیمت‌ها مثل
 * بقیهٔ سایت پشت ورود است (کارت «مشاهده قیمت»).
 *
 * (۲۸-۱۱ بازطراحی «تامینان») getList حالا همراهِ خودش می‌آورد:
 *  • facets — شمارش کنار هر گزینهٔ فیلتر (استان/شهر/اتریبیوت) + بازهٔ واقعی
 *    قیمت/حداقل‌سفارش گره؛
 *  • unit — واحد پرتکرار گره (برچسب فیلتر حجم خرید)؛
 *  • node — نام/مسیر گرهٔ انتخابی برای breadcrumb.
 */

import { apiFetch } from '@/lib/api/client';

// ─── تایپ‌ها — قرینهٔ AdsReportService بک‌اند (شکل عمومی) ───────────────────

export interface CatalogV2AttrOption {
  label: string;
  match: string[];
  /** گزینهٔ وابسته — فقط وقتی معتبر/مرئی است که ویژگیِ `key` یکی از `any`
   *  را داشته باشد؛ مثلاً «صدری (پاکستانی)» فقط وقتی کشور=پاکستان (خواستهٔ مالک
   *  ۲۸-۱۱ دور ۴ — فیلترهای مرتبط مثل کشور ← نوع/برند برنج) */
  when?: { key: string; any: string[] };
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

/** related = مرتبط‌ترین (پیش‌فرض): امتیاز تطابق سمت سرور — آگهی‌های شهر/استان
 *  کاربر واردشده جلوتر + کامل بودن ویژگی‌ها + تازگی؛ خودِ امتیاز هرگز به
 *  کاربر نمایش داده نمی‌شود (خواستهٔ مالک ۲۸-۱۱ دور ۳). */
export type CatalogV2Sort =
  | 'related'
  | 'newest'
  | 'price-asc'
  | 'price-desc'
  | 'moq-asc'
  | 'stock-desc';

/** شمارش زندهٔ گزینه‌ها — «چند آگهی با این گزینه می‌ماند» */
export interface CatalogV2Facets {
  provinces: { id: number; name: string; count: number }[];
  cities: { id: number; name: string; count: number }[];
  /** attrKey → برچسب گزینه → شمار آگهی */
  attrs: Record<string, Record<string, number>>;
  price: { min: number | null; max: number | null };
  moq: { min: number | null; max: number | null };
}

export interface CatalogV2Filters {
  nodeKey?: string;
  provinceId?: number;
  cityId?: number;
  search?: string;
  attrs?: Record<string, string[]>;
  priceMin?: number;
  priceMax?: number;
  moqMin?: number;
  moqMax?: number;
  sort?: CatalogV2Sort;
  page?: number;
  perPage?: number;
}

export interface CatalogV2List {
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
  node: { key: string; name: string; path: string[] } | null;
  attrs: CatalogV2Attr[];
  unit: { top: string; list: { unit: string; count: number }[] } | null;
  facets: CatalogV2Facets;
  items: CatalogV2Row[];
}

// ─── فراخوانی‌ها ────────────────────────────────────────────────────────────

/** درخت عمیق v2 + شمار آگهی confirmed هر گره (کش مشترک React Query) */
export async function fetchCatalogV2Tree(): Promise<CatalogV2Tree> {
  return apiFetch<CatalogV2Tree>('/catalog/v2/getTree', {}, { auth: false });
}

/** آگهی‌های confirmed روی دستهٔ جدید — گره/شهر/جستجو/اتریبیوت/بازه‌ها/سورت + فاست‌ها
 *  auth=optional: اگر کاربر وارد شده باشد توکن می‌چسبد تا سورت «مرتبط‌ترین» بتواند
 *  شهر خودِ کاربر را در امتیاز بیاورد؛ مهمان هم همین‌طور جواب می‌گیرد. */
export async function fetchCatalogV2List(filters: CatalogV2Filters = {}): Promise<CatalogV2List> {
  return apiFetch<CatalogV2List>(
    '/catalog/v2/getList',
    {
      ...filters,
      attrs: filters.attrs && Object.keys(filters.attrs).length ? filters.attrs : undefined,
    },
    { auth: 'optional' },
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

/** گرهٔ درخت با کلید v2 — برای مشتق‌کردن بخش‌های سطح‌دار فیلتر */
export function catalogFindNode(
  tree: CatalogV2TreeNode[] | undefined,
  key: string,
): CatalogV2TreeNode | null {
  if (!tree || key === 'all') return null;
  const walk = (nodes: CatalogV2TreeNode[]): CatalogV2TreeNode | null => {
    for (const n of nodes) {
      if (n.key === key) return n;
      if (key.startsWith(`${n.key}.`) && n.children) {
        const deep = walk(n.children);
        if (deep) return deep;
      }
    }
    return null;
  };
  return walk(tree);
}

/** زنجیرهٔ گره از ریشه تا کلید — [] برای «همه» (به‌ارث‌بری اتریبیوت‌ها از خانواده) */
export function chainOf(
  roots: CatalogV2TreeNode[] | undefined,
  key: string,
): CatalogV2TreeNode[] {
  if (!roots || key === 'all') return [];
  const walk = (nodes: CatalogV2TreeNode[], acc: CatalogV2TreeNode[]): CatalogV2TreeNode[] | null => {
    for (const n of nodes) {
      const na = [...acc, n];
      if (n.key === key) return na;
      if (key.startsWith(`${n.key}.`) && n.children) {
        const deep = walk(n.children, na);
        if (deep) return deep;
      }
    }
    return null;
  };
  return walk(roots, []) ?? [];
}

// ─── وابستگی گزینه‌ها (خواستهٔ مالک ۲۸-۱۱ دور ۴) ─────────────────────────────
//
// «اگر کشور=پاکستان شد، نوع/برند ایرانی نیاید» — گزینه‌ها با `when` به والدشان
// گره خورده‌اند. قاعدهٔ ساده و یکسان برای فیلتر عمومی و فرم فروشنده:
//  • والد انتخاب نشده → همهٔ گزینه‌ها (معمول و وابسته) می‌آیند؛
//  • والد انتخاب شده → فقط گزینه‌های هم‌خانواده + بدون قید (مثل «بدون برند»)؛
//  • انتخاب یک گزینهٔ وابسته → والدش هم خودکار انتخاب می‌شود (بدون اصطکاک).

/** گزینهٔ وابسته با انتخاب فعلی والد مرئی است؟ */
function optionVisible(
  opt: CatalogV2AttrOption,
  selection: Record<string, string[]>,
): boolean {
  if (!opt.when) return true;
  const parent = selection[opt.when.key] ?? [];
  if (parent.length === 0) return true; // والد باز → همه
  return opt.when.any.some((v) => parent.includes(v));
}

/** گزینه‌های مرئیِ یک ویژگی با توجه به انتخاب فعلی بقیهٔ ویژگی‌ها */
export function visibleAttrOptions(
  attr: CatalogV2Attr,
  selection: Record<string, string[]>,
): CatalogV2AttrOption[] {
  return attr.options.filter((o) => optionVisible(o, selection));
}

/** اگر گزینهٔ وابسته انتخاب شود، والدش (اگر خالی/ناهمخانواده) خودکار پر می‌شود —
 *  مقدار برگشتی = انتخاب والدِ تازه‌لازم (undefined = تغییری لازم نیست) */
export function impliedParent(
  opt: CatalogV2AttrOption,
  selection: Record<string, string[]>,
): { key: string; value: string } | undefined {
  if (!opt.when) return undefined;
  const parent = selection[opt.when.key] ?? [];
  if (opt.when.any.some((v) => parent.includes(v))) return undefined; // هم‌خانواده است
  const value = opt.when.any.find((v) => !parent.includes(v));
  return value ? { key: opt.when.key, value } : undefined;
}

/** ناسازگاری را پاک می‌کند: گزینه‌ای که با انتخاب فعلی والدش دیگر مرئی نیست
 *  از انتخاب حذف می‌شود (والد عوض شد، فرزند کهن باید برود) */
export function pruneAttrSelection(
  attrs: CatalogV2Attr[],
  selection: Record<string, string[]>,
): Record<string, string[]> {
  const next: Record<string, string[]> = {};
  for (const [key, labels] of Object.entries(selection)) {
    const attr = attrs.find((a) => a.key === key);
    if (!attr) {
      if (labels.length) next[key] = labels;
      continue;
    }
    const kept = labels.filter((l) => {
      const opt = attr.options.find((o) => o.label === l);
      return opt ? optionVisible(opt, selection) : false;
    });
    if (kept.length) next[key] = kept;
  }
  return next;
}
