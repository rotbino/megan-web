/**
 * امتیاز تطابق خریدار با آگهی‌های فروشنده (خواسته مالک ۴-۱۱) — مشترک بین
 * پنل «خریداران» (سورت مطابق‌ترین‌ها بالاتر) و کارت‌ها (بج دقت تطابق):
 *  • تطابق دسته با درخت: هم‌برگ ۸۵ / هم‌پدر ۵۵ / هم‌ریشه ۲۵
 *  • نوع کالا (متن) منطبق: +۱۰ (سقف ۹۵)
 *  • ۰ = مرتبط نیست (پایین لیست می‌ماند، حذف نمی‌شود)
 */

import type { BuyerDirectoryItem, BuyRequest, Category, Product } from '@/lib/types';
import { findCategoryPathById } from '@/lib/categories';

/** نرمال‌سازی متن فارسی — ZWNJ/فاصله‌های تکراری یکسان شوند */
const norm = (s: string) => s.replace(/[\u200c\s]+/g, ' ').trim();

export interface BuyerMatch {
  /** ۰ تا ۹۵ — ۰ یعنی بدون تطابق */
  score: number;
  /** دستهٔ مرتبطِ خود فروشنده — برای «مرتبط با: …» روی کارت */
  relatedProduct?: string;
}

/** مسیر دستهٔ هر محصولِ خودم از درخت — یک‌بار برای همه */
function productPaths(tree: Category[], products: Product[]) {
  return products
    .filter((p) => p.status === 'confirmed' || p.status === 'pending')
    .map((p) => {
      const path = findCategoryPathById(tree, p.subCategoryId);
      return {
        product: p,
        leaf: path?.[path.length - 1],
        parent: path && path.length > 1 ? path[path.length - 2] : undefined,
        root: path?.[0],
      };
    });
}

/** نوعِ استخراج‌شدهٔ آگهی — نام محصول منهای نام دستهٔ برگ */
function productTypeOf(p: Product, leafName?: string): string {
  const name = norm(p.productName);
  const leaf = leafName ? norm(leafName) : norm(p.subCategoryName);
  return name.replace(leaf, ' ').trim();
}

/** تطابق متن نوع — شمول دوطرفه روی نوع یا نام کامل */
function typeMatches(type: string, p: Product, leafName?: string): boolean {
  const t = norm(type);
  if (!t) return false;
  const myType = productTypeOf(p, leafName);
  const full = norm(p.productName);
  if (myType) {
    if (myType.includes(t) || t.includes(myType)) return true;
    // ترکیب برگ+نوع هم بفهمد: «سیب قرمز» ⊂ «سیب قرمز شیرین»
    const withLeaf = [leafName ? norm(leafName) : '', myType].filter(Boolean).join(' ');
    if (t.includes(withLeaf) || withLeaf.includes(t)) return true;
  }
  return full.includes(t);
}

/** امتیاز برای آیتم دایرکتوری (خریدهای دوره‌ای) — دستهٔ برگ + نام دسته روی کارت */
export function matchForDirectoryItem(
  tree: Category[],
  products: Product[] | undefined,
  item: Pick<BuyerDirectoryItem, 'categoryId' | 'categoryName'>,
): BuyerMatch {
  if (!products || products.length === 0) return { score: 0 };
  const mine = productPaths(tree, products);
  const itemPath = findCategoryPathById(tree, item.categoryId);
  const itemLeafName = itemPath?.[itemPath.length - 1]?.categoryName ?? item.categoryName;
  const itemParentId = itemPath && itemPath.length > 1 ? itemPath[itemPath.length - 2].id : null;
  const itemRootId = itemPath?.[0]?.id ?? null;

  let best = 0;
  let related: string | undefined;
  for (const m of mine) {
    let s = 0;
    if (m.product.subCategoryId === item.categoryId) s = 85;
    else if (itemParentId != null && m.leaf?.parentId === itemParentId) s = 55;
    else if (itemRootId != null && m.root?.id === itemRootId) s = 25;
    if (s === 0) continue;
    // نوع: نام دسته در نام محصول خریدار هست؟ برای دایرکتوری نوعی نیست —
    // فقط نوعِ خود آگهی با نام دسته مقایسه نمی‌شود؛ امتیاز نوع فقط در درخواست‌ها
    if (s > best) {
      best = s;
      related = m.product.productName;
    }
  }
  return { score: best, relatedProduct: related };
}

/** امتیاز برای درخواست خرید فوری — دسته با نام (id ندارد) + نوع کالا روی کارت */
export function matchForBuyRequest(
  tree: Category[],
  products: Product[] | undefined,
  req: Pick<BuyRequest, 'subcategoryName' | 'name'>,
): BuyerMatch {
  if (!products || products.length === 0) return { score: 0 };
  const mine = productPaths(tree, products);
  const sub = norm(req.subcategoryName);

  // دستهٔ درخواست را در درخت پیدا کن — تا پدر/ریشه درست مقایسه شود
  // (جمع‌کردن در شیء — تحلیل جریان TS انتساب داخل closure را نمی‌بیند)
  const found: { node: Category | null; parent: Category | null; root: Category | null } = {
    node: null,
    parent: null,
    root: null,
  };
  const walk = (nodes: Category[], parent: Category | null, root: Category | null): boolean => {
    for (const n of nodes) {
      if (norm(n.categoryName) === sub) {
        found.node = n;
        found.parent = parent;
        found.root = root ?? n;
        return true;
      }
      if (n.children?.length && walk(n.children, n, root ?? n)) return true;
    }
    return false;
  };
  walk(tree, null, null);

  let best = 0;
  let related: string | undefined;
  for (const m of mine) {
    let s = 0;
    const leafName = m.leaf?.categoryName ?? m.product.subCategoryName;
    if (found.node ? m.leaf?.id === found.node.id : norm(leafName) === sub) s = 85;
    else if (found.parent && m.leaf?.parentId === found.parent.id) s = 55;
    else if (found.root && m.root?.id === found.root.id) s = 25;
    if (s === 0) continue;
    // نوع کالای درخواست با نوع آگهی خودم — +۱۰
    if (req.name && typeMatches(req.name, m.product, m.leaf?.categoryName)) s = Math.min(95, s + 10);
    if (s > best) {
      best = s;
      related = m.product.productName;
    }
  }
  return { score: best, relatedProduct: related };
}

/** مرتب‌سازی مطابق‌ترین‌ها بالاتر — پایدار (ترتیب اصلی حفظ می‌شود) */
export function sortByMatch<T>(items: T[], scoreOf: (t: T) => number): T[] {
  return items
    .map((t, i) => ({ t, i, s: scoreOf(t) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.t);
}
