import type { Metadata } from 'next';

/**
 * پنل ادمین — کد کاملاً جدا از اپ عمومی (فولدر src/app/admin + src/lib/admin).
 * SEO لازم ندارد: noindex + بدون sitemap — فقط ابزار مدیریت است.
 * (پوسته داشبورد و صفحه ورود در (dash)/ و login/ اینجا زندگی می‌کنند)
 */
export const metadata: Metadata = {
  title: 'پنل مدیریت ایمچ',
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
