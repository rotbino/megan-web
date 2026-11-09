/**
 * امتیاز تطابق خریدار با آگهی‌های فروشنده — فرمول چهارمحوری (بازنویسی
 * خواستهٔ مالک ۷-۱۱). مشترک بین پنل «خریداران» (سورت مطابق‌ترین‌ها بالاتر)
 * و کارت‌ها (بج دقت تطابق):
 *  • کالا ۴۰ — هم‌برگ ۴۰ / هم‌پدر ۲۲ / هم‌ریشه ۱۰ (ستون فقرات؛ محورهای
 *    دیگر فقط روی همین خانوادهٔ کالایی اثر دارند)
 *  • نوع کالا ۲۰ — تطبیق متن نوعِ درخواست با نوع آگهی؛ درخواست بدون نوع
 *    یعنی «هر نوعی از همین کالا» و امتیاز کامل می‌گیرد. دایرکتوری نوعِ
 *    جدا ندارد — امتیاز تخت روی هر تطابق دسته.
 *  • حجم خرید ۲۵ — «حجم خرید نزدیک»: بازهٔ معاملهٔ ممکن [حداقل سفارش
 *    فروشنده، موجودی فروشنده]؛ داخل بازه هرچه سهم بیشتری از عرضه بردارد
 *    به‌صرفه‌تر (۱۸+۷×سهم)؛ زیر حداقل سفارش یا بالای موجودی با نسبت
 *    فاصله کمرنگ می‌شود. واحد وزنی نرمال (تن ← کیلوگرم، گرم ← کیلوگرم)؛
 *    واحد غیرقابل‌مقایسه = امتیاز بی‌طرف ۱۰. حجم دوره‌ای خریدار به معادل
 *    ماهانه نرمال می‌شود (روزانه×۳۰، هفتگی×۴، سالیانه÷۱۲).
 *  • مکان ۱۵ — هم‌شهر ۱۵ / هم‌استان ۱۰ (حمل ارزان‌تر = معاملهٔ به‌صرفه‌تر)
 *  • ۰ = مرتبط نیست (پایین لیست می‌ماند، حذف نمی‌شود) — هرگز خالی نمی‌شود:
 *    فروشندهٔ بدون آگهی هم همهٔ خریداران را می‌بیند، فقط بدون سورت تطابق
 */

import type { BuyerDirectoryItem, BuyRequest, Category, Product, PurchasePeriod } from '@/lib/types';
import { findCategoryPathById } from '@/lib/categories';

/** نرمال‌سازی متن فارسی — ZWNJ/فاصله‌های تکراری یکسان شوند */
const norm = (s: string) => s.replace(/[\u200c\s]+/g, ' ').trim();

