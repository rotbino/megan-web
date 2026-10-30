import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    // پنل کاربر و پنل ادمین + API — ایندکس ممنوع (سئو فقط صفحات عمومی)
    rules: [{ userAgent: '*', allow: '/', disallow: ['/panel', '/admin', '/api'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
