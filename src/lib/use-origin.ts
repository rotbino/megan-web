'use client';

import { useEffect, useState } from 'react';

/**
 * مبدأ (origin) صفحهٔ فعلی از location مرورگر — برای ساخت لینک‌های
 * اشتراک‌گذاری در همان میزبانی که کاربر واقعاً باز کرده است
 * (خواستهٔ مالک ۱۰-۱۱ دور ۴): به‌جای SITE_URLِ کانفیگ
 * (مثل imach.example.com) همان window.location.origin برمی‌گردد.
 * اولین رندر (SSR/هیدریشن) '' برمی‌گرداند تا mismatch پیش نیاید؛
 * در تعامل‌های کاربر (کلیک/کپی) همیشه مقدار پر است.
 */
export function useOrigin(): string {
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    setOrigin(window.location.origin.replace(/\/+$/, ''));
  }, []);
  return origin;
}

/** مسیر نسبی را با مبدأ صفحهٔ فعلی مطلق می‌کند — فقط سمت کلاینت
 *  (لحظهٔ کلیک/کپی که window همیشه هست). ورودی مطلق دست‌نخورده می‌ماند. */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const origin = typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '';
  return `${origin}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}
