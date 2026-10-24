import type { MetadataRoute } from 'next';
import { categories, products, users } from '@/lib/mock/data';

const BASE = 'https://imach.example.com';

/** در فاز اتصال، از API بک‌اند می‌آید — ساختار آماده ISR/ساعت‌انه */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/product-list`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/buyAd-requests`, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${BASE}/register`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${BASE}/product-list/category/${encodeURIComponent(c.slug)}`,
    changeFrequency: 'daily' as const,
    priority: c.score > 1000 ? 0.8 : 0.6,
  }));

  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE}/product-view/${p.slug}/${p.categoryName}/${p.id}`,
    changeFrequency: 'daily' as const,
    priority: p.isLadder ? 0.7 : 0.5,
  }));

  const profilePages: MetadataRoute.Sitemap = users.map((u) => ({
    url: `${BASE}/profile/${u.userName}`,
    changeFrequency: 'weekly' as const,
    priority: 0.4,
  }));

  return [...staticPages, ...categoryPages, ...productPages, ...profilePages];
}