export interface BuyerMatch {
  /** ۰ تا ۱۰۰ — ۰ یعنی بدون تطابق */
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

// ─── حجم خرید — نرمال‌سازی واحد و دوره (خواستهٔ مالک ۷-۱۱) ────────────────────

/** خانوادهٔ واحد — وزنی‌ها به یک مقیاس می‌رسند؛ غیر وزنی فقط با خودش مقایسه می‌شود */
const UNIT_FAMILY: Record<string, string> = {
  'تن': 'weight',
  'کیلوگرم': 'weight',
  'گرم': 'weight',
  'عدد': 'count',
  'بسته': 'pack',
  'متر': 'length',
  'لیتر': 'volume',
};

/** مقدار + خانوادهٔ واحد — تن ×۱۰۰۰ و گرم ÷۱۰۰۰ به کیلوگرم؛ واحد ناشناخته = null */
function unitValue(v: number, unit: string): { v: number; f: string } | null {
  const f = UNIT_FAMILY[unit];
  if (!f) return null;
  if (unit === 'تن') return { v: v * 1000, f };
  if (unit === 'گرم') return { v: v / 1000, f };
  return { v, f };
}

/** دورهٔ خرید دایرکتوری → ضریب معادل ماهانه (تقریبی) */
const PERIOD_PER_MONTH: Record<PurchasePeriod, number> = {
  daily: 30,
  weekly: 4,
  monthly: 1,
  yearly: 1 / 12,
  occasional: 1,
};

/** امتیاز حجم (۰ تا ۲۵) — «حجم خرید نزدیک» (خواستهٔ مالک ۷-۱۱):
 *  • نیاز خریدار داخل بازهٔ [حداقل سفارش فروشنده، موجودی] → معامله ممکن؛
 *    هرچه سهم بیشتری از عرضه بردارد به‌صرفه‌تر: ۱۸ + ۷×سهم
 *  • زیر حداقل سفارش فروشنده → با نسبت نزدیکی به حداقل کمرنگ می‌شود
 *  • بالای موجودی فروشنده → با نسبت پوشش موجودی کمرنگ می‌شود
 *  • واحد غیرقابل‌مقایسه (عدد در برابر کیلوگرم) یا دادهٔ غایب → بی‌طرف ۱۰ */
function volumeScore(buyerAmount: number, buyerUnit: string, product: Product): number {
  const buyer = unitValue(buyerAmount, buyerUnit);
  const stock = unitValue(Math.max(1, product.stock), product.unit);
  const min = unitValue(Math.max(1, product.minSaleAmount), product.unit);
  if (!buyer || !stock || !min || buyer.v <= 0) return 10; // بی‌اطلاع — بی‌طرف
  if (buyer.f !== stock.f) return 10; // غیرقابل‌مقایسه — بی‌طرف

  if (buyer.v >= min.v && buyer.v <= Math.max(min.v, stock.v)) {
    // داخل بازهٔ معاملهٔ ممکن — خرید بزرگ‌تر از عرضهٔ فروشنده به‌صرفه‌تر
    return 18 + 7 * Math.min(1, buyer.v / stock.v);
  }
  if (buyer.v < min.v) return 25 * (buyer.v / min.v) * 0.8; // زیر حداقل سفارش فروشنده
  return 25 * (stock.v / buyer.v) * 0.8; // بیش از موجودی فروشنده
}

/** امتیاز مکان (۰/۱۰/۱۵) — هم‌شهر ۱۵ / هم‌استان ۱۰ (حمل ارزان‌تر = به‌صرفه‌تر).
 *  مقایسهٔ عددی دقیق‌تر است؛ نام فقط برای دایرکتوری که شناسه ندارد. */
function locationScore(
  product: Product,
  loc: { cityId?: number | null; provinceId?: number | null; cityName?: string | null; provinceName?: string | null },
): number {
  if (loc.cityId != null && loc.cityId === product.cityId) return 15;
  if (loc.provinceId != null && loc.provinceId === product.provinceId) return 10;
  const c = loc.cityName ? norm(loc.cityName) : '';
  if (c && c === norm(product.cityName)) return 15;
  const pr = loc.provinceName ? norm(loc.provinceName) : '';
  if (pr && pr === norm(product.provinceName)) return 10;
  return 0;
}

/** امتیاز برای آیتم دایرکتوری (خریدهای دوره‌ای) — دستهٔ برگ + نوع کالا + حجم ماهانه + مکان */
export function matchForDirectoryItem(
  tree: Category[],
  products: Product[] | undefined,
  item: Pick<
    BuyerDirectoryItem,
    'categoryId' | 'categoryName' | 'minAmount' | 'unit' | 'period' | 'productType' | 'province' | 'city'
  >,
): BuyerMatch {
  if (!products || products.length === 0) return { score: 0 };
  const mine = productPaths(tree, products);
  const itemPath = findCategoryPathById(tree, item.categoryId);
  const itemParentId = itemPath && itemPath.length > 1 ? itemPath[itemPath.length - 2].id : null;
  const itemRootId = itemPath?.[0]?.id ?? null;

  // حجم دوره‌ای → معادل ماهانه؛ واحد از دستهٔ خود آیتم
  const monthly = item.minAmount * (PERIOD_PER_MONTH[item.period] ?? 1);

  let best = 0;
  let related: string | undefined;
  for (const m of mine) {
    let cat = 0;
    if (m.product.subCategoryId === item.categoryId) cat = 40;
    else if (itemParentId != null && m.leaf?.parentId === itemParentId) cat = 22;
    else if (itemRootId != null && m.root?.id === itemRootId) cat = 10;
    if (cat === 0) continue;

    // نوع کالا (خواستهٔ مالک ۹-۱۱): بدون نوع = «هر نوعی از همین کالا» (کامل)؛
    // با نوع = تطبیق متن عین درخواست فوری — «سیب از نوع قرمز» به فروشندهٔ سیب قرمز
    const type = !item.productType?.trim()
      ? 20
      : typeMatches(item.productType, m.product, m.leaf?.categoryName)
        ? 20
        : 0;
    const vol = volumeScore(monthly, item.unit, m.product);
    const loc = locationScore(m.product, { cityName: item.city, provinceName: item.province });

    const s = Math.min(100, Math.round(cat + type + vol + loc));
    if (s > best) {
      best = s;
      related = m.product.productName;
    }
  }
  return { score: best, relatedProduct: related };
}

/** امتیاز برای درخواست خرید فوری — دسته + نوع کالا + حجم + مکان */
export function matchForBuyRequest(
  tree: Category[],
  products: Product[] | undefined,
  req: Pick<
    BuyRequest,
    'subcategoryName' | 'name' | 'requirementAmount' | 'unit' | 'provinceId' | 'cityId' | 'city'
  >,
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
    let cat = 0;
    const leafName = m.leaf?.categoryName ?? m.product.subCategoryName;
    if (found.node ? m.leaf?.id === found.node.id : norm(leafName) === sub) cat = 40;
    else if (found.parent && m.leaf?.parentId === found.parent.id) cat = 22;
    else if (found.root && m.root?.id === found.root.id) cat = 10;
    if (cat === 0) continue;

    // نوع کالا — بدون نوع = «هر نوعی از همین کالا» (کامل)؛ با نوع = تطبیق متن
    const type = !req.name?.trim() ? 20 : typeMatches(req.name, m.product, m.leaf?.categoryName) ? 20 : 0;
    const vol = volumeScore(req.requirementAmount, req.unit, m.product);
    const loc = locationScore(m.product, {
      cityId: req.cityId ?? null,
      provinceId: req.provinceId ?? null,
      cityName: req.city && req.city !== '—' ? req.city : null,
    });

    const s = Math.min(100, Math.round(cat + type + vol + loc));
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
