import type { MetadataRoute } from 'next';
import { categories, products, users } from '@/lib/mock/data';
import { apiBase } from '@/lib/api/client';

const BASE = 'https://imach.example.com';

interface SitemapProduct {
  slug: string;
  categoryName: string;
  id: number;
  isLadder: boolean;
}

interface SitemapUser {
  userName: string;
}

/** دیتای زنده از بک‌اند + فالبک ماک dev — revalidate ساعت‌انه (SEO) */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/product-list`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/buyAd-requests`, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${BASE}/help`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/help/secure-payment`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/register`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  let categoryItems = categories;
  let productItems: SitemapProduct[] = products;
  let userItems: SitemapUser[] = users;

  try {
    const res = await fetch(`${apiBase()}/products/getProductList`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: 1, pageSize: 48, sort: 'newest' }),
      next: { revalidate: 3600 },
    });
    const json = (await res.json()) as { status: boolean; data?: { items: SitemapProduct[] } };
    if (json?.status && json.data?.items?.length) {
      productItems = json.data.items;
    }
  } catch {
    /* بک‌اند خاموش — ماک */
  }

  const categoryPages: MetadataRoute.Sitemap = categoryItems.map((c) => ({
    url: `${BASE}/product-list/category/${encodeURIComponent(c.slug)}`,
    changeFrequency: 'daily' as const,
    priority: c.score > 1000 ? 0.8 : 0.6,
  }));

  const productPages: MetadataRoute.Sitemap = productItems.map((p) => ({
    url: `${BASE}/product-view/${p.slug}/${p.categoryName}/${p.id}`,
    changeFrequency: 'daily' as const,
    priority: p.isLadder ? 0.7 : 0.5,
  }));

  const profilePages: MetadataRoute.Sitemap = userItems.map((u) => ({
    url: `${BASE}/profile/${u.userName}`,
    changeFrequency: 'weekly' as const,
    priority: 0.4,
  }));

  return [...staticPages, ...categoryPages, ...productPages, ...profilePages];
}
