import type { MetadataRoute } from 'next';
import { apiBase, joinUrl } from '@/lib/api/client';
import { GOOGLE_ENTRY_QS } from '@/lib/popular-searches';
import { getSearchUniverse } from '@/lib/search-universe';
import { listMajorCities } from '@/lib/city-markets';
import { SITE_URL } from '@/lib/site';

const BASE = SITE_URL;

interface SitemapProduct {
  slug: string;
  categoryName: string;
  id: number;
  isLadder: boolean;
  seller?: { userName?: string };
}

/** پاسخ لیست محصولات برای سایت‌مپ — total برای شمارش صفحه‌ها (۱۶تایی مثل UI) */
interface SitemapProductList {
  items: SitemapProduct[];
  total: number;
}

interface RawCategoryNode {
  id: number;
  category_name: string;
  slug: string;
  score: number;
  children?: RawCategoryNode[];
}
/** دیتای زنده از بک‌اند — فقط دیتابیس واقعی، هیچ ماکی در کار نیست (SEO) */
export const revalidate = 3600;

/** درخت دسته‌ها را مسطح می‌کند — همه نودها slug مخصوص خودشان را دارند */
function flattenCategories(nodes: RawCategoryNode[], out: RawCategoryNode[] = []): RawCategoryNode[] {
  for (const n of nodes) {
    out.push(n);
    if (n.children?.length) flattenCategories(n.children, out);
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/product-list`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/buyAd-requests`, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${BASE}/searches`, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${BASE}/help`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/help/secure-payment`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/register`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/services`, changeFrequency: 'monthly', priority: 0.5 },
  ];

  // سه منبع واقعی — هر کدام مستقل؛ خرابی یکی بقیه را نمی‌اندازد
  const [categoryData, productListPage, universe, majorCities] = await Promise.all([
    fetch(joinUrl(apiBase(), '/categories/getAllCategories'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      next: { revalidate: 3600 },
    })
      .then((r) => r.json() as Promise<{ status: boolean; data?: RawCategoryNode[] }>)
      .then((j) => (j?.status && j.data ? { flat: flattenCategories(j.data), roots: j.data } : { flat: [], roots: [] }))
      .catch(() => ({ flat: [] as RawCategoryNode[], roots: [] as RawCategoryNode[] })),
    fetch(joinUrl(apiBase(), '/products/getProductList'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: 1, pageSize: 100, sort: 'newest' }),
      next: { revalidate: 3600 },
    })
      .then((r) => r.json() as Promise<{ status: boolean; data?: SitemapProductList }>)
      .then((j) => (j?.status && j.data?.items ? j.data : { items: [] as SitemapProduct[], total: 0 }))
      .catch(() => ({ items: [] as SitemapProduct[], total: 0 })),
    getSearchUniverse().catch(() => []),
    // بازارهای عمدهٔ شهری (خواستهٔ مالک ۹-۱۱) — فقط شهرهای بزرگ موجود در دیتابیس
    listMajorCities().catch(() => []),
  ]);

  const { flat: categoryNodes, roots: rootCategoryNodes } = categoryData;
  // آیتم‌های لیست (همراه total برای شمردن صفحه‌ها)
  const productItems = productListPage.items;
  const productTotal = productListPage.total;

  // فروشندگانِ دارای آگهی — از همان لیست واقعی محصولات (یکتا)
  const sellerNames = [...new Set(productItems.map((p) => p.seller?.userName).filter((x): x is string => Boolean(x)))];

  const categoryPages: MetadataRoute.Sitemap = categoryNodes.map((c) => ({
    url: `${BASE}/product-list/category/${encodeURIComponent(c.slug)}`,
    changeFrequency: 'daily' as const,
    priority: c.score > 1000 ? 0.8 : 0.6,
  }));

  const productPages: MetadataRoute.Sitemap = productItems.map((p) => ({
    url: `${BASE}/product-view/${p.slug}/${p.categoryName}/${p.id}`,
    changeFrequency: 'daily' as const,
    priority: p.isLadder ? 0.7 : 0.5,
  }));

  // صفحات ۲ به بعد لیست اصلی (خواستهٔ مالک ۱۴-۱۱) — هر پیج URL جدا و
  // ایندکس‌پذیر؛ سقف ۱۰۰ تا سایت‌مپ سبک بماند (دسته‌ها/بازارهای شهری صفحه‌های
  // بعدی‌شان را گوگل از خود لینک‌های صفحه‌بندی کشف می‌کند)
  const listPageCount = Math.min(Math.ceil(productTotal / 16) || 0, 100);
  const listPagedUrls: MetadataRoute.Sitemap = Array.from({ length: Math.max(0, listPageCount - 1) }, (_, i) => ({
    url: `${BASE}/product-list/${i + 2}`,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  const profilePages: MetadataRoute.Sitemap = sellerNames.map((userName) => ({
    url: `${BASE}/c/${userName}`,
    changeFrequency: 'weekly' as const,
    priority: 0.4,
  }));

  // بازارهای عمدهٔ شهری — /city/tehran و… (فقط شهرهای بزرگ؛ بقیه با نام فارسی
  // کشف‌شان از دایرکتوری /city و شبکهٔ لینک‌های صفحات شهری انجام می‌شود)
  const cityMarketPages: MetadataRoute.Sitemap = majorCities.map((c) => ({
    url: `${BASE}/city/${c.slug}`,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  // دسته‌های داخل بازار شهری — شهر بزرگ × دستهٔ ریشه (خواستهٔ مالک ۹-۱۱):
  // «خرید عمده برنج در تهران»، «قیمت سیب در همدان» و… فقط سطح ریشه تا
  // سایت‌مپ سبک بماند (شهرهای کوچک از شبکهٔ لینک‌های صفحات کشف می‌شوند)
  const cityCategoryPages: MetadataRoute.Sitemap = majorCities.flatMap((c) =>
    rootCategoryNodes.map((cat) => ({
      url: `${BASE}/city/${c.slug}/category/${encodeURIComponent(cat.slug)}`,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
  );

  // صفحات جستجوی ورودی‌های گوگل — هر کالا (و هر کالا+نوع) یک URL ایندکس‌پذیر
  // اختصاصی (long-tail سئو). عنوان‌های گوگلی (مثل «خرید سیب زمینی عمده در
  // تهران» یا «فروش عمده برنج هاشمی در همدان») همه به همین آدرس‌های هسته‌ای
  // لینک می‌شوند از صفحه /searches؛ آدرس‌های شنی هم با ریدایرکت دائمی به
  // همین‌ها می‌رسند. جهان جستجو هزاران عبارت می‌سازد اما URL یکتا (هسته)
  // حدود هزار و اندی است — سایت‌مپ سبک می‌ماند و همهٔ صفحات فرود پوشش داده
  // می‌شوند (خواستهٔ مالک: اولین کرال گوگل همه را ایندکس کند).
  const seedCores = new Set<string>(GOOGLE_ENTRY_QS);
  const searchCores = [
    ...seedCores,
    ...new Set(universe.map((p) => p.core).filter((c) => !seedCores.has(c))),
  ];
  const searchPages: MetadataRoute.Sitemap = searchCores.map((q) => ({
    url: `${BASE}/product-list/search/${encodeURIComponent(q)}`,
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...listPagedUrls, ...searchPages, ...cityMarketPages, ...cityCategoryPages, ...categoryPages, ...productPages, ...profilePages];
}
