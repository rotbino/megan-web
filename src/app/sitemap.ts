import type { MetadataRoute } from 'next';
import { apiBase, joinUrl } from '@/lib/api/client';
import { SITE_URL } from '@/lib/site';

const BASE = SITE_URL;

interface SitemapProduct {
  slug: string;
  categoryName: string;
  id: number;
  isLadder: boolean;
  seller?: { userName?: string };
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
    { url: `${BASE}/help`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/help/secure-payment`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/register`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  // سه منبع واقعی — هر کدام مستقل؛ خرابی یکی بقیه را نمی‌اندازد
  const [categoryNodes, productItems] = await Promise.all([
    fetch(joinUrl(apiBase(), '/categories/getAllCategories'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      next: { revalidate: 3600 },
    })
      .then((r) => r.json() as Promise<{ status: boolean; data?: RawCategoryNode[] }>)
      .then((j) => (j?.status && j.data ? flattenCategories(j.data) : []))
      .catch(() => [] as RawCategoryNode[]),
    fetch(joinUrl(apiBase(), '/products/getProductList'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: 1, pageSize: 100, sort: 'newest' }),
      next: { revalidate: 3600 },
    })
      .then((r) => r.json() as Promise<{ status: boolean; data?: { items: SitemapProduct[] } }>)
      .then((j) => (j?.status && j.data?.items ? j.data.items : []))
      .catch(() => [] as SitemapProduct[]),
  ]);

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

  const profilePages: MetadataRoute.Sitemap = sellerNames.map((userName) => ({
    url: `${BASE}/profile/${userName}`,
    changeFrequency: 'weekly' as const,
    priority: 0.4,
  }));

  return [...staticPages, ...categoryPages, ...productPages, ...profilePages];
}
