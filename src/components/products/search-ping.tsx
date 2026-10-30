'use client';

import { useEffect } from 'react';
import { logActivity } from '@/lib/activity';

/** جلوگیری از دوبار شمارش یک جستجو در یک جلسه JS (React Strict Mode / ریمونت) */
const pinged = new Set<string>();

/** خزنده‌ها و ابزارهای خودکار شمرده نمی‌شوند — فقط کاربر واقعی */
const BOT_RE = /bot|crawl|spider|slurp|bingpreview|lighthouse|headless|phantom|puppeteer|playwright|pagespeed/i;

/**
 * ثبت جستجوی کاربر — بعد از mount صفحه جستجو:
 *  ۱) POST بی‌صدا به /api/search-log (شمارنده سئو — صفحه «جستجوهای کاربران»)
 *  ۲) ثبت در ActivityLog بک‌اند (پنل ادمین فعالیت‌ها — خواسته مالک ۳۰-۱۰)
 * خطای شبکه هیچ اثری روی UX ندارد؛ رندر هیچ‌وقت منتظر پاسخ نمی‌ماند.
 */
export function SearchPing({ q }: { q: string }) {
  useEffect(() => {
    if (!q || pinged.has(q)) return;
    if (BOT_RE.test(navigator.userAgent)) return;
    pinged.add(q);

    void fetch('/api/search-log', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ q }),
      keepalive: true,
    }).catch(() => {});

    logActivity({ type: 'search', q });
  }, [q]);
  return null;
}
