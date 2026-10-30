'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { logActivity } from '@/lib/activity';

/** مسیرهایی که فعالیت کاربر محسوب نمی‌شوند */
const SKIP = [/^\/admin(\/|$)/, /^\/api(\/|$)/, /^\/_next(\/|$)/];

/**
 * ثبت بازدید صفحات — بین‌برگ در root layout؛ با هر تغییر مسیر یک
 * page_view ثبت می‌شود (هر مسیر حداکثر یک‌بار در هر جلسه مرورگر —
 * refresh و back/forward سریع اسپم نمی‌کند).
 */
export function PageViewPing() {
  const pathname = usePathname() ?? '/';

  useEffect(() => {
    if (!pathname || SKIP.some((re) => re.test(pathname))) return;
    // کلید نشست: هر مسیر در هر جلسه مرورگر یک‌بار (نشست = tab reload هم شامل)
    let seen: string[] = [];
    try {
      seen = JSON.parse(sessionStorage.getItem('imach:paged') ?? '[]');
    } catch {
      seen = [];
    }
    const key = `p:${pathname}`;
    if (seen.includes(key)) return;
    seen.push(key);
    if (seen.length > 60) seen = seen.slice(-60); // سقف حافظه نشست
    try {
      sessionStorage.setItem('imach:paged', JSON.stringify(seen));
    } catch {
      /* حافظه پر — مهم نیست */
    }
    logActivity({ type: 'page_view', path: pathname }, key);
  }, [pathname]);

  return null;
}
