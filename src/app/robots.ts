import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    // پنل کاربر و پنل ادمین + API — ایندکس ممنوع (سئو فقط صفحات عمومی)
    rules: [{ userAgent: '*', allow: '/', disallow: ['/panel', '/admin', '/api'] }],
    sitemap: 'https://megan.example.com/sitemap.xml',
  };
}
